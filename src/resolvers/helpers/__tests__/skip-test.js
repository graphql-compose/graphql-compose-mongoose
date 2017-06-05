/* @flow */

import { GraphQLInt } from 'graphql';
import { skipHelperArgs, skipHelper } from '../skip';

describe('Resolver helper `skip` ->', () => {
  describe('limitHelperArgs()', () => {
    it('should return skip field', () => {
      const args = skipHelperArgs();
      expect(args).toHaveProperty('skip');
      expect(args).toHaveProperty('skip.name', 'skip');
      expect(args).toHaveProperty('skip.type', GraphQLInt);
    });
  });

  describe('skipHelper()', () => {
    let spyFn;
    let resolveParams;

    beforeEach(() => {
      spyFn = jest.fn();
      resolveParams = {
        query: {
          skip: spyFn,
        },
      };
    });

    it('should not call query.skip if args.skip is empty', () => {
      skipHelper(resolveParams);
      expect(spyFn).not.toBeCalled();
    });
    it('should call query.skip if args.skip is provided', () => {
      resolveParams.args = { skip: 333 };
      skipHelper(resolveParams);
      expect(spyFn).toBeCalledWith(333);
    });
    it('should convert skip to int in args.skip', () => {
      resolveParams.args = { skip: '444' };
      skipHelper(resolveParams);
      expect(spyFn).toBeCalledWith(444);
    });
  });
});
