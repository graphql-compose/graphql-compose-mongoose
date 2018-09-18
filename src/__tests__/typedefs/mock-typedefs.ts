import { Document, Model } from 'mongoose';

export interface Context {
  uid: string;
  profileUrl: string;
  auth: string;
}

export interface IUser extends Document {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'ladyboy';
  skills: string[];
}

export interface IUserModel extends Model<IUser> {
  statics1: string;
}

export interface IPost extends Document {
  title: string;
  body: string;
  comments: Array<{ by: string; text: string }>;
}

export enum EnumCharacterType {
  Person = 'Person',
  Droid = 'Droid',
}

export interface ICharacter extends Document {
  name: string;
  type: EnumCharacterType;
  kind: string;
  friends: string[];
  appearsIn: string[];
}

// if static functions exist
export interface ICharacterModel extends Model<ICharacter> {
  getCharactersFriends(id: string): ICharacter[];
}

export interface IPerson extends ICharacter {
  dob: number;
  starShips: string[];
  totalCredits: number;
}

export interface IDroid extends ICharacter {
  makeDate: Date;
  modelNumber: number;
  primaryFunction: string[];
}
