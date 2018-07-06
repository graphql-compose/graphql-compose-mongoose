/* @flow */

import type { ComposeFieldConfigMap } from 'graphql-compose';
import {
  EnumTypeComposer,
  graphql,
  schemaComposer,
  SchemaComposer,
  TypeComposer,
} from 'graphql-compose';
import type {
  ComposePartialFieldConfigAsObject,
  RelationOpts,
} from 'graphql-compose/lib/TypeComposer';
import type { GraphQLFieldConfigMap } from 'graphql-compose/lib/graphql';
import { Model } from 'mongoose';
import type { TypeConverterOpts } from './composeWithMongoose';
import { composeWithMongoose } from './composeWithMongoose';
import { recomposeBaseResolvers } from './utils/recomposeBaseResolvers';
import { recomposeChildResolvers } from './utils/recomposeChildResolvers';

const { GraphQLInterfaceType } = graphql;

export type Options = {
  reorderFields: string[] | boolean, // true order: _id, DKey, DInterfaceFields, DiscriminatorFields
  customizationOptions: TypeConverterOpts,
};

// Enum MongooseComposeResolvers
export const EMCResolvers = {
  count: 'count',
  connection: 'connection',
  pagination: 'pagination',
  findById: 'findById',
  findByIds: 'findByIds',
  findOne: 'findOne',
  findMany: 'findMany',
  createOne: 'createOne',
  updateById: 'updateById',
  updateOne: 'updateOne',
  updateMany: 'updateMany',
  removeById: 'removeById',
  removeOne: 'removeOne',
  removeMany: 'removeMany',
};

