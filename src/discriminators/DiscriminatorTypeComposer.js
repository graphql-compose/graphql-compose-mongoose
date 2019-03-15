/* @flow */

import {
  EnumTypeComposer,
  schemaComposer as globalSchemaComposer,
  SchemaComposer,
  ObjectTypeComposer,
  type InterfaceTypeComposer,
  type ComposeFieldConfig,
  type RelationOpts,
  type GetRecordIdFn,
  type ComposeFieldConfigMap,
} from 'graphql-compose';
import type { ComposeFieldConfigAsObject } from 'graphql-compose/lib/ObjectTypeComposer';
import type { Model } from 'mongoose';
import { composeWithMongoose, type TypeConverterOpts } from '../composeWithMongoose';
import { composeChildTC } from './composeChildTC';
import { mergeCustomizationOptions } from './utils/mergeCustomizationOptions';
import { prepareBaseResolvers } from './prepareBaseResolvers';
import { reorderFields } from './utils/reorderFields';

export type DiscriminatorOptions = {|
  reorderFields?: boolean | string[], // true order: _id, DKey, DInterfaceFields, DiscriminatorFields
  ...TypeConverterOpts<any>,
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
  discriminatorKey: string;

  DKeyETC: EnumTypeComposer<TContext>;

  opts: DiscriminatorOptions;

  DInterface: InterfaceTypeComposer<TSource, TContext>;

  childTCs: ObjectTypeComposer<any, TContext>[];

  static _getClassConnectedWithSchemaComposer(
    schemaComposer?: SchemaComposer<TContext>
  ): Class<DiscriminatorTypeComposer<TSource, TContext>> {
    class _DiscriminatorTypeComposer extends DiscriminatorTypeComposer<TSource, TContext> {
      static schemaComposer = schemaComposer || globalSchemaComposer;
    }

    return _DiscriminatorTypeComposer;
  }

  /* ::
  constructor(gqType: any, schemaComposer: SchemaComposer<TContext>): DiscriminatorTypeComposer<TSource, TContext> {
    super(gqType, schemaComposer);
    return this;
  }
  */

  static createFromModel(
    baseModel: Class<Model>,
    schemaComposer: SchemaComposer<TContext>,
    opts?: any
  ): DiscriminatorTypeComposer<TSource, TContext> {
    if (!baseModel || !(baseModel: any).discriminators) {
      throw Error('Discriminator Key not Set, Use composeWithMongoose for Normal Collections');
    }

    if (!(schemaComposer instanceof SchemaComposer)) {
      throw Error(
        'DiscriminatorTC.createFromModel() should recieve SchemaComposer in second argument'
      );
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
    const baseDTC = new _DiscriminatorTypeComposer(baseTC.getType(), schemaComposer);

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

  _createDInterface(
    baseTC: DiscriminatorTypeComposer<any, any>
  ): InterfaceTypeComposer<TSource, TContext> {
    return this.schemaComposer.createInterfaceTC({
      name: `${baseTC.getTypeName()}Interface`,

      resolveType: (value: any) => {
        const childDName = value[baseTC.getDKey()];

        if (childDName) {
          return baseTC.schemaComposer.getOTC(childDName).getType();
        }

        // as fallback return BaseModelTC
        return baseTC.schemaComposer.getOTC(baseTC.getTypeName()).getType();
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

  getDKeyETC(): EnumTypeComposer<TContext> {
    return this.DKeyETC;
  }

  getDInterface(): InterfaceTypeComposer<TSource, TContext> {
    return this.DInterface;
  }

  hasChildTC(DName: string): boolean {
    return !!this.childTCs.find(ch => ch.getTypeName() === DName);
  }

  setFields(fields: ComposeFieldConfigMap<any, any>): DiscriminatorTypeComposer<TSource, TContext> {
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
  ): DiscriminatorTypeComposer<TSource, TContext> {
    super.setField(fieldName, fieldConfig);

    for (const childTC of this.childTCs) {
      childTC.setField(fieldName, fieldConfig);
    }

    return this;
  }

  // discriminators must have all interface fields
  addFields(
    newFields: ComposeFieldConfigMap<any, any>
  ): DiscriminatorTypeComposer<TSource, TContext> {
    super.addFields(newFields);

    for (const childTC of this.childTCs) {
      childTC.addFields(newFields);
    }

    return this;
  }

  addNestedFields(
    newFields: ComposeFieldConfigMap<any, any>
  ): DiscriminatorTypeComposer<TSource, TContext> {
    super.addNestedFields(newFields);

    for (const childTC of this.childTCs) {
      childTC.addNestedFields(newFields);
    }

    return this;
  }

  removeField(
    fieldNameOrArray: string | Array<string>
  ): DiscriminatorTypeComposer<TSource, TContext> {
    super.removeField(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.removeField(fieldNameOrArray);
    }

    return this;
  }

  removeOtherFields(
    fieldNameOrArray: string | Array<string>
  ): DiscriminatorTypeComposer<TSource, TContext> {
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
    partialFieldConfig: $Shape<ComposeFieldConfigAsObject<any, TContext>>
  ): this {
    super.extendField(fieldName, partialFieldConfig);

    for (const childTC of this.childTCs) {
      childTC.extendField(fieldName, partialFieldConfig);
    }

    return this;
  }

  reorderFields(names: string[]): DiscriminatorTypeComposer<TSource, TContext> {
    super.reorderFields(names);

    for (const childTC of this.childTCs) {
      childTC.reorderFields(names);
    }

    return this;
  }

  makeFieldNonNull(
    fieldNameOrArray: string | Array<string>
  ): DiscriminatorTypeComposer<TSource, TContext> {
    super.makeFieldNonNull(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.makeFieldNonNull(fieldNameOrArray);
    }

    return this;
  }

  makeFieldNullable(
    fieldNameOrArray: string | Array<string>
  ): DiscriminatorTypeComposer<TSource, TContext> {
    super.makeFieldNullable(fieldNameOrArray);

    for (const childTC of this.childTCs) {
      childTC.makeFieldNullable(fieldNameOrArray);
    }

    return this;
  }

  deprecateFields(
    fields: { [fieldName: string]: string } | string[] | string
  ): DiscriminatorTypeComposer<TSource, TContext> {
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
    relationOpts: RelationOpts<any, any, any>
  ): DiscriminatorTypeComposer<TSource, TContext> {
    super.addRelation(fieldName, relationOpts);

    for (const childTC of this.childTCs) {
      childTC.addRelation(fieldName, relationOpts);
    }

    return this;
  }

  setRecordIdFn(fn: GetRecordIdFn<any, any>): DiscriminatorTypeComposer<TSource, TContext> {
    super.setRecordIdFn(fn);

    for (const childTC of this.childTCs) {
      childTC.setRecordIdFn(fn);
    }

    return this;
  }

  /* eslint no-use-before-define: 0 */
  discriminator<TSrc: Model>(
    childModel: Class<TSrc>,
    opts?: TypeConverterOpts<TContext>
  ): ObjectTypeComposer<TSrc, TContext> {
    const customizationOpts = mergeCustomizationOptions((this.opts: any), opts);

    let childTC = composeWithMongoose(childModel, customizationOpts);

    childTC = composeChildTC(this, childTC, this.opts);

    this.schemaComposer.addSchemaMustHaveType(childTC);
    this.childTCs.push(childTC);

    return childTC;
  }
}
