import { Kind } from 'graphql-compose/lib/graphql';
import GraphQLRegExpAsString from '../RegExpAsString';

describe('GraphQLRegExpAsString', () => {
  describe('serialize', () => {
    it('pass RegExp without flags', () => {
      expect(GraphQLRegExpAsString.serialize(new RegExp('^Abc$'))).toBe('/^Abc$/');
      expect(GraphQLRegExpAsString.serialize(new RegExp(/^Abc$/))).toBe('/^Abc$/');
    });

    it('pass RegExp with flags', () => {
      expect(GraphQLRegExpAsString.serialize(new RegExp('^Abc$', 'gm'))).toBe('/^Abc$/gm');
    });

    it('pass as String', () => {
      expect(GraphQLRegExpAsString.serialize('abc')).toBe('abc');
    });
  });

  describe('parseValue', () => {
    it('pass as string', () => {
      expect(GraphQLRegExpAsString.parseValue('^Abc$')).toEqual(/^Abc$/);
      expect(GraphQLRegExpAsString.parseValue('/^Abc$/')).toEqual(/^Abc$/);
      expect(GraphQLRegExpAsString.parseValue('/^Abc$/gm')).toEqual(/^Abc$/gm);
      expect(GraphQLRegExpAsString.parseValue('so/me')).toEqual(/so\/me/);
    });

    it('pass as wrong type', () => {
      expect(() => GraphQLRegExpAsString.parseValue(123)).toThrow(
        'value should be provided as a string'
      );
    });
  });

  describe('parseLiteral', () => {
    it('parse a ast STRING literal', async () => {
      const ast = {
        kind: Kind.STRING,
        value: '^Abc$',
      };
      expect(GraphQLRegExpAsString.parseLiteral(ast, {})).toEqual(/^Abc$/);

      const ast2 = {
        kind: Kind.STRING,
        value: '/^Abc$/gm',
      };
      expect(GraphQLRegExpAsString.parseLiteral(ast2, {})).toEqual(/^Abc$/gm);
    });

    it('parse wrong ast literal', async () => {
      const ast: any = {
        kind: Kind.INT,
        value: 123,
      };
      expect(() => GraphQLRegExpAsString.parseLiteral(ast, {})).toThrow(
        'value should be provided as a string'
      );
    });
  });
});
