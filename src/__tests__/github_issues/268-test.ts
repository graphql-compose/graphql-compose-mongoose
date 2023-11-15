import { SchemaComposer } from 'graphql-compose';
import { composeMongoose } from '../../index';
import { mongoose } from '../../__mocks__/mongooseCommon';
import { Document } from 'mongoose';

const schemaComposer = new SchemaComposer<{ req: any }>();

const UserSchema = new mongoose.Schema({
  _id: { type: Number },
  name: { type: String, required: true },
  age: { type: Number },
});
interface IUser extends Document {
  _id: number;
  name: string;
  age?: number;
}

const UserModel = mongoose.model<IUser>('User', UserSchema);
const UserTC = composeMongoose(UserModel, { schemaComposer });

schemaComposer.Query.addFields({
  userById: UserTC.mongooseResolvers.findById(),
  userFindOne: UserTC.mongooseResolvers.findOne(),
});

// const schema = schemaComposer.buildSchema();
// console.log(schemaComposer.toSDL());

beforeAll(async () => {
  await UserModel.base.createConnection();
  await UserModel.create({ _id: 1, name: 'User1' });
});
afterAll(() => UserModel.base.disconnect());

describe('issue #268 - Allow to provide `suffix` option for resolvers configs', () => {
  it('generate deferent resolvers with different configs', async () => {
    const createOne1 = UserTC.mongooseResolvers.createOne();
    expect(createOne1.getTypeName()).toBe('CreateOneUserPayload');
    expect(createOne1.getArgITC('record').toSDL()).toMatchInlineSnapshot(`
      """""""
      input CreateOneUserInput {
        name: String!
        age: Float
      }"
    `);

    const createOne2 = UserTC.mongooseResolvers.createOne({
      suffix: 'Short',
      record: {
        removeFields: ['age'],
      },
    });
    expect(createOne2.getTypeName()).toBe('CreateOneUserShortPayload');
    expect(createOne2.getArgITC('record').toSDL()).toMatchInlineSnapshot(`
      """""""
      input CreateOneUserShortInput {
        _id: Int
        name: String!
      }"
    `);
  });

  it('Resolver:count', () => {
    const resolver = UserTC.mongooseResolvers.count({
      suffix: 'XXX',
    });
    expect(resolver.getArgTypeName('filter')).toBe('FilterCountUserXXXInput');
  });

  it('Resolver:findMany', () => {
    const resolver = UserTC.mongooseResolvers.findMany({
      suffix: 'XXX',
    });
    expect(resolver.getArgTypeName('filter')).toBe('FilterFindManyUserXXXInput');
    expect(resolver.getArgTypeName('sort')).toBe('SortFindManyUserXXXInput');
  });

  it('Resolver:findOne', () => {
    const resolver = UserTC.mongooseResolvers.findOne({
      suffix: 'XXX',
    });
    expect(resolver.getArgTypeName('filter')).toBe('FilterFindOneUserXXXInput');
    expect(resolver.getArgTypeName('sort')).toBe('SortFindOneUserXXXInput');
  });

  it('Resolver:createMany', () => {
    const resolver = UserTC.mongooseResolvers.createMany({
      suffix: 'XXX',
    });
    expect(resolver.getTypeName()).toBe('CreateManyUserXXXPayload');
    expect(resolver.getArgTypeName('records')).toBe('[CreateManyUserXXXInput!]!');
  });

  it('Resolver:createOne', () => {
    const resolver = UserTC.mongooseResolvers.createOne({
      suffix: 'XXX',
    });
    expect(resolver.getTypeName()).toBe('CreateOneUserXXXPayload');
    expect(resolver.getArgTypeName('record')).toBe('CreateOneUserXXXInput!');
  });

  it('Resolver:removeById', () => {
    const resolver = UserTC.mongooseResolvers.removeById({
      suffix: 'XXX',
    });
    expect(resolver.getTypeName()).toBe('RemoveByIdUserXXXPayload');
  });

  it('Resolver:removeMany', () => {
    const resolver = UserTC.mongooseResolvers.removeMany({
      suffix: 'XXX',
    });
    expect(resolver.getTypeName()).toBe('RemoveManyUserXXXPayload');
  });

  it('Resolver:removeOne', () => {
    const resolver = UserTC.mongooseResolvers.removeOne({
      suffix: 'XXX',
    });
    expect(resolver.getTypeName()).toBe('RemoveOneUserXXXPayload');
    expect(resolver.getArgTypeName('filter')).toBe('FilterRemoveOneUserXXXInput');
    expect(resolver.getArgTypeName('sort')).toBe('SortRemoveOneUserXXXInput');
  });

  it('Resolver:updateById', () => {
    const resolver = UserTC.mongooseResolvers.updateById({
      suffix: 'XXX',
    });
    expect(resolver.getTypeName()).toBe('UpdateByIdUserXXXPayload');
    expect(resolver.getArgTypeName('record')).toBe('UpdateByIdUserXXXInput!');
  });

  it('Resolver:updateMany', () => {
    const resolver = UserTC.mongooseResolvers.updateMany({
      suffix: 'XXX',
    });
    expect(resolver.getTypeName()).toBe('UpdateManyUserXXXPayload');
    expect(resolver.getArgTypeName('record')).toBe('UpdateManyUserXXXInput!');
    expect(resolver.getArgTypeName('filter')).toBe('FilterUpdateManyUserXXXInput');
    expect(resolver.getArgTypeName('sort')).toBe('SortUpdateManyUserXXXInput');
  });

  it('Resolver:updateOne', () => {
    const resolver = UserTC.mongooseResolvers.updateOne({
      suffix: 'XXX',
    });
    expect(resolver.getTypeName()).toBe('UpdateOneUserXXXPayload');
    expect(resolver.getArgTypeName('record')).toBe('UpdateOneUserXXXInput!');
    expect(resolver.getArgTypeName('filter')).toBe('FilterUpdateOneUserXXXInput');
    expect(resolver.getArgTypeName('sort')).toBe('SortUpdateOneUserXXXInput');
  });
});
