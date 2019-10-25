/* @flow */

import { beforeQueryHelper } from '../beforeQueryHelper';
import { UserModel } from '../../../__mocks__/userModel';

describe('Resolver helper `beforeQueryHelper` ->', () => {
  let spyExec;
  let spyWhere;
  let resolveParams: any;

  beforeEach(() => {
    spyWhere = jest.fn();
    spyExec = jest.fn(() => Promise.resolve('EXEC_RETURN'));

    resolveParams = {
      query: {
        exec: spyExec,
        where: spyWhere,
      },
      model: UserModel,
    };
  });

  it('should return query.exec() if `resolveParams.beforeQuery` is empty', async () => {
    const result = await beforeQueryHelper(resolveParams);
    expect(result).toBe('EXEC_RETURN');
  });

  it('should call the `exec` method of `beforeQuery` return', async () => {
    resolveParams.beforeQuery = function beforeQuery() {
      return {
        exec: () => Promise.resolve('changed'),
      };
    };

    const result = await beforeQueryHelper(resolveParams);
    expect(result).toBe('changed');
  });

  it('should return the complete payload if not a Query', async () => {
    resolveParams.beforeQuery = function beforeQuery() {
      return 'NOT_A_QUERY';
    };

    expect(await beforeQueryHelper(resolveParams)).toBe('NOT_A_QUERY');
  });
});
