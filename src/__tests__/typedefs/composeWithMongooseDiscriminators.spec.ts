import { model, Schema } from 'mongoose';
import { composeWithMongooseDiscriminators } from '../../composeWithMongooseDiscriminators';
import {
  Context,
  EnumCharacterType,
  ICharacter,
  ICharacterModel,
  IDroid,
  IPerson,
} from './mock-typedefs';

const CharacterModel = model<ICharacter, ICharacterModel>('Character', new Schema({}));

const PersonModel = CharacterModel.discriminator<IPerson>(EnumCharacterType.Person, new Schema({}));
const DroidModel = CharacterModel.discriminator<IDroid>(EnumCharacterType.Droid, new Schema({}));

const CharacterTC = composeWithMongooseDiscriminators<ICharacter, Context>(CharacterModel, {
  reorderFields: true,
});

const PersonTC = CharacterTC.discriminator(PersonModel);
const DroidTC = CharacterTC.discriminator(DroidModel);

CharacterTC.getResolver<ICharacter, { arg1: string; arg2: number }>('findOne').wrapResolve(
  (next) => (rp) => {
    if (rp.source && rp.args) {
      rp.args.arg1 = 'string';
      rp.args.arg2 = 888;
    }
  }
);

CharacterTC.addFields({
  newField: {
    // test Thunk
    type: 'Int',
    resolve: (source, args, context) => {
      source.name = 'GQC';
      // source.name = 44;
      context.auth = 'auth';
      // context.auth = 44;
    },
  },
});

PersonTC.addFields({
  newField: {
    // test Thunk
    type: 'Int',
    resolve: (source, args, context) => {
      source.name = 'GQC';
      // source.name = 44;
      source.dob = 51225545;
      // source.dob = 'string';
      context.auth = 'auth';
      // context.auth = 44;
    },
  },
});

DroidTC.addFields({
  newField: {
    // test Thunk
    type: 'Int',
    resolve: (source, args, context) => {
      source.name = 'GQC';
      // source.name = 44;
      source.makeDate = new Date();
      // source.makeDate = 55566156;
      context.auth = 'auth';
      // context.auth = 44;
    },
  },
});

// Testing a scenario where we use no types
const Char = model('Char', new Schema({}));
const Per = Char.discriminator('Per', new Schema({}));

// by default, from mongoose types, sources are `Document`.
// it is good to explicitly override `Document` to `any`
// then since we did not pass a context, our context results to `any`
const CharTC = composeWithMongooseDiscriminators<any>(Char);
const PerTC = CharTC.discriminator<any>(Per);
