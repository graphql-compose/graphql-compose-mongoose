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

    it('should make projection fields flat', () => {
      resolveParams.projection = { name: { first: 1, last: 1 } };
      projectionHelper(resolveParams);
      expect(spyFn).to.have.been.called.with({ name: true });
    });

    describe('projection operators', () => {
      // see more details here https://docs.mongodb.com/v3.2/reference/operator/projection/meta/
      it('should pass $meta unflatted', () => {
        resolveParams.projection = { score: { $meta: 'textScore' } };
        projectionHelper(resolveParams);
        expect(spyFn).to.have.been.called.with({ score: { $meta: 'textScore' } });
      });

      it('should pass $slice unflatted', () => {
        resolveParams.projection = { comments: { $slice: 5 } };
        projectionHelper(resolveParams);
        expect(spyFn).to.have.been.called.with({ comments: { $slice: 5 } });
      });

      it('should pass $elemMatch unflatted', () => {
        resolveParams.projection = { students: { $elemMatch: { school: 102 } } };
        projectionHelper(resolveParams);
        expect(spyFn).to.have.been.called.with({ students: { $elemMatch: { school: 102 } } });
      });
    });
  });
});
