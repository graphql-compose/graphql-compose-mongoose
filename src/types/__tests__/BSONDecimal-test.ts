import mongoose from 'mongoose';
import { Kind } from 'graphql-compose/lib/graphql';
import GraphQLBSONDecimal from '../BSONDecimal';

const Decimal128 = mongoose.Types.Decimal128;

describe('GraphQLBSONDecimal', () => {
  describe('serialize', () => {
    it('pass Decimal128', () => {
      const amount = Decimal128.fromString('90000000000000000000000000000000.09');
      expect(GraphQLBSONDecimal.serialize(amount)).toBe('90000000000000000000000000000000.09');
    });

    it('pass String', () => {
      const amount = '90000000000000000000000000000000.09';
      expect(GraphQLBSONDecimal.serialize(amount)).toBe('90000000000000000000000000000000.09');
    });
  });

  describe('parseValue', () => {
    it('pass Decimal128', () => {
      const amount = Decimal128.fromString('90000000000000000000000000000000.09');
      expect(GraphQLBSONDecimal.parseValue(amount)).toBeInstanceOf(Decimal128);
    });

    it('pass String', () => {
      const amount = '90000000000000000000000000000000.09';
      expect(GraphQLBSONDecimal.parseValue(amount)).toBeInstanceOf(Decimal128);
    });

    it('pass Integer', () => {
      const amount = 123;
      expect(GraphQLBSONDecimal.parseValue(amount)).toBeInstanceOf(Decimal128);
    });

    it('pass any custom string value', () => {
      const id = 'custom_id';
      expect(() => GraphQLBSONDecimal.parseValue(id)).toThrow('not a valid Decimal128 string');
    });
  });

  describe('parseLiteral', () => {
    it('parse a ast STRING literal', async () => {
      const ast = {
        kind: Kind.STRING,
        value: '90000000000000000000000000000000.09',
      };
      const amount: any = GraphQLBSONDecimal.parseLiteral(ast, {});
      expect(amount).toBeInstanceOf(Decimal128);
      expect(amount.toString()).toEqual('90000000000000000000000000000000.09');
    });

    it('parse a ast INT literal', async () => {
      const ast: any = {
        kind: Kind.INT,
        value: '123',
      };
      const amount: any = GraphQLBSONDecimal.parseLiteral(ast, {});
      expect(amount).toBeInstanceOf(Decimal128);
      expect(amount.toString()).toEqual('123');
    });
  });
});
