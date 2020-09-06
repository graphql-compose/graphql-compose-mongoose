import DataLoader, { BatchLoadFn } from 'dataloader';
import { GraphQLResolveInfo } from 'graphql-compose/lib/graphql';

export function getDataLoader(
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  batchLoadFn: BatchLoadFn<any, any>
): DataLoader<any, any> {
  if (!context._gqlDataLoaders) context._gqlDataLoaders = new WeakMap();
  const { _gqlDataLoaders } = context;

  // for different parts of GraphQL queries, key will be new
  const dlKey = info.fieldNodes;

  // get or create DataLoader in GraphQL context
  let dl: DataLoader<any, any> = _gqlDataLoaders.get(dlKey);
  if (!dl) {
    dl = new DataLoader(async (ids) => {
      const result = await batchLoadFn(ids);
      // return docs in the same order as were provided their ids
      return ids.map((id) =>
        (result as any).find((d: any) => {
          if (d?._id?.equals) {
            // compare correctly MongoIDs via ObjectID.equals() method
            return d._id.equals(id);
          }
          return d._id === id;
        })
      );
    });
    _gqlDataLoaders.set(dlKey, dl);
  }
  return dl;
}
