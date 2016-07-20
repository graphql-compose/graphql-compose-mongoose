/* @flow */

import { expect, spy } from 'chai';
import { projectionHelper } from '../projection';

describe('Resolver helper `projection` ->', () => {
  describe('projectionHelper()', () => {
    let spyFn;
    let resolveParams;

    beforeEach(() => {
      spyFn = spy();
      resolveParams = {
        query: {
          select: spyFn,
        },
      };
    });

    it('should not call query.select if projection is empty', () => {
      projectionHelper(resolveParams);
      expect(spyFn).to.have.not.been.called();
    });
    it('should call query.select if projection is provided', () => {
      resolveParams.projection = { name: 1, age: 1 };
      projectionHelper(resolveParams);
      expect(spyFn).to.have.been.called.with({ name: true, age: true });
    });
  });
});
