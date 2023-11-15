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

describe('issue #286 - Allow to provide `disableErrorField` option for mutation resolvers configs', () => {
  it('Resolver:createMany', () => {
    const resolver = UserTC.mongooseResolvers.createMany({
      disableErrorField: true,
    });
    expect(resolver.getTypeComposer().toSDL()).toMatchInlineSnapshot(`
      "type CreateManyUserPayload {
        """Documents IDs"""
        recordIds: [Int!]!

        """Created documents"""
        records: [User!]

        """Number of created documents"""
        createdCount: Int!
      }"
    `);
  });

  it('Resolver:createOne', () => {
    const resolver = UserTC.mongooseResolvers.createOne({
      disableErrorField: true,
    });
    expect(resolver.getTypeComposer().toSDL()).toMatchInlineSnapshot(`
      "type CreateOneUserPayload {
        """Document ID"""
        recordId: Int

        """Created document"""
        record: User
      }"
    `);
  });

  it('Resolver:removeById', () => {
    const resolver = UserTC.mongooseResolvers.removeById({
      disableErrorField: true,
    });
    expect(resolver.getTypeComposer().toSDL()).toMatchInlineSnapshot(`
      "type RemoveByIdUserPayload {
        """Document ID"""
        recordId: Int

        """Removed document"""
        record: User
      }"
    `);
  });

  it('Resolver:removeMany', () => {
    const resolver = UserTC.mongooseResolvers.removeMany({
      disableErrorField: true,
    });
    expect(resolver.getTypeComposer().toSDL()).toMatchInlineSnapshot(`
      "type RemoveManyUserPayload {
        """Affected documents number"""
        numAffected: Int
      }"
    `);
  });

  it('Resolver:removeOne', () => {
    const resolver = UserTC.mongooseResolvers.removeOne({
      disableErrorField: true,
    });
    expect(resolver.getTypeComposer().toSDL()).toMatchInlineSnapshot(`
      "type RemoveOneUserPayload {
        """Document ID"""
        recordId: Int

        """Removed document"""
        record: User
      }"
    `);
  });

  it('Resolver:updateById', () => {
    const resolver = UserTC.mongooseResolvers.updateById({
      disableErrorField: true,
    });
    expect(resolver.getTypeComposer().toSDL()).toMatchInlineSnapshot(`
      "type UpdateByIdUserPayload {
        """Document ID"""
        recordId: Int

        """Updated document"""
        record: User
      }"
    `);
  });

  it('Resolver:updateMany', () => {
    const resolver = UserTC.mongooseResolvers.updateMany({
      disableErrorField: true,
    });
    expect(resolver.getTypeComposer().toSDL()).toMatchInlineSnapshot(`
      "type UpdateManyUserPayload {
        """Affected documents number"""
        numAffected: Int
      }"
    `);
  });

  it('Resolver:updateOne', () => {
    const resolver = UserTC.mongooseResolvers.updateOne({
      disableErrorField: true,
    });
    expect(resolver.getTypeComposer().toSDL()).toMatchInlineSnapshot(`
      "type UpdateOneUserPayload {
        """Document ID"""
        recordId: Int

        """Updated document"""
        record: User
      }"
    `);
  });
});
