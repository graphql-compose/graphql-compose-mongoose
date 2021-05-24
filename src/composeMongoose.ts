import type { SchemaComposer, Resolver, InputTypeComposer } from 'graphql-compose';
import { schemaComposer as globalSchemaComposer, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { EDiscriminatorTypeComposer } from './enhancedDiscriminators';
import { convertModelToGraphQL } from './fieldsConverter';
import { resolverFactory } from './resolvers';
import MongoID from './types/MongoID';

export type TypeConverterInputTypeOpts = {
  /**
   * What should be input type name.
   * By default: baseTypeName + 'Input'
   */
  name?: string;
  /**
   * Provide arbitrary description for generated type.
   */
  description?: string;
  /**
   * You can leave only whitelisted fields in type via this option.
   * Any other fields will be removed.
   */
  onlyFields?: string[];
  /**
   * You an remove some fields from type via this option.
   */
  removeFields?: string[];
  /**
   * This option makes provided fieldNames as required
   */
  requiredFields?: string[];

  /** @deprecated */
  fields?: {
    /** @deprecated use `onlyFields` instead */
    only?: string[];
    /** @deprecated use `removeFields` instead */
    remove?: string[];
    /** @deprecated use `requiredFields` instead */
    required?: string[];
  };
};

export type ComposeMongooseOpts<TContext = any> = {
  /**
   * Which type registry use for generated types.
   * By default is used global default registry.
   */
  schemaComposer?: SchemaComposer<TContext>;
  /**
   * What should be base type name for generated type from mongoose model.
   */
  name?: string;
  /**
   * Provide arbitrary description for generated type.
   */
  description?: string;
  /**
   * You can leave only whitelisted fields in type via this option.
   * Any other fields will be removed.
   */
  onlyFields?: string[];
  /**
   * You an remove some fields from type via this option.
   */
  removeFields?: string[];
  /**
   * You may configure generated InputType
   */
  inputType?: TypeConverterInputTypeOpts;
  /**
   * You can make fields as NonNull if they have default value in mongoose model.
   */
  defaultsAsNonNull?: boolean;
  /**
   * Support discriminators on base models
   */
  includeBaseDiscriminators?: boolean;
  /**
   * EXPERIMENTAL - Support discriminated fields on nested fields
   * May not work as expected on input types for mutations
   */
  includeNestedDiscriminators?: boolean;

  /** @deprecated */
  fields?: {
    /** @deprecated use `onlyFields` */
    only?: string[];
    /** @deprecated use `removeFields` */
    remove?: string[];
  };
};

export type GenerateResolverType<TDoc extends Document, TContext = any> = {
  // Get all available resolver generators, then leave only 3rd arg – opts
  // because first two args will be attached via bind() method at runtime:
  //   count = count.bind(undefined, model, tc);
  [resolver in keyof typeof resolverFactory]: <TSource = any>(
    opts?: Parameters<typeof resolverFactory[resolver]>[2]
  ) => // Also we should patch generics of the returned Resolver
  //   attach TContext TDoc from the code which will bind at runtime
  //   and allow user to attach TSource via generic at call
  // For this case we are using `extends infer` construction
  //   it helps to extract any Generic from existed method
  //   and then construct new combined return type
  typeof resolverFactory[resolver] extends (...args: any) => Resolver<any, any, infer TArgs, any>
    ? Resolver<TSource, TContext, TArgs, TDoc>
    : any;
};

export function composeMongoose<TDoc extends Document, TContext = any>(
  model: Model<TDoc>,
  opts: ComposeMongooseOpts<TContext> = {}
): (ObjectTypeComposer<TDoc, TContext> | EDiscriminatorTypeComposer<TDoc, TContext>) & {
  mongooseResolvers: GenerateResolverType<TDoc, TContext>;
} {
  const m: Model<any> = model;
  const name: string = (opts && opts.name) || m.modelName;

  const sc = opts.schemaComposer || globalSchemaComposer;
  sc.add(MongoID);

  if (sc.has(name)) {
    throw new Error(
      `You try to generate GraphQL Type with name ${name} from mongoose model but this type already exists in SchemaComposer. Please choose another type name "composeWithMongoose(model, { name: 'NewTypeName' })", or reuse existed type "schemaComposer.getOTC('TypeName')", or remove type from SchemaComposer before calling composeWithMongoose method "schemaComposer.delete('TypeName')".`
    );
  }
  if (sc.has(m.schema)) {
    // looks like you want to generate new TypeComposer from model
    // so remove cached model (which is used for cross-reference types)
    sc.delete(m.schema);
  }

  const tc = convertModelToGraphQL(m, name, sc, { ...opts });

  if (opts.description) {
    tc.setDescription(opts.description);
  }

  prepareFields(tc, opts);

  // generate InputObjectType with required fields,
  // before we made fields with default values required too
  createInputType(tc, opts.inputType);
  // making fields with default values required
  // but do it AFTER input object type generation
  // NonNull fields !== Required field
  // default values should not affect on that input fields became required
  if (opts.defaultsAsNonNull) {
    makeFieldsNonNullWithDefaultValues(tc);
  }

  tc.makeFieldNonNull('_id');

  const mongooseResolvers = {} as any;
  Object.keys(resolverFactory).forEach((name) => {
    mongooseResolvers[name] = (resolverFactory as any)[name].bind(undefined, model, tc);
  });
  (tc as any).mongooseResolvers = mongooseResolvers;

  return tc as any;
}

function makeFieldsNonNullWithDefaultValues(
  tc: ObjectTypeComposer,
  alreadyWorked = new Set()
): void {
  if (alreadyWorked.has(tc)) return;
  alreadyWorked.add(tc);

  let hasFieldsWithDefaultValues = false;
  tc.getFieldNames().forEach((fieldName) => {
    const fc = tc.getField(fieldName);
    // traverse nested Object types
    if (fc.type instanceof ObjectTypeComposer) {
      makeFieldsNonNullWithDefaultValues(fc.type);
      if (fc.type.getExtension('hasFieldsWithDefaultValue')) {
        tc.makeFieldNonNull(fieldName);
      }
    }

    const defaultValue = fc?.extensions?.defaultValue;
    if (defaultValue !== null && defaultValue !== undefined) {
      hasFieldsWithDefaultValues = true;
      tc.makeFieldNonNull(fieldName);
    }
  });

  if (hasFieldsWithDefaultValues) {
    tc.setExtension('hasFieldsWithDefaultValue', true);
  }
}

export function prepareFields(
  tc: ObjectTypeComposer<any, any>,
  opts: ComposeMongooseOpts<any> = {}
): void {
  const onlyFields = opts?.onlyFields || opts?.fields?.only;
  if (onlyFields) {
    tc.removeOtherFields(onlyFields);
  }
  const removeFields = opts?.removeFields || opts?.fields?.remove;
  if (removeFields) {
    tc.removeField(removeFields);
  }
}

export function createInputType(
  tc: ObjectTypeComposer<any, any>,
  inputTypeOpts: TypeConverterInputTypeOpts = {}
): void {
  const inputTypeComposer = tc.getInputTypeComposer();

  if (inputTypeOpts.name) {
    inputTypeComposer.setTypeName(inputTypeOpts.name);
  }

  if (inputTypeOpts.description) {
    inputTypeComposer.setDescription(inputTypeOpts.description);
  }

  prepareInputFields(inputTypeComposer, inputTypeOpts);
}

export function prepareInputFields(
  inputTypeComposer: InputTypeComposer<any>,
  inputTypeOpts: TypeConverterInputTypeOpts = {}
): void {
  const onlyFields = inputTypeOpts?.onlyFields || inputTypeOpts?.fields?.only;
  if (onlyFields) {
    inputTypeComposer.removeOtherFields(onlyFields);
  }

  const removeFields = inputTypeOpts?.removeFields || inputTypeOpts?.fields?.remove;
  if (removeFields) {
    inputTypeComposer.removeField(removeFields);
  }

  const requiredFields = inputTypeOpts?.requiredFields || inputTypeOpts?.fields?.required;
  if (requiredFields) {
    inputTypeComposer.makeFieldNonNull(requiredFields);
  }
}
