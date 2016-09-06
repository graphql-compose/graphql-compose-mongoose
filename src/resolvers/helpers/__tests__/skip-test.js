/* @flow */

import { expect, spy } from 'chai';
import {
  GraphQLInt,
} from 'graphql';
import { skipHelperArgs, skipHelper } from '../skip';

describe('Resolver helper `skip` ->', () => {
  describe('limitHelperArgs()', () => {
    it('should return skip field', () => {
      const args = skipHelperArgs();
      expect(args).has.property('skip');
      expect(args).has.deep.property('skip.name', 'skip');
      expect(args).has.deep.property('skip.type', GraphQLInt);
    });
  });

  describe('skipHelper()', () => {
    let spyFn;
    let resolveParams;

    beforeEach(() => {
      spyFn = spy();
      resolveParams = {
        query: {
          skip: spyFn,
        },
      };
    });

    it('should not call query.skip if args.skip is empty', () => {
      skipHelper(resolveParams);
      expect(spyFn).to.have.not.been.called();
    });
    it('should call query.skip if args.skip is provided', () => {
      resolveParams.args = { skip: 333 };
      skipHelper(resolveParams);
      expect(spyFn).to.have.been.called.with(333);
    });
    it('should convert skip to int in args.skip', () => {
      resolveParams.args = { skip: '444' };
      skipHelper(resolveParams);
      expect(spyFn).to.have.been.called.with(444);
    });
  });
});
