/* @flow */

import mongoose from 'mongoose';
import { GraphQLScalarType, Kind } from 'graphql-compose/lib/graphql';

const ObjectId = mongoose.Types.ObjectId;

const GraphQLMongoID = new GraphQLScalarType({
  name: 'MongoID',
  description:
    'The `ID` scalar type represents a unique MongoDB identifier in collection. ' +
    'MongoDB by default use 12-byte ObjectId value ' +
    '(https://docs.mongodb.com/manual/reference/bson-types/#objectid). ' +
    'But MongoDB also may accepts string or integer as correct values for _id field.',
  serialize: String,
  parseValue(value: any) {
    if (!ObjectId.isValid(value) && typeof value !== 'string') {
      throw new TypeError('Field error: value is an invalid ObjectId');
    }
    return value;
  },
  parseLiteral(ast) {
    return ast.kind === Kind.STRING || ast.kind === Kind.INT ? ast.value : null;
  },
});

export default GraphQLMongoID;
