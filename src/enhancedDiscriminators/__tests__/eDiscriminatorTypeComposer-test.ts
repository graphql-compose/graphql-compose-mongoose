import { InterfaceTypeComposer, ObjectTypeComposer, schemaComposer } from 'graphql-compose';
import { getCharacterModels } from '../__mocks__/characterDiscrimModels';
import {
  composeMongoose as composeMongooseRaw,
  ComposeMongooseOpts,
  GenerateResolverType,
} from '../../composeMongoose';
import { EDiscriminatorTypeComposer } from '../eDiscriminatorTypeComposer';
import mongoose, { Document, Model, Schema } from 'mongoose';

const defaultDKey = 'type';
const { CharacterModel } = getCharacterModels(defaultDKey);

const dComposeOpts: ComposeMongooseOpts = {
  includeBaseDiscriminators: true,
  schemaComposer: schemaComposer,
};

const composeMongoose = <TDoc extends Document, TContext = any>(
  model: Model<TDoc>
): EDiscriminatorTypeComposer<TDoc, TContext> & {
  mongooseResolvers: GenerateResolverType<TDoc, TContext>;
} => {
  const generatedTC = composeMongooseRaw(model, dComposeOpts);

  if (!(generatedTC instanceof EDiscriminatorTypeComposer)) {
    throw new Error('Model should include discriminated schema for testing here');
  }

  return generatedTC;
};

let eDTC: EDiscriminatorTypeComposer<any, any>;
let DInputObject: ObjectTypeComposer<any, any>;

beforeEach(() => {
  eDTC = composeMongoose(CharacterModel);
  DInputObject = eDTC.getDInputObject();
});

afterEach(() => {
  eDTC.schemaComposer.clear();
});

