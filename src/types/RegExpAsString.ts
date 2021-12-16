import { GraphQLScalarType, Kind } from 'graphql-compose/lib/graphql';

function parseStringWithRegExp(str: string): RegExp {
  if (str.startsWith('/')) {
    const m = str.match(/^\/(.+)\/([gimsuy]*)$/);
    if (m) {
      return new RegExp(m[1], m[2]);
    }
    throw new TypeError('Field error: cannot parse provided string as RegExp object');
  } else {
    // simple regexp without expression flags
    return new RegExp(str);
  }
}

const GraphQLRegExpAsString = new GraphQLScalarType({
  name: 'RegExpAsString',
  specifiedByURL: 'http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-262.pdf',
  description:
    'The string representation of JavaScript regexp. You may provide it with flags "/^abc.*/i" or without flags like "^abc.*". More info about RegExp characters and flags: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions',
  serialize: String,
  parseValue(value: any) {
    if (typeof value !== 'string') {
      throw new TypeError(
        'Field error: GraphQL RegExpAsString value should be provided as a string'
      );
    }
    return parseStringWithRegExp(value);
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new TypeError(
        'Field error: GraphQL RegExpAsString value should be provided as a string'
      );
    }
    return parseStringWithRegExp(ast.value);
  },
});

export default GraphQLRegExpAsString;
