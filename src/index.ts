import { composeWithMongoose } from './composeWithMongoose';
import GraphQLMongoID from './types/MongoID';
import GraphQLBSONDecimal from './types/BSONDecimal';

export default composeWithMongoose;

export * from './composeWithMongoose';
export * from './composeWithMongooseDiscriminators';
export * from './fieldsConverter';
export * from './resolvers';
export * from './errors';
export { GraphQLMongoID, GraphQLBSONDecimal };
