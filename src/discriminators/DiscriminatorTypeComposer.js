/* @flow */

import type { ComposeFieldConfigMap } from 'graphql-compose';
import {
  EnumTypeComposer,
  graphql,
  schemaComposer,
  SchemaComposer,
  TypeComposer,
} from 'graphql-compose';
import type { GraphQLFieldConfigMap } from 'graphql-compose/lib/graphql';
import type {
  ComposePartialFieldConfigAsObject,
  RelationOpts,
  ComposeFieldConfig,
  GetRecordIdFn,
} from 'graphql-compose/lib/TypeComposer';
import { Model } from 'mongoose';
import { composeWithMongoose, type TypeConverterOpts } from '../composeWithMongoose';
import { composeChildTC } from './composeChildTC';
import { mergeCustomizationOptions } from './merge-customization-options';
import { prepareBaseResolvers } from './prepare-resolvers/prepareBaseResolvers';
import { reorderFields } from './utils';

const { GraphQLInterfaceType } = graphql;

export type Options = {
  reorderFields?: boolean | string[], // true order: _id, DKey, DInterfaceFields, DiscriminatorFields
  customizationOptions?: TypeConverterOpts,
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

function getBaseTCFieldsWithTypes(baseTC: TypeComposer) {
  const baseFields = baseTC.getFieldNames();
  const baseFieldsWithTypes: GraphQLFieldConfigMap<any, any> = {};

  for (const field of baseFields) {
    baseFieldsWithTypes[field] = baseTC.getFieldConfig(field);
  }

  return baseFieldsWithTypes;
}

function createDInterface(baseModelTC: DiscriminatorTypeComposer): GraphQLInterfaceType {
  return new GraphQLInterfaceType({
    name: `${baseModelTC.getTypeName()}Interface`,

    resolveType: (value: any) => {
      const childDName = value[baseModelTC.getDKey()];

      if (childDName) {
        return baseModelTC.schemaComposer.getTC(childDName).getType();
      }

      // as fallback return BaseModelTC
      return baseModelTC.schemaComposer.getTC(baseModelTC.getTypeName()).getType();
    },
    // hoisting issue solved, get at time :)
    fields: () => getBaseTCFieldsWithTypes(baseModelTC),
  });
}

export class DiscriminatorTypeComposer extends TypeComposer {
  discriminatorKey: string;

  DKeyETC: EnumTypeComposer;

  schemaComposer: SchemaComposer<any>;

  opts: Options;

  DInterface: GraphQLInterfaceType;

  childTCs: TypeComposer[];

  constructor(baseModel: Model, opts?: any) {
    if (!baseModel || !(baseModel: any).discriminators) {
      throw Error('Discriminator Key not Set, Use composeWithMongoose for Normal Collections');
    }

    opts = {  // eslint-disable-line
      reorderFields: true,
      customizationOptions: {
        schemaComposer,
      },
      ...opts,
    };

    super(composeWithMongoose(baseModel, opts.customizationOptions).gqType);

    this.opts = opts;
    this.childTCs = [];
    this.discriminatorKey = (baseModel: any).schema.get('discriminatorKey') || '__t';

    this.schemaComposer =
      opts.customizationOptions && opts.customizationOptions.schemaComposer
        ? opts.customizationOptions.schemaComposer
        : schemaComposer;

    // discriminators an object containing all discriminators with key being DNames
    this.DKeyETC = createAndSetDKeyETC(this, (baseModel: any).discriminators);

    reorderFields(this, (this.opts: any).reorderFields, this.discriminatorKey);

    this.DInterface = createDInterface(this);
    this.setInterfaces([this.DInterface]);

    this.schemaComposer.addSchemaMustHaveType(this);

    // prepare Base Resolvers
    prepareBaseResolvers(this);
  }

  getDKey(): string {
    return this.discriminatorKey;
  }

  getDKeyETC(): EnumTypeComposer {
    return this.DKeyETC;
  }

  getDInterface(): GraphQLInterfaceType {
    return this.DInterface;
  }

  hasChildTC(DName: string): boolean {
    return !!this.childTCs.find(ch => ch.getTypeName() === DName);
  }

  setFields(fields: ComposeFieldConfigMap<any, any>): this {
    super.setFields(fields);

    for (const childTC of this.childTCs) {
      childTC.setFields(fields);
    }

    return this;
  }

  setField(fieldName: string, fieldConfig: ComposeFieldConfig<any, any>): this {
    super.setField(fieldName, fieldConfig);

    for (const childTC of this.childTCs) {
      childTC.setField(fieldName, fieldConfig);
    }

    return this;
  }

  // discriminators must have all interface fields
  addFields(newFields: ComposeFieldConfigMap<any, any>): this {
    super.addFields(newFields);

    for (const childTC of this.childTCs) {
      childTC.addFields(newFields);
    }

    return this;
  }

  addNestedFields(newFields: ComposeFieldConfigMap<any, any>): this {
    super.addNestedFields(newFields);

    for (const childTC of this.childTCs) {
      childTC.addNestedFields(newFields);
    }

    return this;
  }

  removeField(fieldNameOrArray: string | Array<string>): this {
    super.removeField(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.removeField(fieldNameOrArray);
    }

    return this;
  }

  removeOtherFields(fieldNameOrArray: string | Array<string>): this {
    super.removeOtherFields(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.removeOtherFields(fieldNameOrArray);
    }

    return this;
  }

  extendField(
    fieldName: string,
    partialFieldConfig: ComposePartialFieldConfigAsObject<any, any>
  ): this {
    super.extendField(fieldName, partialFieldConfig);

    for (const childTC of this.childTCs) {
      childTC.extendField(fieldName, partialFieldConfig);
    }

    return this;
  }

  reorderFields(names: string[]): this {
    super.reorderFields(names);

    for (const childTC of this.childTCs) {
      childTC.reorderFields(names);
    }

    return this;
  }

  makeFieldNonNull(fieldNameOrArray: string | Array<string>): this {
    super.makeFieldNonNull(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.makeFieldNonNull(fieldNameOrArray);
    }

    return this;
  }

  makeFieldNullable(fieldNameOrArray: string | Array<string>): this {
    super.makeFieldNullable(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.makeFieldNullable(fieldNameOrArray);
    }

    return this;
  }

  deprecateFields(fields: { [fieldName: string]: string } | string[] | string): this {
    super.deprecateFields(fields);

    for (const childTC of this.childTCs) {
      childTC.deprecateFields(fields);
    }

    return this;
  }

  // relations with args are a bit hard to manage as interfaces i believe as of now do not
  // support field args. Well if one wants to have use args, you setType for resolver as this
  // this = this DiscriminantTypeComposer
  // NOTE, those relations will be propagated to the childTypeComposers and you can use normally.
  addRelation(fieldName: string, relationOpts: RelationOpts<any, any>): this {
    super.addRelation(fieldName, relationOpts);

    for (const childTC of this.childTCs) {
      childTC.addRelation(fieldName, relationOpts);
    }

    return this;
  }

  setRecordIdFn(fn: GetRecordIdFn<any, any>): this {
    super.setRecordIdFn(fn);

    for (const childTC of this.childTCs) {
      childTC.setRecordIdFn(fn);
    }

    return this;
  }

  /* eslint no-use-before-define: 0 */
  discriminator(childModel: Model, opts?: TypeConverterOpts): TypeComposer {
    const customizationOpts = mergeCustomizationOptions(
      (this.opts: any).customizationOptions,
      opts
    );

    let childTC = composeWithMongoose(childModel, customizationOpts);

    childTC = composeChildTC(this, childTC, this.opts);

    this.schemaComposer.addSchemaMustHaveType(childTC);
    this.childTCs.push(childTC);

    return childTC;
  }
}
