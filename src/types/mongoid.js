import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

const GraphQLMongoID = new GraphQLScalarType({
  name: 'MongoID',
  description:
    'The `ID` scalar type represents a unique MongoDB identifier in collection. ' +
    'MongoDB by default use 12-byte ObjectId value ' +
    '(https://docs.mongodb.com/manual/reference/bson-types/#objectid). ' +
    'But MongoDB also may accepts string or integer as correct values for _id field.',
  serialize: String,
  parseValue: String,
  parseLiteral(ast) {
    return ast.kind === Kind.STRING || ast.kind === Kind.INT ?
      ast.value :
      null;
  },
});

export default GraphQLMongoID;
