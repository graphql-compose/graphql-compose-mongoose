import { projectionHelper } from '../projection';

describe('Resolver helper `projection` ->', () => {
  describe('projectionHelper()', () => {
    let spyFn: jest.Mock<any, any>;
    let resolveParams: any;

    beforeEach(() => {
      spyFn = jest.fn();
      resolveParams = {
        query: {
          select: spyFn,
        },
      };
    });

    it('should not call query.select if projection is empty', () => {
      projectionHelper(resolveParams);
      expect(spyFn).not.toBeCalled();
    });

    it('should call query.select if projection is provided', () => {
      resolveParams.projection = { name: 1, age: 1 };
      projectionHelper(resolveParams, { name: 'n' });
      expect(spyFn).toBeCalledWith({ n: true, age: true });
    });

    it('should make projection fields flat', () => {
      resolveParams.projection = { name: { first: 1, last: 1 } };
      projectionHelper(resolveParams, { name: 'n' });
      expect(spyFn).toBeCalledWith({ 'n.first': true, 'n.last': true });
    });

    it('should make projection fields flat with nested aliases', () => {
      resolveParams.projection = { name: { first: 1, last: 1 } };
      projectionHelper(resolveParams, { name: { __selfAlias: 'n', first: 'f', last: 'l' } });
      expect(spyFn).toBeCalledWith({ 'n.f': true, 'n.l': true });
    });

    it('should not call query.select if projection has * key', () => {
      resolveParams.projection = { '*': true };
      projectionHelper(resolveParams);
      expect(spyFn).not.toBeCalled();
    });

    describe('projection operators', () => {
      // see more details here https://docs.mongodb.com/v3.2/reference/operator/projection/meta/
      it('should pass $meta non-flatten', () => {
        resolveParams.projection = { score: { $meta: 'textScore' } };
        projectionHelper(resolveParams);
        expect(spyFn).toBeCalledWith({ score: { $meta: 'textScore' } });
      });

      it('should pass $slice non-flatten', () => {
        resolveParams.projection = { comments: { $slice: 5 } };
        projectionHelper(resolveParams);
        expect(spyFn).toBeCalledWith({ comments: { $slice: 5 } });
      });

      it('should pass $elemMatch non-flatten', () => {
        resolveParams.projection = { students: { $elemMatch: { school: 102 } } };
        projectionHelper(resolveParams);
        expect(spyFn).toBeCalledWith({ students: { $elemMatch: { school: 102 } } });
      });
    });
  });
});