describe('EDiscriminatorTypeComposer', () => {
  it('throws an error when default (__t) discriminator key is set', () => {
    eDTC.schemaComposer.clear();
    const { CharacterModel: noDKeyModel } = getCharacterModels(undefined, 'noDKeyCharacter');
    const errorCall = () => composeMongoose(noDKeyModel);
    expect(errorCall).toThrowError(
      'A custom discriminator key must be set on the model options in mongoose for discriminator behaviour to function correctly'
    );
  });

  it('should have type resolvers for discriminated models', () => {
    expect(eDTC.getTypeResolverNames()).toHaveLength(2);
  });

  it('should not be used on models without discriminators', () => {
    const { DroidModel } = getCharacterModels(undefined, 'noDiscrim');
    const noDiscrim = composeMongooseRaw(DroidModel, dComposeOpts);
    expect(noDiscrim instanceof EDiscriminatorTypeComposer).toBeFalsy();
  });

  describe('Custom Getters', () => {
    test('getting discriminator key', () => {
      expect(eDTC.getDKey()).toEqual(defaultDKey);
    });

    test('getting discriminator input object TC', () => {
      expect(eDTC.getDInputObject()).toBe(DInputObject);
    });
  });

  describe('createFromModel errors', () => {
    it('should throw an error if it is called with no discriminators present', () => {
      const fakeModel = mongoose.model(
        'fakeModelEDiscrim',
        new Schema({ test: String, thingy: Boolean })
      );

      const errorCall = () =>
        EDiscriminatorTypeComposer.createFromModel(fakeModel, 'noDiscrimType', schemaComposer, {});

      expect(errorCall).toThrowError('Discriminators should be present to use this function');
    });

    it('should throw an error if the schema composer is not valid', () => {
      const { CharacterModel: errorTestModel } = getCharacterModels('type', 'scErrorModel');

      const errorCall = () =>
        EDiscriminatorTypeComposer.createFromModel(errorTestModel, 'noSCType', {} as any, {});
      expect(errorCall).toThrowError(
        'DiscriminatorTC.createFromModel() should receive SchemaComposer in second argument'
      );
    });
  });

  describe('eDTC', () => {
    it('shares field names with base model used to compose it', () => {
      expect(eDTC.getFieldNames()).toEqual(
        expect.arrayContaining(
          Object.keys(CharacterModel.schema.paths).filter((x) => !x.startsWith('__'))
        )
      );
    });

    it('should be an instance of InterfaceTypeComposer', () => {
      expect(eDTC instanceof InterfaceTypeComposer).toBeTruthy();
    });

    it('should have the input TC from DInputObject as input TC', () => {
      expect(eDTC.getInputTypeComposer()).toEqual(eDTC.getDInputObject().getInputTypeComposer());
    });
  });

  describe('Get Discriminator TCs', () => {
    it('returns discrimTCs with mongooseResolvers present', () => {
      Object.values(eDTC.getDiscriminatorTCs()).forEach((discimTC) => {
        expect(discimTC).toHaveProperty('mongooseResolvers');
      });
    });
    it('returns empty object with mongooseResolvers missing', () => {
      (eDTC.discrimTCs[Object.keys(eDTC.discrimTCs)[0]] as any).mongooseResolvers = undefined;
      Object.values(eDTC.getDiscriminatorTCs()).forEach((discimTC) => {
        expect(discimTC).toHaveProperty('mongooseResolvers');
      });
    });
  });

  describe('Overridden eDTC Class Methods', () => {
    describe('Set Field', () => {
      it('updates field on all child TCs', () => {
        eDTC.setField('newField', 'String');
        expect(eDTC.hasField('newField')).toBeTruthy();
        expect(DInputObject.hasField('newField')).toBeTruthy();
        Object.values(eDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.hasField('newField')).toBeTruthy();
        });
      });

      it('updates input TC when field is added', () => {
        eDTC.setField('inputField', 'String');
        expect(schemaComposer.getIFTC(eDTC.getTypeName()).getInputTypeComposer()).toEqual(
          DInputObject.getInputTypeComposer()
        );
      });
    });

    describe('Set Extensions', () => {
      it('updates field on all child TCs', () => {
        eDTC.setExtensions({ newField: 'testExtension' });
        expect(eDTC.hasExtension('newField')).toBeTruthy();
        expect(DInputObject.hasExtension('newField')).toBeTruthy();
        Object.values(eDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.hasExtension('newField')).toBeTruthy();
        });
      });
    });

    describe('Remove Field', () => {
      it('deletes field on all child TCs', () => {
        eDTC.addFields({ toDelete: 'String' });
        // check field added
        expect(eDTC.hasField('toDelete')).toBeTruthy();
        expect(DInputObject.hasField('toDelete')).toBeTruthy();
        Object.values(eDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.hasField('toDelete')).toBeTruthy();
        });

        eDTC.removeField('toDelete');
        expect(eDTC.hasField('toDelete')).toBeFalsy();
        expect(DInputObject.hasField('toDelete')).toBeFalsy();
        Object.values(eDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.hasField('toDelete')).toBeFalsy();
        });
      });
    });

    describe('Remove Other Fields', () => {
      it('removes all other fields from base TC from all child TCs', () => {
        eDTC.addFields({ toKeep: 'String' });

        const otherFields = eDTC.getFieldNames().filter((field) => field !== 'toKeep');
        eDTC.removeOtherFields('toKeep');

        otherFields.forEach((removedField) => {
          expect(eDTC.hasField(removedField)).toBeFalsy();
          expect(DInputObject.hasField(removedField)).toBeFalsy();
          Object.values(eDTC.discrimTCs).forEach((dTC) => {
            expect(dTC.hasField(removedField)).toBeFalsy();
          });
        });
      });
    });

    describe('Reorder Fields', () => {
      it('reorders fields on all child TCs', () => {
        const fieldOrder = ['_id', 'appearsIn', 'friends', 'kind', 'type'];
        const fieldOrderString = fieldOrder.join('');

        eDTC.reorderFields(fieldOrder);

        expect(eDTC.getFieldNames().join('').startsWith(fieldOrderString)).toBeTruthy();
        expect(DInputObject.getFieldNames().join('').startsWith(fieldOrderString)).toBeTruthy();
        Object.values(eDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.getFieldNames().join('').startsWith(fieldOrderString)).toBeTruthy();
        });
      });
    });

    describe('Make Fields Nullable/Non-null', () => {
      it('makes a nullable field non-null', () => {
        eDTC.addFields({ initialNullable: 'String' });
        expect(eDTC.isFieldNonNull('initialNullable')).toBeFalsy();

        eDTC.makeFieldNonNull('initialNullable');

        expect(eDTC.isFieldNonNull('initialNullable')).toBeTruthy();
        expect(DInputObject.isFieldNonNull('initialNullable')).toBeTruthy();
        Object.values(eDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.isFieldNonNull('initialNullable')).toBeTruthy();
        });
      });

      it('makes a non-null field nullable', () => {
        eDTC.addFields({ initialNonNull: 'String!' });
        expect(eDTC.isFieldNonNull('initialNonNull')).toBeTruthy();

        eDTC.makeFieldNullable('initialNonNull');

        expect(eDTC.isFieldNonNull('initialNonNull')).toBeFalsy();
        expect(DInputObject.isFieldNonNull('initialNonNull')).toBeFalsy();
        Object.values(eDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.isFieldNonNull('initialNonNull')).toBeFalsy();
        });
      });
    });
  });
});
