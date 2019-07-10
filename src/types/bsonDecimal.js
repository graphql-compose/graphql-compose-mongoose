/* @flow */

import mongoose from 'mongoose';
import { GraphQLScalarType, Kind } from 'graphql-compose/lib/graphql';

const Decimal128 = mongoose.Types.Decimal128;

const GraphQLBSONDecimal = new GraphQLScalarType({
  name: 'BSONDecimal',
  description:
    'The `Decimal` scalar type uses the IEEE 754 decimal128 ' +
    'decimal-based floating-point numbering format. ' +
    'Supports 34 decimal digits of precision, a max value of ' +
    'approximately 10^6145, and min value of approximately -10^6145',
  serialize: String,
  parseValue(value: any) {
    if (typeof value === 'string') {
      return Decimal128.fromString(value);
    }
    if (typeof value === 'number') {
      return Decimal128.fromString(value.toString());
    }
    if (value instanceof Decimal128) {
      return value;
    }
    throw new TypeError('Field error: value is an invalid Decimal');
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
      return Decimal128.fromString(ast.value);
    }
    return null;
  },
});

export default GraphQLBSONDecimal;
