/* @flow */
/* eslint-disable no-unused-expressions */

import mongoose from 'mongoose';
import { ObjectTypeComposer, InputTypeComposer, schemaComposer } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql-compose/lib/graphql';
import { UserModel } from '../__mocks__/userModel';
import { composeWithMongoose } from '../composeWithMongoose';
import GraphQLMongoID from '../types/mongoid';

beforeAll(() => UserModel.base.connect());
afterAll(() => UserModel.base.disconnect());

describe('composeWithMongoose ->', () => {
  beforeEach(() => {
    schemaComposer.clear();
  });

  describe('MongooseModelToTypeComposer()', () => {
    describe('basics', () => {
      it('should return ObjectTypeComposer', () => {
        expect(composeWithMongoose(UserModel)).toBeInstanceOf(ObjectTypeComposer);
        expect(composeWithMongoose(UserModel, { name: 'Ok' })).toBeInstanceOf(ObjectTypeComposer);
      });

      it('should set type name from model or opts.name', () => {
        expect(composeWithMongoose(UserModel).getTypeName()).toBe(UserModel.modelName);

        schemaComposer.clear();
        expect(composeWithMongoose(UserModel, { name: 'Ok' }).getTypeName()).toBe('Ok');
      });

      it('should set description from opts.description', () => {
        const description = 'This is model from mongoose';
        expect(composeWithMongoose(UserModel, { description }).getDescription()).toBe(description);
      });

      it('should get fields from mongoose model', () => {
        const tc = composeWithMongoose(UserModel);
        expect(tc.getFieldNames()).toEqual(
          expect.arrayContaining(['_id', 'name', 'gender', 'age'])
        );
      });

      it('should have NonNull _id field', () => {
        const tc: any = composeWithMongoose(UserModel);
        expect(tc.getFieldType('_id')).toBeInstanceOf(GraphQLNonNull);
        expect(tc.getFieldType('_id').ofType).toBe(GraphQLMongoID);
      });

      it('composeWithMongoose should generate new ObjectTypeComposer (without cache)', () => {
        const tc1: any = composeWithMongoose(UserModel);
        schemaComposer.clear();
        const tc2: any = composeWithMongoose(UserModel);
        expect(tc1).not.toBe(tc2);
      });
    });

    describe('filterFields()', () => {
      it('should proceed opts.fields.remove', () => {
        const tc = composeWithMongoose(UserModel, {
          fields: {
            remove: ['name', 'gender'],
          },
        });

        expect(tc.getFieldNames()).not.toEqual(expect.arrayContaining(['name', 'gender']));
        expect(tc.getFieldNames()).toEqual(expect.arrayContaining(['_id', 'age']));
      });

      it('should proceed opts.fields.only', () => {
        const tc = composeWithMongoose(UserModel, {
          fields: {
            only: ['name', 'gender'],
          },
        });
        expect(tc.getFieldNames()).toEqual(expect.arrayContaining(['name', 'gender']));
      });
    });

    describe('createInputType()', () => {
      it('should be availiable InputTypeComposer', () => {
        const itc = composeWithMongoose(UserModel).getInputTypeComposer();
        expect(itc).toBeInstanceOf(InputTypeComposer);
      });

      it('should set type name opts.inputType.name', () => {
        const itc = composeWithMongoose(UserModel, {
          inputType: {
            name: 'GreatUserInput',
          },
        }).getInputTypeComposer();

        expect(itc.getTypeName()).toBe('GreatUserInput');
      });

      it('should set description from opts.inputType.name', () => {
        const itc = composeWithMongoose(UserModel, {
          inputType: {
            description: 'type for input data',
          },
        }).getInputTypeComposer();

        expect(itc.getDescription()).toBe('type for input data');
      });

      it('should proceed opts.inputType.fields.remove', () => {
        const itc = composeWithMongoose(UserModel, {
          inputType: {
            fields: {
              remove: ['name', 'gender'],
            },
          },
        }).getInputTypeComposer();

        expect(itc.getFieldNames()).not.toEqual(expect.arrayContaining(['name', 'gender']));
        expect(itc.getFieldNames()).toEqual(expect.arrayContaining(['_id', 'age']));
      });

      it('should proceed opts.inputType.fields.only', () => {
        const itc = composeWithMongoose(UserModel, {
          inputType: {
            fields: {
              only: ['name', 'gender'],
            },
          },
        }).getInputTypeComposer();

        expect(itc.getFieldNames()).toEqual(expect.arrayContaining(['name', 'gender']));
      });

      it('should proceed opts.inputType.fields.required', () => {
        const itc = composeWithMongoose(UserModel, {
          inputType: {
            fields: {
              required: ['name', 'gender'],
            },
          },
        }).getInputTypeComposer();

        expect(itc.isFieldNonNull('name')).toBe(true);
        expect(itc.isFieldNonNull('gender')).toBe(true);
        expect(itc.isFieldNonNull('age')).toBe(false);
      });
    });

    describe('createResolvers()', () => {
      it('should not be called if opts.resolvers === false', () => {
        const tc = composeWithMongoose(UserModel, { resolvers: false });
        expect(Array.from(tc.getResolvers().keys())).toHaveLength(0);
      });

      it('should be called if opts.resolvers not exists or has value', () => {
        const tc = composeWithMongoose(UserModel);
        expect(Array.from(tc.getResolvers().keys())).not.toHaveLength(0);
        const tc2 = composeWithMongoose(UserModel, { resolvers: {}, name: 'User2' });
        expect(Array.from(tc2.getResolvers().keys())).not.toHaveLength(0);
      });

      it('should not provide resolver if opts.resolvers.[resolverName] === false', () => {
        const tc2 = composeWithMongoose(UserModel, {
          resolvers: {
            removeById: false,
            findMany: {},
            updateOne: {
              some: 123,
            },
          },
        });
        const resolverKeys = Array.from(tc2.getResolvers().keys());
        expect(resolverKeys).not.toContain('removeById');
        expect(resolverKeys).toEqual(
          expect.arrayContaining(['findMany', 'updateOne', 'updateMany'])
        );
      });
    });
  });

  describe('3rd party resolvers', () => {
    describe('graphql-compose-connection', () => {
      it('should add `connection` resolver by default', () => {
        const tc2 = composeWithMongoose(UserModel);
        expect(tc2.getResolver('connection')).toBeDefined();
      });
    });

    describe('graphql-compose-pagination', () => {
      it('should add `pagination` resolver by default', () => {
        const tc2 = composeWithMongoose(UserModel);
        expect(tc2.getResolver('pagination')).toBeDefined();
      });

      it('should add `pagination` resolver with `perPage` option', () => {
        const tc2 = composeWithMongoose(UserModel, { resolvers: { pagination: { perPage: 333 } } });
        const resolver = tc2.getResolver('pagination');
        expect(resolver).toBeDefined();
        expect(resolver.getArgConfig('perPage').defaultValue).toBe(333);
      });
    });
  });

  describe('complex situations', () => {
    it('required input fields, should be passed down to resolvers', () => {
      const typeComposer = composeWithMongoose(UserModel, {
        inputType: {
          fields: {
            required: ['age'],
          },
        },
      });
      const filterArgInFindOne = typeComposer.getResolver('findOne').getArgITC('filter');
      expect(filterArgInFindOne.isFieldNonNull('age')).toBe(true);
    });

    it('should use cached type to avoid maximum call stack size exceeded', () => {
      const PersonSchema = new mongoose.Schema({
        name: String,
      });
      PersonSchema.add({
        spouse: PersonSchema,
        friends: [PersonSchema],
      });
      const PersonModel = mongoose.model('Person', PersonSchema);
      const tc = composeWithMongoose(PersonModel);
      expect(tc.getFieldNames()).toEqual(
        expect.arrayContaining(['_id', 'name', 'spouse', 'friends'])
      );
    });
  });
});
