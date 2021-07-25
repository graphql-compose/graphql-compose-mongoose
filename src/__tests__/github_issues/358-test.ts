import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';

// mongoose.set('debug', true);

const WithSubSchema = new mongoose.Schema({
  subDocument: new mongoose.Schema({
    field: { type: String, default: 'Hey' },
  }),
});

const WithoutSubSchema = new mongoose.Schema({
  subDocument: {
    field: { type: String, default: 'Hey' },
  },
});

const WithSubModel = mongoose.model('WithSubModel', WithSubSchema);
const WithoutSubModel = mongoose.model('WithoutSubModel', WithoutSubSchema);

describe('defaultsAsNonNull falsely reports non-nullability for subdocuments that have a Schema  - issue #358', () => {
  it('with sub schema', async () => {
    const WithSubTC = composeMongoose(WithSubModel, { defaultsAsNonNull: true });

    // sub-Schema breaks the "recursive default value assignation" behavior
    const data = new WithSubModel().subDocument;
    expect(data).toEqual(undefined);

    // so field should not be non-null
    expect(WithSubTC.getFieldTypeName('subDocument')).toBe('WithSubModelSubDocument');
  });

  it('as nested fields', async () => {
    const WithoutSubTC = composeMongoose(WithoutSubModel, { defaultsAsNonNull: true });

    const data = new WithoutSubModel().subDocument;
    expect(data).toEqual({ field: 'Hey' });

    // should be non-null!
    expect(WithoutSubTC.getFieldTypeName('subDocument')).toBe('WithoutSubModelSubDocument!');
  });
});
