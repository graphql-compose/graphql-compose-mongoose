/* @flow */

import { expect, spy } from 'chai';
import { limitHelperArgs, limitHelper } from '../limit';
import {
  GraphQLInt,
} from 'graphql';

describe('Resolver helper `limit` ->', () => {
  describe('limitHelperArgs()', () => {
    it('should return limit field', () => {
      const args = limitHelperArgs();
      expect(args).has.property('limit');
      expect(args).has.deep.property('limit.name', 'limit');
      expect(args).has.deep.property('limit.type', GraphQLInt);
    });
    it('should process `opts.defaultValue` arg', () => {
      expect(limitHelperArgs())
        .has.deep.property('limit.defaultValue', 1000);
      expect(limitHelperArgs({
        defaultValue: 333,
      })).has.deep.property('limit.defaultValue', 333);
    });
  });

  describe('limitHelper()', () => {
    let spyFn;
    let resolveParams;

    beforeEach(() => {
      spyFn = spy();
      resolveParams = {
        query: {
          limit: spyFn,
        },
      };
    });

    it('should not call query.limit if args.limit is empty', () => {
      limitHelper(resolveParams);
      expect(spyFn).to.have.not.been.called();
    });
    it('should call query.limit if args.limit is provided', () => {
      resolveParams.args = { limit: 333 };
      limitHelper(resolveParams);
      expect(spyFn).to.have.been.called.with(333);
    });
    it('should convert string to int in args.limit', () => {
      resolveParams.args = { limit: '444' };
      limitHelper(resolveParams);
      expect(spyFn).to.have.been.called.with(444);
    });
  });
});
