/* @flow */

import { limitHelperArgs, limitHelper } from '../limit';

describe('Resolver helper `limit` ->', () => {
  describe('limitHelperArgs()', () => {
    it('should return limit field', () => {
      const args = limitHelperArgs();
      expect(args.limit.name).toBe('limit');
      expect(args.limit.type).toBe('Int');
    });
    it('should process `opts.defaultValue` arg', () => {
      expect(limitHelperArgs().limit.defaultValue).toBe(1000);
      expect(
        limitHelperArgs({
          defaultValue: 333,
        }).limit.defaultValue
      ).toBe(333);
    });
  });

  describe('limitHelper()', () => {
    let spyFn;
    let resolveParams: any;

    beforeEach(() => {
      spyFn = jest.fn();
      resolveParams = {
        query: {
          limit: spyFn,
        },
      };
    });

    it('should not call query.limit if args.limit is empty', () => {
      limitHelper(resolveParams);
      expect(spyFn).not.toBeCalled();
    });
    it('should call query.limit if args.limit is provided', () => {
      resolveParams.args = { limit: 333 };
      limitHelper(resolveParams);
      expect(spyFn).toBeCalledWith(333);
    });
    it('should convert string to int in args.limit', () => {
      resolveParams.args = { limit: '444' };
      limitHelper(resolveParams);
      expect(spyFn).toBeCalledWith(444);
    });
  });
});
