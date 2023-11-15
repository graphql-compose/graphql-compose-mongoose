import {
  ObjectTypeComposer,
  InterfaceTypeComposer,
  ComposeOutputTypeDefinition,
  ObjectTypeComposerFieldConfigMapDefinition,
  toInputType,
} from 'graphql-compose';

export type PayloadRecordIdHelperOpts = {
  /** Custom function for id generation. By default: `doc._id`. */
  fn?: (doc: any, context: any) => any;
  /** Custom output type for returned recordId */
  type?: string | ComposeOutputTypeDefinition<any>;
};

export function payloadRecordId<TSource = any, TContext = any>(
  tc: ObjectTypeComposer<TSource, TContext> | InterfaceTypeComposer<TSource, TContext>,
  opts?: PayloadRecordIdHelperOpts | false
): ObjectTypeComposerFieldConfigMapDefinition<TSource, TContext> | null {
  if (opts === false) return null;

  return {
    recordId: {
      description: 'Document ID',
      type: opts?.type ? opts.type : tc.hasField('_id') ? tc.getFieldTC('_id') : 'MongoID',
      resolve: (source, _, context) => {
        const doc = (source as any)?.record;
        if (!doc) return;
        return opts?.fn ? opts.fn(doc, context) : doc?._id;
      },
    },
  };
}

export type PayloadRecordIdsHelperOpts = {
  /** Custom function for id generation. By default: `doc._id`. */
  fn?: (docs: any, context: any) => any;
  /** Custom output type for returned recordIds */
  type?: string | ComposeOutputTypeDefinition<any>;
};

export function payloadRecordIds<TSource = any, TContext = any>(
  tc: ObjectTypeComposer<TSource, TContext> | InterfaceTypeComposer<TSource, TContext>,
  opts?: PayloadRecordIdHelperOpts | false
): ObjectTypeComposerFieldConfigMapDefinition<TSource, TContext> | null {
  if (opts === false) return null;

  return {
    recordIds: {
      description: 'Documents IDs',
      type: opts?.type
        ? opts.type
        : tc.hasField('_id')
          ? toInputType(tc.getFieldTC('_id')).NonNull.List.NonNull
          : '[MongoID!]!',
      resolve: (source, _, context) => {
        const docs = (source as any)?.records;
        if (opts?.fn) {
          return opts.fn(docs, context);
        }
        return docs ? docs.map((doc: any) => doc?._id) : [];
      },
    },
  };
}
