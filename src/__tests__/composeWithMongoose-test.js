/* eslint-disable no-unused-expressions */

import { expect } from 'chai';
import { UserModel } from '../__mocks__/userModel.js';
import { composeWithMongoose } from '../composeWithMongoose';
import { TypeComposer, InputTypeComposer } from 'graphql-compose';
import typeStorage from '../typeStorage';

describe('composeWithMongoose ->', () => {
  beforeEach(() => {
    typeStorage.clear();
  });

  describe('mongooseModelToTypeComposer()', () => {
    describe('basics', () => {
      it('should return TypeComposer', () => {
        expect(composeWithMongoose(UserModel)).instanceof(TypeComposer);
        expect(composeWithMongoose(UserModel, { name: 'Ok' })).instanceof(TypeComposer);
      });

      it('should set type name from model or opts.name', () => {
        expect(composeWithMongoose(UserModel).getTypeName())
          .equal(UserModel.modelName);
        expect(composeWithMongoose(UserModel, { name: 'Ok' }).getTypeName())
          .equal('Ok');
      });

      it('should set description from opts.description', () => {
        const description = 'This is model from mongoose';
        expect(composeWithMongoose(UserModel, { description }).getDescription())
          .equal(description);
      });

      it('should get fields from mongoose model', () => {
        const tc = composeWithMongoose(UserModel);
        expect(tc.getFields()).to.contain.keys(['_id', 'name', 'gender', 'age']);
      });
    });

    describe('filterFields()', () => {
      it('should proceed opts.fields.remove', () => {
        const tc = composeWithMongoose(UserModel, {
          fields: {
            remove: ['name', 'gender'],
          },
        });
        expect(tc.getFields()).to.not.contain.keys(['name', 'gender']);
        expect(tc.getFields()).to.contain.keys(['_id', 'age']);
      });

      it('should proceed opts.fields.only', () => {
        const tc = composeWithMongoose(UserModel, {
          fields: {
            only: ['name', 'gender'],
          },
        });
        expect(tc.getFields()).to.have.all.keys(['name', 'gender']);
      });
    });

    describe('createInputType()', () => {
      it('should be availiable InputTypeComposer', () => {
        const inputTypeComposer = composeWithMongoose(UserModel).getInputTypeComposer();
        expect(inputTypeComposer).instanceof(InputTypeComposer);
      });

      it('should set type name opts.inputType.name', () => {
        const inputTypeComposer = composeWithMongoose(UserModel, {
          inputType: {
            name: 'GreatUserInput',
          },
        }).getInputTypeComposer();

        expect(inputTypeComposer.getTypeName())
          .equal('GreatUserInput');
      });

      it('should set description from opts.inputType.name', () => {
        const inputTypeComposer = composeWithMongoose(UserModel, {
          inputType: {
            description: 'type for input data',
          },
        }).getInputTypeComposer();

        expect(inputTypeComposer.getDescription())
          .equal('type for input data');
      });

      it('should proceed opts.inputType.fields.remove', () => {
        const inputTypeComposer = composeWithMongoose(UserModel, {
          inputType: {
            fields: {
              remove: ['name', 'gender'],
            },
          },
        }).getInputTypeComposer();

        expect(inputTypeComposer.getFields()).to.not.contain.keys(['name', 'gender']);
        expect(inputTypeComposer.getFields()).to.contain.keys(['_id', 'age']);
      });

      it('should proceed opts.inputType.fields.only', () => {
        const inputTypeComposer = composeWithMongoose(UserModel, {
          inputType: {
            fields: {
              only: ['name', 'gender'],
            },
          },
        }).getInputTypeComposer();

        expect(inputTypeComposer.getFields()).to.have.all.keys(['name', 'gender']);
      });

      it('should proceed opts.inputType.fields.required', () => {
        const inputTypeComposer = composeWithMongoose(UserModel, {
          inputType: {
            fields: {
              required: ['name', 'gender'],
            },
          },
        }).getInputTypeComposer();

        expect(inputTypeComposer.isFieldRequired('name')).to.be.true;
        expect(inputTypeComposer.isFieldRequired('gender')).to.be.true;
        expect(inputTypeComposer.isFieldRequired('age')).to.be.false;
      });
    });

    describe('createResolvers()', () => {
      it('should not be called if opts.resolvers === false', () => {
        const tc = composeWithMongoose(UserModel, { resolvers: false });
        expect(tc.getResolvers().getKeys()).is.empty;
      });

      it('should be called if opts.resolvers not exists or has value', () => {
        const tc = composeWithMongoose(UserModel);
        expect(tc.getResolvers().getKeys()).is.not.empty;
        const tc2 = composeWithMongoose(UserModel, { resolvers: {} });
        expect(tc2.getResolvers().getKeys()).is.not.empty;
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
        const resolverKeys = tc2.getResolvers().getKeys();
        expect(resolverKeys).to.not.include('removeById');
        expect(resolverKeys).include.members(['findMany', 'updateOne', 'updateMany']);
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
      const filterArgInFindOne = typeComposer.getResolver('findOne').getArg('filter');
      const inputConposer = new InputTypeComposer(filterArgInFindOne.type);
      expect(inputConposer.isFieldRequired('age')).to.be.true;
    });
  });
});
