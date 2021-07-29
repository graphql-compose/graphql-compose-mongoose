import type { Model } from 'mongoose';
import { mongoose, Schema, Types } from '../../__mocks__/mongooseCommon';

export const PersonSchema = new Schema({
  dob: Number,
  primaryFunction: [String],
  starShips: [String],
  totalCredits: Number,
});

export const DroidSchema = new Schema({
  makeDate: Date,
  modelNumber: Number,
  primaryFunction: [String],
});

const MovieSchema = new Schema({
  _id: String,

  characters: {
    type: [String], // redundant but i need it.
    description: 'A character in the Movie, Person or Droid.',
  },

  director: {
    type: String, // id of director
    description: 'Directed the movie.',
  },

  imdbRatings: String,
  releaseDate: String,
});

export const MovieModel = mongoose.model('Movie', MovieSchema);

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

export function getCharacterModels(
  DKey?: string,
  name: string = 'Character'
): { CharacterModel: Model<any>; PersonModel: Model<any>; DroidModel: Model<any> } {
  const CharacterSchema = DKey
    ? new Schema(CharacterObject, { discriminatorKey: DKey })
    : new Schema(CharacterObject);

  const CharacterModel: Model<any> = mongoose.model(name, CharacterSchema);

  const PersonModel: Model<any> = CharacterModel.discriminator(
    name + enumCharacterType.PERSON,
    PersonSchema
  );

  const DroidModel: Model<any> = CharacterModel.discriminator(
    name + enumCharacterType.DROID,
    DroidSchema
  );

  return { CharacterModel, PersonModel, DroidModel };
}

export function getCharacterModelClone(): { NoDKeyCharacterModel: Model<any> } {
  const ACharacterSchema = new Schema({ ...CharacterObject });
  const NoDKeyCharacterModel = mongoose.model('NoDKeyCharacter', ACharacterSchema);

  /*
    const APersonModel = ACharacterModel.discriminator('A' + enumCharacterType.PERSON, PersonSchema.clone());

    const ADroidModel = ACharacterModel.discriminator('A' + enumCharacterType.DROID, DroidSchema.clone());
  */

  return { NoDKeyCharacterModel }; // APersonModel, ADroidModel };
}
