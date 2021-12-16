import {
  EnumTypeComposer,
  SchemaComposer,
  ObjectTypeComposer,
  InterfaceTypeComposer,
  ObjectTypeComposerRelationOpts,
  ObjectTypeComposerFieldConfigDefinition,
  ObjectTypeComposerFieldConfigMapDefinition,
  ObjectTypeComposerFieldConfigAsObjectDefinition,
  graphqlVersion,
} from 'graphql-compose';
import type { Model } from 'mongoose';
import { composeWithMongoose, ComposeWithMongooseOpts } from '../composeWithMongoose';
import { composeChildTC } from './composeChildTC';
import { mergeCustomizationOptions } from './utils/mergeCustomizationOptions';
import { prepareBaseResolvers } from './prepareBaseResolvers';
import { reorderFields } from './utils/reorderFields';
import { GraphQLFieldConfig, GraphQLObjectType } from 'graphql-compose/lib/graphql';

export interface ComposeWithMongooseDiscriminatorsOpts<TContext>
  extends ComposeWithMongooseOpts<TContext> {
  reorderFields?: boolean | string[]; // true order: _id, DKey, DInterfaceFields, DiscriminatorFields
}

type Discriminators = {
  [DName: string]: any;
};

// sets the values on DKey enum TC
function setDKeyETCValues(discriminators: Discriminators): any {
  const values: { [propName: string]: { value: string } } = {};

  for (const DName in discriminators) {
    if (discriminators.hasOwnProperty(DName)) {
      values[DName] = {
        value: DName,
      };
    }
  }

  return values;
}

// creates an enum from discriminator names
// then sets this enum type as the discriminator key field type
function createAndSetDKeyETC(
  dTC: DiscriminatorTypeComposer<any, any>,
  discriminators: Discriminators
) {
  const DKeyETC = dTC.schemaComposer.createEnumTC({
    name: `EnumDKey${dTC.getTypeName()}${dTC.getDKey()[0].toUpperCase() + dTC.getDKey().substr(1)}`,
    values: setDKeyETCValues(discriminators),
  });

  // set on Output
  dTC.extendField(dTC.getDKey(), {
    type: () => DKeyETC,
  });

  // set on Input
  dTC.getInputTypeComposer().extendField(dTC.getDKey(), {
    type: () => DKeyETC,
  });

  return DKeyETC;
}

export class DiscriminatorTypeComposer<TSource, TContext> extends ObjectTypeComposer<
  TSource,
  TContext
