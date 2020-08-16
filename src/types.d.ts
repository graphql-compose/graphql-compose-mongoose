declare module 'graphql-compose-connection' {
  import { ProjectionType } from 'graphql-compose';
  import { GraphQLResolveInfo } from 'graphql-compose/lib/graphql';

  export type ConnectionSortOpts = {
    value: any;
    cursorFields: string[];
    beforeCursorQuery: (
      rawQuery: any,
      cursorData: CursorDataType,
      resolveParams: ConnectionResolveParams<any>
    ) => any;
    afterCursorQuery: (
      rawQuery: any,
      cursorData: CursorDataType,
      resolveParams: ConnectionResolveParams<any>
    ) => any;
  };

  export type ConnectionSortMapOpts = {
    [sortName: string]: ConnectionSortOpts;
  };

  export type ConnectionResolveParams<TContext> = {
    source: any;
    args: {
      first?: number | null;
      after?: string;
      last?: number | null;
      before?: string;
      sort?: ConnectionSortOpts;
      filter?: { [fieldName: string]: any };
      [argName: string]: any;
    };
    context: TContext;
    info: GraphQLResolveInfo;
    projection: Partial<ProjectionType>;
    [opt: string]: any;
  };

  export type CursorDataType =
    | {
        [fieldName: string]: any;
      }
    | any;
}
