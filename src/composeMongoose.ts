import type { SchemaComposer, Resolver } from 'graphql-compose';
import { schemaComposer as globalSchemaComposer, ObjectTypeComposer } from 'graphql-compose';
import type { Model, Document } from 'mongoose';
import { convertModelToGraphQL } from './fieldsConverter';
import { allResolvers } from './resolvers';
import MongoID from './types/MongoID';
import {
  prepareFields,
  createInputType,
  TransformRecordIdFn,
  TypeConverterInputTypeOpts,
} from './composeWithMongoose';

export type ComposeMongooseOpts<TContext> = {
  schemaComposer?: SchemaComposer<TContext>;
  name?: string;
  description?: string;
  fields?: {
    only?: string[];
    // rename?: { [oldName: string]: string },
    remove?: string[];
  };
  inputType?: TypeConverterInputTypeOpts;
  /** You may customize `recordId` field in mutation payloads */
  transformRecordId?: TransformRecordIdFn<TContext>;
};

export type GenerateResolverType<TDoc extends Document, TContext = any> = {
  // Get all available resolver generators, then leave only 3rd arg – opts
  // because first two args will be attached via bind() method at runtime:
  //   count = count.bind(undefined, model, tc);
  [resolver in keyof typeof allResolvers]: <TSource = any>(
    opts?: Parameters<typeof allResolvers[resolver]>[2]
  ) => // Also we should patch generics of the returned Resolver
  //   attach TContext TDoc from the code which will bind at runtime
  //   and allow user to attach TSource via generic at call
  // For this case we are using `extends infer` construction
  //   it helps to extract any Generic from existed method
  //   and then construct new combined return type
  typeof allResolvers[resolver] extends (...args: any) => Resolver<any, any, infer TArgs, any>
    ? Resolver<TSource, TContext, TArgs, TDoc>
    : any;
};

export function composeMongoose<TDoc extends Document, TContext = any>(
  model: Model<TDoc>,
  opts: ComposeMongooseOpts<TContext> = {}
): ObjectTypeComposer<TDoc, TContext> & {
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

  const tc = convertModelToGraphQL(m, name, sc);

  if (opts.description) {
    tc.setDescription(opts.description);
  }

  if (opts.fields) {
    prepareFields(tc, opts.fields);
  }

  // generate InputObjectType with required fields,
  // before we made fields with default values required too
  createInputType(tc, opts.inputType);
  // making fields with default values required
  // but do it AFTER input object type generation
  // NonNull fields !== Required field
  // default values should not affect on that input fields became required
  makeFieldsNonNullWithDefaultValues(tc);

  tc.makeFieldNonNull('_id');

  const mongooseResolvers = {} as any;
  Object.keys(allResolvers).forEach((name) => {
    mongooseResolvers[name] = (allResolvers as any)[name].bind(undefined, model, tc);
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

  tc.getFieldNames().forEach((fieldName) => {
    const fc = tc.getField(fieldName);
    // traverse nested Objects
    if (fc.type instanceof ObjectTypeComposer) {
      makeFieldsNonNullWithDefaultValues(fc.type);
    }
    const defaultValue = fc?.extensions?.defaultValue;
    if (defaultValue !== null && defaultValue !== undefined) {
      tc.makeFieldNonNull(fieldName);
    }
  });
}
