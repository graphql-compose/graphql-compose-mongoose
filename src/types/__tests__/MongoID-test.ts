import mongoose from 'mongoose';
import { Kind } from 'graphql-compose/lib/graphql';
import GraphQLMongoID from '../MongoID';

const ObjectId = mongoose.Types.ObjectId;

describe('GraphQLMongoID', () => {
  describe('serialize', () => {
    it('pass ObjectId', () => {
      const id = new ObjectId('5a0d77aa7e65a808ad24937f');
      expect(GraphQLMongoID.serialize(id)).toBe('5a0d77aa7e65a808ad24937f');
    });

    it('pass String', () => {
      const id = '5a0d77aa7e65a808ad249000';
      expect(GraphQLMongoID.serialize(id)).toBe('5a0d77aa7e65a808ad249000');
    });
  });

  describe('parseValue', () => {
    it('pass ObjectId', () => {
      const id = new ObjectId('5a0d77aa7e65a808ad24937f');
      expect(GraphQLMongoID.parseValue(id)).toBe(id);
    });

    it('pass ObjectId as string', () => {
      const id = '5a0d77aa7e65a808ad249000';
      expect(GraphQLMongoID.parseValue(id)).toEqual(id);
    });

    it('pass integer', () => {
      const id = 123;
      expect(GraphQLMongoID.parseValue(id)).toEqual(id);
    });

    it('pass any custom string', () => {
      const id = 'custom_id';
      expect(GraphQLMongoID.parseValue(id)).toEqual(id);
    });
  });

  describe('parseLiteral', () => {
    it('parse a ast STRING literal', async () => {
      const ast = {
        kind: Kind.STRING,
        value: '5a0d77aa7e65a808ad249000',
      } as any;
      const id: any = GraphQLMongoID.parseLiteral(ast, {});
      expect(id).toEqual('5a0d77aa7e65a808ad249000');
    });

    it('parse a ast INT literal', async () => {
      const ast: any = {
        kind: Kind.INT,
        value: 123,
      };
      const id: any = GraphQLMongoID.parseLiteral(ast, {});
      expect(id).toEqual(123);
    });
  });
});
