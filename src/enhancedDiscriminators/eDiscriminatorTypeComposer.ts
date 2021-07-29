import { GraphQLInterfaceType } from 'graphql';
import {
  EnumTypeComposer,
  Extensions,
  InterfaceTypeComposer,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfig,
  ObjectTypeComposerFieldConfigDefinition,
  schemaComposer,
  SchemaComposer,
} from 'graphql-compose';
import { Document, Model, Schema } from 'mongoose';
import { convertModelToGraphQL, MongoosePseudoModelT } from '../fieldsConverter';
import { composeMongoose, ComposeMongooseOpts, GenerateResolverType } from '../composeMongoose';

export function convertModelToGraphQLWithDiscriminators<TDoc extends Document, TContext>(
  model: Model<TDoc> | MongoosePseudoModelT,
  typeName: string,
  schemaComposer: SchemaComposer<TContext>,
  opts: ComposeMongooseOpts<any> = {}
): ObjectTypeComposer<TDoc, TContext> | InterfaceTypeComposer<TDoc, TContext> {
  const sc = schemaComposer;

  // workaround to avoid recursive loop on convertModel and support nested discrim fields, will be set true in nested fields
  // if includeNestedDiscriminators is true to indicate that convertModel should invoke this method
  opts.includeBaseDiscriminators = false;

  if (!((model as Model<any, any>).discriminators || model.schema.discriminators)) {
    return convertModelToGraphQL(model, typeName, sc, opts);
  } else {
    return EDiscriminatorTypeComposer.createFromModel(model as Model<any, any>, typeName, sc, opts);
  }
}

export interface ComposeMongooseDiscriminatorsOpts<TContext> extends ComposeMongooseOpts<TContext> {
  reorderFields?: boolean | string[]; // true order: _id, DKey, DInterfaceFields, DiscriminatorFields
}

export class EDiscriminatorTypeComposer<TSource, TContext> extends InterfaceTypeComposer<
  TSource,
  TContext
