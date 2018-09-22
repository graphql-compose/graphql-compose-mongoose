import { GraphQLScalarType } from 'graphql-compose/lib/graphql';

export type MongoId = string | any;

declare const GraphQLMongoID: GraphQLScalarType;

export default GraphQLMongoID;