> {
  discriminatorKey: string = '';
  opts: ComposeWithMongooseDiscriminatorsOpts<TContext> = {};
  childTCs: ObjectTypeComposer<any, TContext>[] = [];
  DInterface?: InterfaceTypeComposer<TSource, TContext>;
  DKeyETC?: EnumTypeComposer<TContext>;

  constructor(gqType: GraphQLObjectType, schemaComposer: SchemaComposer<TContext>) {
    super(gqType, schemaComposer);
    return this;
  }

  static createFromModel<TSrc = any, TCtx = any>(
    baseModel: Model<any>,
    schemaComposer: SchemaComposer<TCtx>,
    opts?: ComposeWithMongooseDiscriminatorsOpts<any>
  ): DiscriminatorTypeComposer<TSrc, TCtx> {
    if (!baseModel || !baseModel.discriminators) {
      throw Error(
        'Discriminator Key not Set, have you already registered discriminators on your base model? ' +
          'Otherwise, use composeWithMongoose for Normal Collections'
      );
    }

    if (!(schemaComposer instanceof SchemaComposer)) {
      throw Error(
        'DiscriminatorTC.createFromModel() should receive SchemaComposer in second argument'
      );
    }

    opts = {
      reorderFields: true,
      schemaComposer,
      ...opts,
    };

    const baseTC = composeWithMongoose(baseModel, opts);
    const baseDTC = new DiscriminatorTypeComposer(baseTC.getType(), schemaComposer);

    // copy data from baseTC to baseDTC
    baseTC.clone(baseDTC as ObjectTypeComposer<any, any>);
    baseDTC._gqcInputTypeComposer = (baseTC as any)._gqcInputTypeComposer;

    baseDTC.opts = opts;
    baseDTC.childTCs = [];
    baseDTC.discriminatorKey = baseModel.schema.get('discriminatorKey') || '__t';
    baseDTC.DInterface = baseDTC._createDInterface(baseDTC);
    baseDTC.setInterfaces([baseDTC.DInterface]);

    // discriminators an object containing all discriminators with key being DNames
    baseDTC.DKeyETC = createAndSetDKeyETC(baseDTC, baseModel.discriminators);

    reorderFields(baseDTC, baseDTC.opts.reorderFields, baseDTC.discriminatorKey);
    baseDTC.schemaComposer.addSchemaMustHaveType(baseDTC as any);

    // prepare Base Resolvers
    prepareBaseResolvers(baseDTC);

    return baseDTC as any;
  }

  _createDInterface(
    baseTC: DiscriminatorTypeComposer<any, any>
  ): InterfaceTypeComposer<TSource, TContext> {
    const baseFields = baseTC.getFieldNames();
    const interfaceFields = {} as Record<string, GraphQLFieldConfig<any, any>>;
    for (const field of baseFields) {
      interfaceFields[field] = baseTC.getFieldConfig(field);
    }

    return this.schemaComposer.createInterfaceTC({
      name: `${baseTC.getTypeName()}Interface`,

      resolveType: (value: any) => {
        const childDName = value[baseTC.getDKey()];

        if (childDName) {
          if (graphqlVersion >= 16) {
            // in GraphQL v16 we must return TypeName
            return childDName;
          } else {
            // in GraphQL below v16 we must return ObjectType
            return baseTC.schemaComposer.getOTC(childDName).getType();
          }
        }

        // as fallback return BaseModelTC
        if (graphqlVersion >= 16) {
          return baseTC.getTypeName();
        } else {
          return baseTC.schemaComposer.getOTC(baseTC.getTypeName()).getType();
        }
      },
      fields: interfaceFields as any,
    });
  }

  getDKey(): string {
    return this.discriminatorKey;
  }

  getDKeyETC(): EnumTypeComposer<TContext> {
    return this.DKeyETC as any;
  }

  getDInterface(): InterfaceTypeComposer<TSource, TContext> {
    return this.DInterface as any;
  }

  hasChildTC(DName: string): boolean {
    return !!this.childTCs.find((ch) => ch.getTypeName() === DName);
  }

  /* eslint no-use-before-define: 0 */
  discriminator<TSrc = Model<any>>(
    childModel: Model<any>,
    opts?: ComposeWithMongooseOpts<TContext>
  ): ObjectTypeComposer<TSrc, TContext> {
    const customizationOpts = mergeCustomizationOptions(this.opts, opts);

    let childTC = composeWithMongoose(childModel, customizationOpts);

    childTC = composeChildTC(this, childTC, this.opts);

    this.schemaComposer.addSchemaMustHaveType(childTC);
    this.childTCs.push(childTC);

    return childTC as any;
  }

  setFields(fields: ObjectTypeComposerFieldConfigMapDefinition<any, any>): this {
    const oldFieldNames = super.getFieldNames();
    super.setFields(fields);
    this.getDInterface().setFields(fields);

    for (const childTC of this.childTCs) {
      childTC.removeField(oldFieldNames);
      childTC.addFields(fields);
      reorderFields(childTC, this.opts.reorderFields, this.getDKey(), super.getFieldNames());
    }

    return this;
  }

  setField(
    fieldName: string,
    fieldConfig: ObjectTypeComposerFieldConfigDefinition<any, any>
  ): this {
    super.setField(fieldName, fieldConfig);
    this.getDInterface().setField(fieldName, fieldConfig);

    for (const childTC of this.childTCs) {
      childTC.setField(fieldName, fieldConfig);
    }

    return this;
  }

  // discriminators must have all interface fields
  addFields(newFields: ObjectTypeComposerFieldConfigMapDefinition<any, any>): this {
    super.addFields(newFields);
    this.getDInterface().addFields(newFields);

    for (const childTC of this.childTCs) {
      childTC.addFields(newFields);
    }

    return this;
  }

  addNestedFields(newFields: ObjectTypeComposerFieldConfigMapDefinition<any, any>): this {
    super.addNestedFields(newFields);
    this.getDInterface().setFields(this.getFields());

    for (const childTC of this.childTCs) {
      childTC.addNestedFields(newFields);
    }

    return this;
  }

  removeField(fieldNameOrArray: string | Array<string>): this {
    super.removeField(fieldNameOrArray);
    this.getDInterface().removeField(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.removeField(fieldNameOrArray);
    }

    return this;
  }

  removeOtherFields(fieldNameOrArray: string | Array<string>): this {
    const oldFieldNames = super.getFieldNames();
    super.removeOtherFields(fieldNameOrArray);
    this.getDInterface().removeOtherFields(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      const specificFields = childTC
        .getFieldNames()
        .filter(
          (childFieldName) =>
            !oldFieldNames.find((oldBaseFieldName) => oldBaseFieldName === childFieldName)
        );
      childTC.removeOtherFields(super.getFieldNames().concat(specificFields));
      reorderFields(childTC, this.opts.reorderFields, this.getDKey(), super.getFieldNames());
    }

    return this;
  }

  reorderFields(names: string[]): this {
    super.reorderFields(names);
    this.getDInterface().reorderFields(names);

    for (const childTC of this.childTCs) {
      childTC.reorderFields(names);
    }

    return this;
  }

  extendField(
    fieldName: string,
    partialFieldConfig: Partial<ObjectTypeComposerFieldConfigAsObjectDefinition<any, TContext>>
  ): this {
    super.extendField(fieldName, partialFieldConfig);
    this.getDInterface().extendField(fieldName, partialFieldConfig);

    for (const childTC of this.childTCs) {
      childTC.extendField(fieldName, partialFieldConfig);
    }

    return this;
  }

  makeFieldNonNull(fieldNameOrArray: string | Array<string>): this {
    super.makeFieldNonNull(fieldNameOrArray);
    this.getDInterface().makeFieldNonNull(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.makeFieldNonNull(fieldNameOrArray);
    }

    return this;
  }

  makeFieldNullable(fieldNameOrArray: string | Array<string>): this {
    super.makeFieldNullable(fieldNameOrArray);
    this.getDInterface().makeFieldNullable(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.makeFieldNullable(fieldNameOrArray);
    }

    return this;
  }

  makeFieldPlural(fieldNameOrArray: string | Array<string>): this {
    super.makeFieldPlural(fieldNameOrArray);
    this.getDInterface().makeFieldPlural(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.makeFieldPlural(fieldNameOrArray);
    }

    return this;
  }

  makeFieldNonPlural(fieldNameOrArray: string | Array<string>): this {
    super.makeFieldNonPlural(fieldNameOrArray);
    this.getDInterface().makeFieldNonPlural(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.makeFieldNonPlural(fieldNameOrArray);
    }

    return this;
  }

  deprecateFields(fields: { [fieldName: string]: string } | string[] | string): this {
    super.deprecateFields(fields);
    this.getDInterface().deprecateFields(fields);

    for (const childTC of this.childTCs) {
      childTC.deprecateFields(fields);
    }

    return this;
  }

  // relations with args are a bit hard to manage as interfaces i believe as of now do not
  // support field args. Well if one wants to have use args, you setType for resolver as this
  // this = this DiscriminantTypeComposer
  // NOTE, those relations will be propagated to the childTypeComposers and you can use normally.
  addRelation(
    fieldName: string,
    relationOpts: ObjectTypeComposerRelationOpts<any, any, any, any>
  ): this {
    super.addRelation(fieldName, relationOpts);
    this.getDInterface().setField(fieldName, this.getField(fieldName));

    for (const childTC of this.childTCs) {
      childTC.addRelation(fieldName, relationOpts);
    }

    return this;
  }
}