> {
  discriminatorKey: string = '';
  discrimTCs: {
    [key: string]:
      | (ObjectTypeComposer<any, TContext> & {
          mongooseResolvers: GenerateResolverType<any, TContext>;
        })
      | ObjectTypeComposer<any, TContext>;
  } = {};

  DInputObject: ObjectTypeComposer<TSource, TContext>;
  opts: ComposeMongooseDiscriminatorsOpts<TContext> = {};
  DKeyETC?: EnumTypeComposer<TContext>;

  constructor(gqType: GraphQLInterfaceType, schemaComposer: SchemaComposer<TContext>) {
    super(gqType, schemaComposer);

    this.DInputObject = schemaComposer.getOrCreateOTC(`${gqType.name}Input`);
    return this;
  }

  static createFromModel<TSrc = any, TCtx = any>(
    model: Model<any, any>,
    typeName: string,
    schemaComposer: SchemaComposer<TCtx>,
    opts: ComposeMongooseDiscriminatorsOpts<any>
  ): EDiscriminatorTypeComposer<TSrc, TCtx> {
    if (!((model as Model<any, any>).discriminators || model.schema.discriminators)) {
      throw Error('Discriminators should be present to use this function');
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

    const baseTC = convertModelToGraphQL(
      model,
      `${typeName}BaseOTC`,
      schemaComposer,
      opts
    ) as ObjectTypeComposer;

    const eDTC = new EDiscriminatorTypeComposer(
      new GraphQLInterfaceType({
        name: typeName,
        fields: () => ({}),
      }),
      schemaComposer
    );

    eDTC.opts = { ...opts };
    eDTC.discriminatorKey = (model as any).schema.get('discriminatorKey') || '__t';
    if (eDTC.discriminatorKey === '__t') {
      throw Error(
        'A custom discriminator key must be set on the model options in mongoose for discriminator behaviour to function correctly'
      );
    }
    eDTC._buildDiscriminatedInterface(model, baseTC);
    eDTC.setInputTypeComposer(eDTC.DInputObject.getInputTypeComposer());

    // eDTC.setInterfaces([eDTC.DInterface]);
    eDTC._gqcInputTypeComposer = eDTC.DInputObject._gqcInputTypeComposer;

    // reorderFields(eDTC, eDTC.opts.reorderFields, eDTC.discriminatorKey);
    eDTC.schemaComposer.addSchemaMustHaveType(eDTC as any);

    // prepare Base Resolvers
    // prepareBaseResolvers(eDTC);

    // cleanup baseTC
    schemaComposer.delete(baseTC.getTypeName());
    return eDTC as any;
  }

  _buildDiscriminatedInterface(
    model: Model<any, any>,
    baseTC: ObjectTypeComposer<any, TContext>
  ): EDiscriminatorTypeComposer<TSource, TContext> {
    this.removeOtherFields('');
    this.setFields(baseTC.getFields());
    this.DInputObject.setFields(baseTC.getFields());

    const discriminators = model.discriminators || model.schema.discriminators;

    if (!discriminators) {
      throw Error('Discriminators should be present to use this function');
    }

    Object.keys(discriminators).forEach((key) => {
      if (!discriminators[key]) {
        throw Error(
          `Discriminator Model of ${model.name} missing for discriminator with key of ${key}`
        );
      }

      const discrimType = discriminators[key];

      // help why instanceof Schema not work??
      const discrimTC = ((discrimType as any)?.__proto__?.constructor.name === 'Schema'
        ? convertModelToGraphQL(
            { schema: discrimType as Schema },
            this.getTypeName() + key,
            schemaComposer,
            {
              ...this.opts,
              name: this.getTypeName() + key,
            }
          )
        : composeMongoose(discrimType as Model<any>, {
            ...this.opts,
            name: this.getTypeName() + key,
          })) as ObjectTypeComposer;

      // base OTC used for input schema must hold all child TC fields in the most loose way (so all types are accepted)
      // more detailed type checks are done on input object by mongoose itself
      // TODO - Review when Input Unions/similar are accepted into the graphQL spec and supported by graphql-js
      // SEE - https://github.com/graphql/graphql-spec/blob/main/rfcs/InputUnion.md
      const discrimFields = discrimTC.getFields();

      // add each field to Input Object TC
      Object.keys(discrimFields).forEach((fieldName) => {
        const field = discrimFields[fieldName];
        this._addFieldToInputOTC(fieldName, field);
      });

      this.DInputObject.makeFieldNullable(
        discrimTC.getFieldNames().filter((field) => !baseTC.hasField(field))
      );

      this.addTypeResolver(discrimTC, (obj: any) => obj[this.discriminatorKey] === key);

      // also set fields on master TC so it will have all possibilities for input workaround

      // add TC to discrimTCs
      this.discrimTCs[key] = discrimTC;
    });

    return this;
  }

  _addFieldToInputOTC(
    fieldName: string,
    field: ObjectTypeComposerFieldConfig<any, any, any>
  ): void {
    // if another discrimTC has already defined the field (not from original TC)
    if (this.DInputObject.hasField(fieldName) && !this.hasField(fieldName)) {
      this.DInputObject.setField(fieldName, `JSON`);
    } else {
      (this.DInputObject as ObjectTypeComposer<any, any>).setField(fieldName, field);
    }
    // there may be issues for discriminated types with overlapping fields, the last validation req will overwrite prior one
    // mitigation attempted by setting type to any on filed which appears in multiple implementations
  }

  getDKey(): string {
    return this.discriminatorKey;
  }

  // getDKeyETC(): EnumTypeComposer<TContext> {
  //   return this.DKeyETC as any;
  // }

  getDInputObject(): ObjectTypeComposer<TSource, TContext> {
    return this.DInputObject as any;
  }

  getDiscriminatorTCs(): {
    [key: string]: ObjectTypeComposer<any, TContext> & {
      mongooseResolvers: GenerateResolverType<any, TContext>;
    };
  } {
    // check if mongooseResolvers are present (assume on one = on all)
    if ((this.discrimTCs[Object.keys(this.discrimTCs)[0]] as any).mongooseResolvers) {
      return this.discrimTCs as any;
    } else {
      return {};
    }
  }

  // OVERRIDES

  setField(
    fieldName: string,
    fieldConfig: ObjectTypeComposerFieldConfigDefinition<any, any>
  ): this {
    super.setField(fieldName, fieldConfig);
    this.getDInputObject().setField(fieldName, fieldConfig);

    for (const discrimTC in this.discrimTCs) {
      this.discrimTCs[discrimTC].setField(fieldName, fieldConfig);
    }

    return this;
  }

  setExtensions(extensions: Extensions): this {
    super.setExtensions(extensions);
    this.getDInputObject().setExtensions(extensions);

    for (const discrimTC in this.discrimTCs) {
      this.discrimTCs[discrimTC].setExtensions(extensions);
    }

    return this;
  }

  setDescription(description: string): this {
    super.setDescription(description);
    this.getDInputObject().setDescription(description);

    return this;
  }

  removeField(fieldNameOrArray: string | Array<string>): this {
    super.removeField(fieldNameOrArray);
    this.getDInputObject().removeField(fieldNameOrArray);

    for (const discrimTC in this.discrimTCs) {
      this.discrimTCs[discrimTC].removeField(fieldNameOrArray);
    }

    return this;
  }

  removeOtherFields(fieldNameOrArray: string | Array<string>): this {
    // get field names to delete from child TCs, so their unique fields are preserved
    const keepFieldNames =
      fieldNameOrArray instanceof Array ? fieldNameOrArray : [fieldNameOrArray];
    const fieldNamesToDelete = this.getFieldNames().filter(
      (field) => !keepFieldNames.includes(field)
    );

    super.removeField(fieldNamesToDelete);
    this.getDInputObject().removeField(fieldNamesToDelete);

    for (const discrimTC in this.discrimTCs) {
      this.discrimTCs[discrimTC].removeField(fieldNamesToDelete);
    }

    return this;
  }

  reorderFields(names: string[]): this {
    super.reorderFields(names);
    this.getDInputObject().reorderFields(names);

    for (const discrimTC in this.discrimTCs) {
      this.discrimTCs[discrimTC].reorderFields(names);
    }

    return this;
  }

  makeFieldNonNull(fieldNameOrArray: string | Array<string>): this {
    super.makeFieldNonNull(fieldNameOrArray);
    this.getDInputObject().makeFieldNonNull(fieldNameOrArray);

    for (const discrimTC in this.discrimTCs) {
      this.discrimTCs[discrimTC].makeFieldNonNull(fieldNameOrArray);
    }

    return this;
  }

  makeFieldNullable(fieldNameOrArray: string | Array<string>): this {
    super.makeFieldNullable(fieldNameOrArray);
    this.getDInputObject().makeFieldNullable(fieldNameOrArray);

    for (const discrimTC in this.discrimTCs) {
      this.discrimTCs[discrimTC].makeFieldNullable(fieldNameOrArray);
    }

    return this;
  }
}
