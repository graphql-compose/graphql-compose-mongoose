import type { Model } from 'mongoose';
import { mongoose, Schema, Types } from '../../__mocks__/mongooseCommon';
import { DroidSchema } from './droidSchema';
import { PersonSchema } from './personSchema';

const enumCharacterType = {
  PERSON: 'Person',
  DROID: 'Droid',
};

export const CharacterObject = {
  _id: {
    type: String,
    default: (): any => new Types.ObjectId(),
  },
  name: String,

  type: {
    type: String,
    require: true,
    enum: Object.keys(enumCharacterType),
  },
  kind: {
    type: String,
    require: true,
    enum: Object.keys(enumCharacterType),
  },

  friends: [String], // another Character
  appearsIn: [String], // movie
};

const CharacterSchema = new Schema(CharacterObject);
const ACharacterSchema = new Schema({ ...CharacterObject });

export function getCharacterModels(DKey: string): {
  CharacterModel: Model<any>;
  PersonModel: Model<any>;
  DroidModel: Model<any>;
} {
  CharacterSchema.set('discriminatorKey', DKey);

  const CharacterModel: Model<any> = mongoose.models.Character
    ? mongoose.models.Character
    : mongoose.model('Character', CharacterSchema);

  const PersonModel: Model<any> = mongoose.models[enumCharacterType.PERSON]
    ? mongoose.models[enumCharacterType.PERSON]
    : CharacterModel.discriminator(enumCharacterType.PERSON, PersonSchema);

  const DroidModel: Model<any> = mongoose.models[enumCharacterType.DROID]
    ? mongoose.models[enumCharacterType.DROID]
    : CharacterModel.discriminator(enumCharacterType.DROID, DroidSchema);

  return { CharacterModel, PersonModel, DroidModel };
}

export function getCharacterModelClone(): { NoDKeyCharacterModel: Model<any> } {
  const NoDKeyCharacterModel = mongoose.model('NoDKeyCharacter', ACharacterSchema);

  /*
    const APersonModel = ACharacterModel.discriminator('A' + enumCharacterType.PERSON, PersonSchema.clone());

    const ADroidModel = ACharacterModel.discriminator('A' + enumCharacterType.DROID, DroidSchema.clone());
  */

  return { NoDKeyCharacterModel }; // APersonModel, ADroidModel };
}
