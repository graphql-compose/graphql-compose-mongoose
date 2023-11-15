import { mongoose, Schema } from './mongooseCommon';
import ContactsSchema from './contactsSchema';
import enumEmployment from './enumEmployment';
import LanguageSchema from './languageSchema';
import { Document } from 'mongoose';

const UserSchema = new Schema(
  {
    subDoc: {
      field1: String,
      field2: {
        field21: String,
        field22: String,
      },
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    users: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
    },

    n: {
      type: String,
      required: true,
      description: 'Person name',
      alias: 'name',
    },

    age: {
      type: Number,
      description: 'Full years',
      required() {
        // in graphql this field should be Nullable
        return (this as any).name === 'Something special';
      },
    },

    gender: {
      type: String,
      enum: ['male', 'female', 'ladyboy'],
    },

    skills: {
      type: [String],
      default: [],
      description: 'List of skills',
    },

    employment: {
      type: [
        {
          type: String,
          enum: Object.keys(enumEmployment),
        },
      ],
      description: 'List of desired employment types',
      index: true,
    },

    relocation: {
      type: Boolean,
      description: 'Does candidate relocate to another region',
    },

    contacts: {
      type: ContactsSchema,
      default: {},
      description: 'Contacts of person (phone, skype, mail and etc)',
    },

    languages: {
      type: [LanguageSchema],
      default: [],
      description: 'Knowledge of languages',
    },

    __secretField: {
      type: String,
    },

    someDynamic: {
      type: Schema.Types.Mixed,
      description: "Some mixed value, that served with @taion's `graphql-type-json`",
    },

    periods: [{ from: Number, to: Number }],

    someDeep: {
      periods: [{ from: Number, to: Number }],
    },

    salary: {
      type: Schema.Types.Decimal128,
    },

    mapField: {
      type: Map,
      of: String,
    },

    mapFieldDeep: {
      subField: {
        type: Map,
        of: String,
      },
    },

    billingAddress: {
      street: { type: String, index: true },
      state: { type: String, index: true, enum: ['FL', 'MA', 'NY'] },
      country: { type: String, index: true },
    },

    // for error payloads tests
    valid: {
      type: String,
      required: false,
      validate: [
        () => {
          return false;
        },
        'this is a validate message',
      ],
    },

    // createdAt, created via option `timestamp: true` (see bottom)
    // updatedAt, created via option `timestamp: true` (see bottom)
  },
  {
    timestamps: true, // add createdAt, updatedAt fields
    toJSON: { getters: true },
    toObject: { virtuals: true },
  }
);

UserSchema.set('autoIndex', false);
UserSchema.index({ n: 1, age: -1 });

// eslint-disable-next-line
UserSchema.virtual('nameVirtual').get(function (this: any) {
  return `VirtualFieldValue${this._id}`;
});

export interface IUser extends Document {
  _id: any;
  name?: string;
  age?: number;
  gender?: string;
  someDynamic?: any;
  skills?: string[];
  relocation?: boolean;
  contacts: {
    email: string;
    skype?: string;
  };
}

const UserModel = mongoose.model<IUser>('User', UserSchema);

export { UserSchema, UserModel };
