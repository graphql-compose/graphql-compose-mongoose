/* @flow */

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
  });
});
