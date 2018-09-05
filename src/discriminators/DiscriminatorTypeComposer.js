/* @flow */

import {
  EnumTypeComposer,
  schemaComposer,
  SchemaComposer,
  TypeComposerClass,
  type InterfaceTypeComposerClass,
  type ComposeFieldConfig,
  type RelationOpts,
  type GetRecordIdFn,
  type ComposeFieldConfigMap,
} from 'graphql-compose';
import type { ComposePartialFieldConfigAsObject } from 'graphql-compose/lib/TypeComposer';
import type { Model } from 'mongoose';
import { composeWithMongoose, type TypeConverterOpts } from '../composeWithMongoose';
import { composeChildTC } from './composeChildTC';
import { mergeCustomizationOptions } from './utils/mergeCustomizationOptions';
import { prepareBaseResolvers } from './prepareBaseResolvers';
import { reorderFields } from './utils/reorderFields';

export type DiscriminatorOptions = {|
  reorderFields?: boolean | string[], // true order: _id, DKey, DInterfaceFields, DiscriminatorFields
  ...TypeConverterOpts,
|};

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
function createAndSetDKeyETC(dTC: DiscriminatorTypeComposer<any>, discriminators: Discriminators) {
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

export class DiscriminatorTypeComposer<TContext> extends TypeComposerClass<TContext> {
  discriminatorKey: string;

  DKeyETC: EnumTypeComposer;

  opts: DiscriminatorOptions;

  DInterface: InterfaceTypeComposerClass<TContext>;

  childTCs: TypeComposerClass<TContext>[];

  static _getClassConnectedWithSchemaComposer(
    sc?: SchemaComposer<TContext>
  ): Class<DiscriminatorTypeComposer<TContext>> {
    class _DiscriminatorTypeComposer extends DiscriminatorTypeComposer<TContext> {
      static schemaComposer = sc || schemaComposer;
    }

    return _DiscriminatorTypeComposer;
  }

  /* ::
  constructor(gqType: any): DiscriminatorTypeComposer<TContext> {
    super(gqType);
    return this;
  }
  */

  static createFromModel(baseModel: Class<Model>, opts?: any): DiscriminatorTypeComposer<TContext> {
    if (!baseModel || !(baseModel: any).discriminators) {
      throw Error('Discriminator Key not Set, Use composeWithMongoose for Normal Collections');
    }

    // eslint-disable-next-line
    opts = {
      reorderFields: true,
      schemaComposer,
      ...opts,
    };

    const baseTC = composeWithMongoose(baseModel, opts);

    const _DiscriminatorTypeComposer = this._getClassConnectedWithSchemaComposer(
      opts.schemaComposer
    );
    const baseDTC = new _DiscriminatorTypeComposer(baseTC.getType());

    baseDTC.opts = opts;
    baseDTC.childTCs = [];
    baseDTC.discriminatorKey = (baseModel: any).schema.get('discriminatorKey') || '__t';

    // discriminators an object containing all discriminators with key being DNames
    baseDTC.DKeyETC = createAndSetDKeyETC(baseDTC, (baseModel: any).discriminators);

    reorderFields(baseDTC, (baseDTC.opts: any).reorderFields, baseDTC.discriminatorKey);

    baseDTC.DInterface = baseDTC._createDInterface(baseDTC);
    baseDTC.setInterfaces([baseDTC.DInterface]);

    baseDTC.schemaComposer.addSchemaMustHaveType(baseDTC);

    // prepare Base Resolvers
    prepareBaseResolvers(baseDTC);

    return baseDTC;
  }

  _createDInterface(baseTC: DiscriminatorTypeComposer<any>): InterfaceTypeComposerClass<TContext> {
    return this.schemaComposer.InterfaceTypeComposer.create({
      name: `${baseTC.getTypeName()}Interface`,

      resolveType: (value: any) => {
        const childDName = value[baseTC.getDKey()];

        if (childDName) {
          return baseTC.schemaComposer.getTC(childDName).getType();
        }

        // as fallback return BaseModelTC
        return baseTC.schemaComposer.getTC(baseTC.getTypeName()).getType();
      },
      fields: (): ComposeFieldConfigMap<any, TContext> => {
        const baseFields = baseTC.getFieldNames();
        const interfaceFields = {};
        for (const field of baseFields) {
          interfaceFields[field] = baseTC.getFieldConfig(field);
        }
        return interfaceFields;
      },
    });
  }

  getDKey(): string {
    return this.discriminatorKey;
  }

  getDKeyETC(): EnumTypeComposer {
    return this.DKeyETC;
  }

  getDInterface(): InterfaceTypeComposerClass<TContext> {
    return this.DInterface;
  }

  hasChildTC(DName: string): boolean {
    return !!this.childTCs.find(ch => ch.getTypeName() === DName);
  }

  setFields(fields: ComposeFieldConfigMap<any, any>): DiscriminatorTypeComposer<TContext> {
    const oldFieldNames = super.getFieldNames();
    super.setFields(fields);

    for (const childTC of this.childTCs) {
      childTC.removeField(oldFieldNames);
      childTC.addFields(fields);
      reorderFields(childTC, (this.opts: any).reorderFields, this.getDKey(), super.getFieldNames());
    }

    return this;
  }

  setField(
    fieldName: string,
    fieldConfig: ComposeFieldConfig<any, any>
  ): DiscriminatorTypeComposer<TContext> {
    super.setField(fieldName, fieldConfig);

    for (const childTC of this.childTCs) {
      childTC.setField(fieldName, fieldConfig);
    }

    return this;
  }

  // discriminators must have all interface fields
  addFields(newFields: ComposeFieldConfigMap<any, any>): DiscriminatorTypeComposer<TContext> {
    super.addFields(newFields);

    for (const childTC of this.childTCs) {
      childTC.addFields(newFields);
    }

    return this;
  }

  addNestedFields(newFields: ComposeFieldConfigMap<any, any>): DiscriminatorTypeComposer<TContext> {
    super.addNestedFields(newFields);

    for (const childTC of this.childTCs) {
      childTC.addNestedFields(newFields);
    }

    return this;
  }

  removeField(fieldNameOrArray: string | Array<string>): DiscriminatorTypeComposer<TContext> {
    super.removeField(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.removeField(fieldNameOrArray);
    }

    return this;
  }

  removeOtherFields(fieldNameOrArray: string | Array<string>): DiscriminatorTypeComposer<TContext> {
    const oldFieldNames = super.getFieldNames();
    super.removeOtherFields(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      const specificFields = childTC
        .getFieldNames()
        .filter(
          childFieldName =>
            !oldFieldNames.find(oldBaseFieldName => oldBaseFieldName === childFieldName)
        );
      childTC.removeOtherFields(super.getFieldNames().concat(specificFields));
      reorderFields(childTC, (this.opts: any).reorderFields, this.getDKey(), super.getFieldNames());
    }

    return this;
  }

  extendField(
    fieldName: string,
    partialFieldConfig: ComposePartialFieldConfigAsObject<any, TContext>
  ): this {
    super.extendField(fieldName, partialFieldConfig);

    for (const childTC of this.childTCs) {
      childTC.extendField(fieldName, partialFieldConfig);
    }

    return this;
  }

  reorderFields(names: string[]): DiscriminatorTypeComposer<TContext> {
    super.reorderFields(names);

    for (const childTC of this.childTCs) {
      childTC.reorderFields(names);
    }

    return this;
  }

  makeFieldNonNull(fieldNameOrArray: string | Array<string>): DiscriminatorTypeComposer<TContext> {
    super.makeFieldNonNull(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.makeFieldNonNull(fieldNameOrArray);
    }

    return this;
  }

  makeFieldNullable(fieldNameOrArray: string | Array<string>): DiscriminatorTypeComposer<TContext> {
    super.makeFieldNullable(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.makeFieldNullable(fieldNameOrArray);
    }

    return this;
  }

  deprecateFields(
    fields: { [fieldName: string]: string } | string[] | string
  ): DiscriminatorTypeComposer<TContext> {
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
  addRelation(
    fieldName: string,
    relationOpts: RelationOpts<any, any>
  ): DiscriminatorTypeComposer<TContext> {
    super.addRelation(fieldName, relationOpts);

    for (const childTC of this.childTCs) {
      childTC.addRelation(fieldName, relationOpts);
    }

    return this;
  }

  setRecordIdFn(fn: GetRecordIdFn<any, any>): DiscriminatorTypeComposer<TContext> {
    super.setRecordIdFn(fn);

    for (const childTC of this.childTCs) {
      childTC.setRecordIdFn(fn);
    }

    return this;
  }

  /* eslint no-use-before-define: 0 */
  discriminator(childModel: Class<Model>, opts?: TypeConverterOpts): TypeComposerClass<TContext> {
    const customizationOpts = mergeCustomizationOptions((this.opts: any), opts);

    let childTC = composeWithMongoose(childModel, customizationOpts);

    childTC = composeChildTC(this, childTC, this.opts);

    this.schemaComposer.addSchemaMustHaveType(childTC);
    this.childTCs.push(childTC);

    return childTC;
  }
}
