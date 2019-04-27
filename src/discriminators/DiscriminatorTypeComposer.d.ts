import {
  ObjectTypeComposerFieldConfigDefinition,
  ObjectTypeComposerFieldConfigMapDefinition,
  ObjectTypeComposerFieldConfigAsObjectDefinition,
  EnumTypeComposer,
  ObjectTypeComposerGetRecordIdFn,
  InterfaceTypeComposer,
  ObjectTypeComposerRelationOpts,
  SchemaComposer,
  ObjectTypeComposer,
} from 'graphql-compose';
import { Document, Model } from 'mongoose';
import { ComposeWithMongooseOpts } from '../composeWithMongoose';

export type ComposeWithMongooseDiscriminatorsOpts<
  TContext = any
> = ComposeWithMongooseOpts<TContext> & {
  reorderFields?: boolean | string[]; // true order: _id, DKey, DInterfaceFields, DiscriminatorFields
};

export class DiscriminatorTypeComposer<
  TBaseModel extends Document,
  TContext
> extends ObjectTypeComposer<TBaseModel, TContext> {
  public static schemaComposer: SchemaComposer<any>;

  private discriminatorKey: string;

  private DKeyETC: EnumTypeComposer;

  private opts: ComposeWithMongooseDiscriminatorsOpts<TContext>;

  private DInterface: InterfaceTypeComposer<any>;

  private childTCs: Array<ObjectTypeComposer<any>>;

  public static createFromModel<TBModel extends Document, TCtx>(
    baseModel: Model<TBModel>,
    opts?: ComposeWithMongooseDiscriminatorsOpts<TCtx>,
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
    opts?: ComposeWithMongooseOpts<TContext>,
  ): ObjectTypeComposer<TChildModel, TContext>;

  // ------------------------------------------------
  // ObjectTypeComposer Overridden methods
  // ------------------------------------------------
  public setField(
    fieldName: string,
    fieldConfig: ObjectTypeComposerFieldConfigDefinition<TBaseModel, TContext>,
  ): this;

  public setField<TArgs>(
    fieldName: string,
    fieldConfig: ObjectTypeComposerFieldConfigDefinition<
      TBaseModel,
      TContext,
      TArgs
    >,
  ): this;

  public setFields(
    fields: ObjectTypeComposerFieldConfigMapDefinition<TBaseModel, TContext>,
  ): this;

  public setFields(
    fields: ObjectTypeComposerFieldConfigMapDefinition<TBaseModel, TContext>,
  ): this;

  // discriminators must have all interface fields
  public addFields(
    newFields: ObjectTypeComposerFieldConfigMapDefinition<TBaseModel, TContext>,
  ): this;

  public addFields(
    newFields: ObjectTypeComposerFieldConfigMapDefinition<TBaseModel, TContext>,
  ): this;

  public addNestedFields(
    newFields: ObjectTypeComposerFieldConfigMapDefinition<TBaseModel, TContext>,
  ): this;

  public addNestedFields(
    newFields: ObjectTypeComposerFieldConfigMapDefinition<TBaseModel, TContext>,
  ): this;

  public removeField(fieldNameOrArray: string | string[]): this;

  public removeOtherFields(fieldNameOrArray: string | string[]): this;

  public extendField(
    fieldName: string,
    partialFieldConfig: Partial<
      ObjectTypeComposerFieldConfigAsObjectDefinition<TBaseModel, TContext>
    >,
  ): this;

  public reorderFields(names: string[]): this;

  public makeFieldNonNull(fieldNameOrArray: string | string[]): this;

  public makeFieldNullable(fieldNameOrArray: string | string[]): this;

  public deprecateFields(
    fields: { [fieldName: string]: string } | string[] | string,
  ): this;

  public addRelation(
    fieldName: string,
    ObjectTypeComposerRelationOpts: ObjectTypeComposerRelationOpts<
      any,
      TBaseModel,
      TContext,
      any
    >,
  ): this;

  public addRelation<TRelationSource, TArgs>(
    fieldName: string,
    ObjectTypeComposerRelationOpts: ObjectTypeComposerRelationOpts<
      TRelationSource,
      TBaseModel,
      TContext,
      TArgs
    >,
  ): this;

  public setRecordIdFn(
    fn: ObjectTypeComposerGetRecordIdFn<TBaseModel, TContext>,
  ): this;
}
