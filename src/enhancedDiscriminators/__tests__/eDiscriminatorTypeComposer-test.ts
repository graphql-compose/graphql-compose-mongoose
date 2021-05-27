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

let baseDTC: EDiscriminatorTypeComposer<any, any>;
let DInterface: InterfaceTypeComposer<any, any>;
let DInputObject: ObjectTypeComposer<any, any>;

beforeEach(() => {
  baseDTC = composeMongoose(CharacterModel);
  DInterface = schemaComposer.getIFTC(baseDTC.getTypeName());
  DInputObject = baseDTC.getDInputObject();
});

afterEach(() => {
  baseDTC.schemaComposer.clear();
});

describe('EDiscriminatorTypeComposer', () => {
  it('has an interface object DInterface as the type name', () => {
    expect(baseDTC.getDInterface()).toEqual(schemaComposer.getAnyTC(baseDTC.getTypeName()));
  });

  it('throws an error when default (__t) discriminator key is set', () => {
    baseDTC.schemaComposer.clear();
    const { CharacterModel: noDKeyModel } = getCharacterModels(undefined, 'noDKeyCharacter');
    const errorCall = () => composeMongoose(noDKeyModel);
    expect(errorCall).toThrowError(
      'A custom discriminator key must be set on the model options in mongoose for discriminator behaviour to function correctly'
    );
  });

  it('should not be used on models without discriminators', () => {
    const { DroidModel } = getCharacterModels(undefined, 'noDiscrim');
    const noDiscrim = composeMongooseRaw(DroidModel, dComposeOpts);
    expect(noDiscrim instanceof EDiscriminatorTypeComposer).toBeFalsy();
  });

  describe('Custom Getters', () => {
    test('getting discriminator key', () => {
      expect(baseDTC.getDKey()).toEqual(defaultDKey);
    });

    test('getting discriminator interface', () => {
      expect(baseDTC.getDInterface()).toBe(DInterface);
    });

    test('getting discriminator input object TC', () => {
      expect(baseDTC.getDInputObject()).toBe(DInputObject);
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

  describe('DInterface', () => {
    it('shares field names with base model used to compose it', () => {
      expect(DInterface.getFieldNames()).toEqual(
        expect.arrayContaining(
          Object.keys(CharacterModel.schema.paths).filter((x) => !x.startsWith('__'))
        )
      );
    });

    it('should be an instance of InterfaceTypeComposer', () => {
      expect(DInterface instanceof InterfaceTypeComposer).toBeTruthy();
    });

    it('should have the input TC from DInputObject as input TC', () => {
      expect(DInterface.getInputTypeComposer()).toEqual(
        baseDTC.getDInputObject().getInputTypeComposer()
      );
    });
  });

  describe('Get Discriminator TCs', () => {
    it('returns discrimTCs with mongooseResolvers present', () => {
      Object.values(baseDTC.getDiscriminatorTCs()).forEach((discimTC) => {
        expect(discimTC).toHaveProperty('mongooseResolvers');
      });
    });
    it('returns empty object with mongooseResolvers missing', () => {
      (baseDTC.discrimTCs[Object.keys(baseDTC.discrimTCs)[0]] as any).mongooseResolvers = undefined;
      Object.values(baseDTC.getDiscriminatorTCs()).forEach((discimTC) => {
        expect(discimTC).toHaveProperty('mongooseResolvers');
      });
    });
  });

  describe('Overridden eDTC Class Methods', () => {
    describe('Set Field', () => {
      it('updates field on all child TCs', () => {
        baseDTC.setField('newField', 'String');
        expect(baseDTC.hasField('newField')).toBeTruthy();
        expect(DInterface.hasField('newField')).toBeTruthy();
        expect(DInputObject.hasField('newField')).toBeTruthy();
        Object.values(baseDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.hasField('newField')).toBeTruthy();
        });
      });

      it('updates input TC when field is added', () => {
        baseDTC.setField('inputField', 'String');
        expect(schemaComposer.getIFTC(baseDTC.getTypeName()).getInputTypeComposer()).toEqual(
          DInputObject.getInputTypeComposer()
        );
      });
    });

    describe('Set Extensions', () => {
      it('updates field on all child TCs', () => {
        baseDTC.setExtensions({ newField: 'testExtension' });
        expect(baseDTC.hasExtension('newField')).toBeTruthy();
        expect(DInterface.hasExtension('newField')).toBeTruthy();
        expect(DInputObject.hasExtension('newField')).toBeTruthy();
        Object.values(baseDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.hasExtension('newField')).toBeTruthy();
        });
      });
    });

    describe('Remove Field', () => {
      it('deletes field on all child TCs', () => {
        baseDTC.addFields({ toDelete: 'String' });
        // check field added
        expect(baseDTC.hasField('toDelete')).toBeTruthy();
        expect(DInterface.hasField('toDelete')).toBeTruthy();
        expect(DInputObject.hasField('toDelete')).toBeTruthy();
        Object.values(baseDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.hasField('toDelete')).toBeTruthy();
        });

        baseDTC.removeField('toDelete');
        expect(baseDTC.hasField('toDelete')).toBeFalsy();
        expect(DInterface.hasField('toDelete')).toBeFalsy();
        expect(DInputObject.hasField('toDelete')).toBeFalsy();
        Object.values(baseDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.hasField('toDelete')).toBeFalsy();
        });
      });
    });

    describe('Remove Other Fields', () => {
      it('removes all other fields from base TC from all child TCs', () => {
        baseDTC.addFields({ toKeep: 'String' });

        const otherFields = baseDTC
          .getDInterface()
          .getFieldNames()
          .filter((field) => field !== 'toKeep');
        baseDTC.removeOtherFields('toKeep');

        otherFields.forEach((removedField) => {
          expect(baseDTC.hasField(removedField)).toBeFalsy();
          expect(DInterface.hasField(removedField)).toBeFalsy();
          expect(DInputObject.hasField(removedField)).toBeFalsy();
          Object.values(baseDTC.discrimTCs).forEach((dTC) => {
            expect(dTC.hasField(removedField)).toBeFalsy();
          });
        });
      });
    });

    describe('Reorder Fields', () => {
      it('reorders fields on all child TCs', () => {
        const fieldOrder = ['_id', 'appearsIn', 'friends', 'kind', 'type'];
        const fieldOrderString = fieldOrder.join('');

        baseDTC.reorderFields(fieldOrder);

        expect(baseDTC.getFieldNames().join('').startsWith(fieldOrderString)).toBeTruthy();
        expect(DInterface.getFieldNames().join('').startsWith(fieldOrderString)).toBeTruthy();
        expect(DInputObject.getFieldNames().join('').startsWith(fieldOrderString)).toBeTruthy();
        Object.values(baseDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.getFieldNames().join('').startsWith(fieldOrderString)).toBeTruthy();
        });
      });
    });

    describe('Make Fields Nullable/Non-null', () => {
      it('makes a nullable field non-null', () => {
        baseDTC.addFields({ initialNullable: 'String' });
        expect(baseDTC.isFieldNonNull('initialNullable')).toBeFalsy();

        baseDTC.makeFieldNonNull('initialNullable');

        expect(baseDTC.isFieldNonNull('initialNullable')).toBeTruthy();
        expect(DInterface.isFieldNonNull('initialNullable')).toBeTruthy();
        expect(DInputObject.isFieldNonNull('initialNullable')).toBeTruthy();
        Object.values(baseDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.isFieldNonNull('initialNullable')).toBeTruthy();
        });
      });

      it('makes a non-null field nullable', () => {
        baseDTC.addFields({ initialNonNull: 'String!' });
        expect(baseDTC.isFieldNonNull('initialNonNull')).toBeTruthy();

        baseDTC.makeFieldNullable('initialNonNull');

        expect(baseDTC.isFieldNonNull('initialNonNull')).toBeFalsy();
        expect(DInterface.isFieldNonNull('initialNonNull')).toBeFalsy();
        expect(DInputObject.isFieldNonNull('initialNonNull')).toBeFalsy();
        Object.values(baseDTC.discrimTCs).forEach((dTC) => {
          expect(dTC.isFieldNonNull('initialNonNull')).toBeFalsy();
        });
      });
    });
  });
});