type Discriminators = {
  [DName: string]: any,
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
function createAndSetDKeyETC(dTC: DiscriminatorTypeComposer, discriminators: Discriminators) {
  const DKeyETC = EnumTypeComposer.create({
    name: `EnumDKey${dTC.getDBaseName()}${dTC.getDKey()[0].toUpperCase() +
      dTC.getDKey().substr(1)}`,
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

function reorderFields(
  modelTC: DiscriminatorTypeComposer | ChildDiscriminatorTypeComposer,
  order: string[] | boolean
) {
  if (order) {
    if (Array.isArray(order)) {
      modelTC.reorderFields(order);
    } else {
      const newOrder = [];

      // is child discriminator
      if (modelTC instanceof ChildDiscriminatorTypeComposer) {
        const baseModelTC = modelTC.getDTC();

        newOrder.push(...baseModelTC.getFieldNames());

        newOrder.filter(value => value === '_id' || value === modelTC.getDKey());

        newOrder.unshift('_id', modelTC.getDKey());
      } else {
        if (modelTC.getField('_id')) {
          newOrder.push('_id');
        }
        newOrder.push(modelTC.getDKey());
      }

      modelTC.reorderFields(newOrder);
    }
  }
}

// copy all baseTypeComposers fields to childTC
// these are the fields before calling discriminator
function childImplements(baseDTC: TypeComposer, childTC: TypeComposer) {
  const baseFields = baseDTC.getFieldNames();
  const childFields = childTC.getFieldNames();

  for (const field of baseFields) {
    const childFieldName = childFields.find(fld => fld === field);

    if (childFieldName) {
      childTC.extendField(field, {
        type: baseDTC.getFieldType(field),
      });
    } else {
      childTC.setField(field, baseDTC.getField(field));
    }
  }

  return childTC;
}

function getBaseTCFieldsWithTypes(baseTC: TypeComposer) {
  const baseFields = baseTC.getFieldNames();
  const baseFieldsWithTypes: GraphQLFieldConfigMap<any, any> = {};

  for (const field of baseFields) {
    baseFieldsWithTypes[field] = {
      type: baseTC.getFieldType(field),
    };
  }

  return baseFieldsWithTypes;
}

function createDInterface(baseModelTC: DiscriminatorTypeComposer): GraphQLInterfaceType {
  return new GraphQLInterfaceType({
    name: baseModelTC.getDBaseName(),

    resolveType: (value: any) => {
      const childDName = value[baseModelTC.getDKey()];
      const sComposer = baseModelTC.getGQC(); // get schemaComposer

      if (childDName) {
        return sComposer.getTC(childDName).getType();
      }

      // as fallback return BaseModelTC
      return sComposer.getTC(baseModelTC.getTypeName()).getType();
    },
    // hoisting issue solved, get at time :)
    fields: () => getBaseTCFieldsWithTypes(baseModelTC),
  });
}

export class DiscriminatorTypeComposer extends TypeComposer {
  modelName: string;

  discriminatorKey: string;

  DKeyETC: EnumTypeComposer;

  GQC: SchemaComposer<any>;

  opts: Options;

  DInterface: GraphQLInterfaceType;

  discriminators: Discriminators;

  CDTCs: Array<ChildDiscriminatorTypeComposer>;

  constructor(
    baseModel: Model,
    opts: Options = {
      reorderFields: true,
      customizationOptions: {},
    }
  ) {
    if (!baseModel || !(baseModel: any).discriminators) {
      throw Error('Discriminator Key not Set, Use composeWithMongoose for Normal Collections');
    }

    super(composeWithMongoose(baseModel, opts.customizationOptions).gqType);

    // !ORDER MATTERS
    this.opts = opts || {};
    this.modelName = (baseModel: any).modelName;
    this.discriminatorKey = (baseModel: any).schema.get('discriminatorKey') || '__t';

    // discriminants and object containing all discriminants with key
    // key being their DNames
    this.discriminators = (baseModel: any).discriminators;

    this.CDTCs = [];
    this.GQC = opts.customizationOptions.schemaComposer || schemaComposer;
    this.setTypeName(`Generic${this.modelName}`);
    this.DKeyETC = createAndSetDKeyETC(this, this.discriminators);

    reorderFields(this, this.opts.reorderFields);

    this.DInterface = createDInterface(this);
    this.setInterfaces([this.DInterface]);

    // Add a Generic Field, else we have generic Errors when resolving interface
    // this is somehow i don't understand, but we don't get any type if we never query it
    // I guess under the hud, graphql-compose shakes it off.
    this.GQC.Query.addFields({
      [`${this.getTypeName()[0].toLowerCase() +
        this.getTypeName().substr(1)}One`]: this.getResolver('findOne')
        .clone({ name: 'GenericOne' })
        .setType(this.getType()),
    });

    // recompose Base Resolvers
    recomposeBaseResolvers(this);
  }

  getOpts(): Options {
    return this.opts;
  }

  getGQC(): SchemaComposer<any> {
    return this.GQC;
  }

  getDKey(): string {
    return this.discriminatorKey;
  }

  getDKeyETC(): EnumTypeComposer {
    return this.DKeyETC;
  }

  getDBaseName(): string {
    return this.modelName;
  }

  getDInterface(): GraphQLInterfaceType {
    return this.DInterface;
  }

  hasChildDTC(DName: string): boolean {
    return !!this.CDTCs.find(ch => ch.getTypeName() === DName);
  }

  // add fields only to DInterface, baseTC, childTC
  addDFields(newDFields: ComposeFieldConfigMap<any, any>): this {
    super.addFields(newDFields);

    for (const CDTC of this.CDTCs) {
      CDTC.addFields(newDFields);
    }

    return this;
  }

  extendDField(
    fieldName: string,
    partialFieldConfig: ComposePartialFieldConfigAsObject<any, any>
  ): this {
    super.extendField(fieldName, partialFieldConfig);

    for (const CDTC of this.CDTCs) {
      CDTC.extendField(fieldName, partialFieldConfig);
    }

    return this;
  }

  // relations with args are a bit hard to manage as interfaces i believe as of now do not
  // support field args. Well if one wants to have use args, you setType for resolver as this
  // this = this DiscriminantTypeComposer
  // NOTE, those relations will be propagated to the childTypeComposers and you can use normally.
  // FixMe: Note, You must use this function after creating all discriminators
  addDRelation(fieldName: string, relationOpts: RelationOpts<any, any>): this {
    this.addRelation(fieldName, relationOpts);

    for (const CDTC of this.CDTCs) {
      CDTC.addRelation(fieldName, relationOpts);
    }

    return this;
  }

  /* eslint no-use-before-define: 0 */
  discriminator(childModel: Model, opts?: TypeConverterOpts): ChildDiscriminatorTypeComposer {
    const childDTC = new ChildDiscriminatorTypeComposer(this, childModel, {
      customizationOptions: opts || this.opts.customizationOptions,
      reorderFields: this.opts.reorderFields,
    });

    this.CDTCs.push(childDTC);

    return childDTC;
  }
}

export class ChildDiscriminatorTypeComposer extends TypeComposer {
  dName: string;

  dTC: DiscriminatorTypeComposer;

  constructor(dTC: DiscriminatorTypeComposer, childModel: Model, opts: Options) {
    if (!childModel) {
      throw Error('Please specify a childModel');
    }
    const childTC = composeWithMongoose(childModel, opts.customizationOptions);

    super(childImplements(dTC, childTC).gqType);

    // !ORDER MATTERS
    this.dTC = dTC;
    this.dName = (childModel: any).modelName;
    this.setInterfaces([dTC.getDInterface()]);

    // Add this field, else we have Unknown type Error when we query for this field when we haven't
    // added a query that returns this type on rootQuery.
    // this is somehow i don't understand, but we don't get any type if we never query it
    // I guess under the hud, graphql-compose shakes it off.
    dTC.getGQC().Query.addFields({
      [`${this.getTypeName()[0].toLowerCase() +
        this.getTypeName().substr(1)}One`]: this.getResolver('findOne')
        .clone({ name: `${this.getTypeName()}One` })
        .setType(this.getType()),
    });

    recomposeChildResolvers(this);

    reorderFields(this, opts.reorderFields);
  }

  getDTC(): DiscriminatorTypeComposer {
    return this.dTC;
  }

  getDKey(): string {
    return this.dTC.getDKey();
  }

  getDName(): string {
    return this.dName;
  }

  getDBaseName(): string {
    return this.dTC.getDBaseName();
  }

  getDInterface(): GraphQLInterfaceType {
    return this.dTC.getDInterface();
  }
}

export function composeWithMongooseDiscriminators(
  baseModel: Model,
  opts: Options = {
    reorderFields: true,
    customizationOptions: {},
  }
): DiscriminatorTypeComposer {
  return new DiscriminatorTypeComposer(baseModel, opts);
}
