import mongoose from 'mongoose';
import { prepareAliases } from '../aliases';

describe('Resolver helper `alises` ->', () => {
  describe('prepareAliases()', () => {
    it('should extract field aliases from Model', () => {
      const UserSchema = new mongoose.Schema({
        e: {
          type: String,
          alias: 'emailAddress',
        },
      });
      const User = mongoose.model('User123', UserSchema);
      const aliases = prepareAliases(User);
      expect(aliases).toEqual({ emailAddress: 'e' });
    });

    it('should return undefined if field aliases do not exists in Model', () => {
      const UserSchema = new mongoose.Schema({
        e: {
          type: String,
        },
      });
      const User = mongoose.model('User456', UserSchema);
      const aliases = prepareAliases(User);
      expect(aliases).toEqual(false);
    });

    it('should extract field aliases from discriminator Models', () => {
      const UserSchema = new mongoose.Schema({
        e: {
          type: String,
          alias: 'emailAddress',
        },
      });
      const User = mongoose.model('User111', UserSchema);
      const VIPUserSchema = new mongoose.Schema({
        f: {
          type: Number,
          alias: 'freeDrinks',
        },
      });
      User.discriminator('VIPUser111', VIPUserSchema);
      const aliases = prepareAliases(User);
      expect(aliases).toEqual({ emailAddress: 'e', freeDrinks: 'f' });
    });

    it('should extract field aliases in discriminator Models inherited from base Model', () => {
      const UserSchema = new mongoose.Schema({
        e: {
          type: String,
          alias: 'emailAddress',
        },
      });
      const User = mongoose.model('User789', UserSchema);
      const VIPUserSchema = new mongoose.Schema({
        f: {
          type: Number,
          alias: 'freeDrinks',
        },
      });
      const VIPUser = User.discriminator('VIPUser789', VIPUserSchema);
      const aliases = prepareAliases(VIPUser);
      expect(aliases).toEqual({ emailAddress: 'e', freeDrinks: 'f' });
    });
  });
});
