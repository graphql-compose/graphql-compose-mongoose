import { schemaComposer } from 'graphql-compose';
import {
  processFilterOperators,
  OPERATORS_FIELDNAME,
} from '../../resolvers/helpers/filterOperators';

beforeEach(() => {
  schemaComposer.clear();
  schemaComposer.createInputTC({
    name: 'UserFilterInput',
    fields: {
      _id: 'String',
      employment: 'String',
      name: 'String',
      age: 'Int',
      skills: ['String'],
    },
  });
});

describe(`issue #181 - Cannot read property '_operators' of null`, () => {
  it('should call query.find if operator value is null', () => {
    const filter = {
      [OPERATORS_FIELDNAME]: { age: { ne: null } },
    };
    expect(processFilterOperators(filter)).toEqual({ age: { $ne: null } });
  });
});
