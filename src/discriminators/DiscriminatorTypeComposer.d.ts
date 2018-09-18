import {
  ComposeFieldConfig,
  ComposeFieldConfigMap,
  EnumTypeComposer,
  GetRecordIdFn,
  InterfaceTypeComposer,
  RelationOpts,
  SchemaComposer,
  TypeComposer,
} from 'graphql-compose';
import { Document, Model } from 'mongoose';
import { TypeConverterOpts } from '../composeWithMongoose';

export type DiscriminatorOptions<TContext = any> = TypeConverterOpts<
  TContext
> & {
  reorderFields?: boolean | string[]; // true order: _id, DKey, DInterfaceFields, DiscriminatorFields
};

export class DiscriminatorTypeComposer<
  TBaseModel extends Document,
  TContext
> extends TypeComposer<TBaseModel, TContext> {
  public static schemaComposer: SchemaComposer<any>;

  private discriminatorKey: string;

  private DKeyETC: EnumTypeComposer;

  private opts: DiscriminatorOptions<TContext>;

  private DInterface: InterfaceTypeComposer<any>;

  private childTCs: Array<TypeComposer<any>>;

  public static createFromModel<TBModel extends Document, TCtx>(
    baseModel: Model<TBModel>,
    opts?: DiscriminatorOptions<TCtx>,
  ): DiscriminatorTypeComposer<TBModel, TCtx>;

  // ------------------------------------------------
  // DiscriminatorTypeComposer Specific methods
  // ------------------------------------------------
  public getDKey(): string;

  public getDKeyETC(): EnumTypeComposer;

  public getDInterface(): InterfaceTypeComposer<TBaseModel>;

  public hasChildTC(DName: string): boolean;

  public discriminator<TChildModel extends TBaseModel>(
    childModel: Model<TChildModel>,
    opts?: TypeConverterOpts<TContext>,
  ): TypeComposer<TChildModel, TContext>;

  // ------------------------------------------------
  // TypeComposer Overridden methods
  // ------------------------------------------------
  public setField(
    fieldName: string,
    fieldConfig: ComposeFieldConfig<TBaseModel, TContext>,
  ): this;

  public setField<TArgs>(
    fieldName: string,
    fieldConfig: ComposeFieldConfig<TBaseModel, TContext, TArgs>,
  ): this;

  public setFields(fields: ComposeFieldConfigMap<TBaseModel, TContext>): this;

  public setFields<TArgsMap>(
    fields: ComposeFieldConfigMap<TBaseModel, TContext, TArgsMap>,
  ): this;

  // discriminators must have all interface fields
  public addFields(
    newFields: ComposeFieldConfigMap<TBaseModel, TContext>,
  ): this;

  public addFields<TArgsMap>(
    newFields: ComposeFieldConfigMap<TBaseModel, TContext, TArgsMap>,
  ): this;

  public addNestedFields(
    newFields: ComposeFieldConfigMap<TBaseModel, TContext>,
  ): this;

  public addNestedFields<TArgsMap>(
    newFields: ComposeFieldConfigMap<TBaseModel, TContext, TArgsMap>,
  ): this;

  public removeField(fieldNameOrArray: string | string[]): this;

  public removeOtherFields(fieldNameOrArray: string | string[]): this;

  public extendField(
    fieldName: string,
    partialFieldConfig: ComposeFieldConfig<TBaseModel, TContext>,
  ): this;

  public reorderFields(names: string[]): this;

  public makeFieldNonNull(fieldNameOrArray: string | string[]): this;

  public makeFieldNullable(fieldNameOrArray: string | string[]): this;

  public deprecateFields(
    fields: { [fieldName: string]: string } | string[] | string,
  ): this;

  public addRelation(
    fieldName: string,
    relationOpts: RelationOpts<any, TBaseModel, TContext, any>,
  ): this;

  public addRelation<TRelationSource, TArgs>(
    fieldName: string,
    relationOpts: RelationOpts<TRelationSource, TBaseModel, TContext, TArgs>,
  ): this;

  public setRecordIdFn(fn: GetRecordIdFn<TBaseModel, TContext>): this;
}
