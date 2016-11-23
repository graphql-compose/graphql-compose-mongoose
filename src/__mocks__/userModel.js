import { mongoose, Schema } from './mongooseCommon';
import ContactsSchema from './contactsSchema';
import enumEmployment from './enumEmployment';
import LanguageSchema from './languageSchema';

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
      ref: 'UserModel',
    },

    users: {
      type: [Schema.Types.ObjectId],
      ref: 'UserModel',
    },

    name: {
      type: String,
      description: 'Person name',
    },

    age: {
      type: Number,
      description: 'Full years',
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
      type: [{
        type: String,
        enum: Object.keys(enumEmployment),
      }],
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
      description: 'Some mixed value, that served with @taion\'s `graphql-type-json`',
    },

    // createdAt, created via option `timastamp: true` (see bottom)
    // updatedAt, created via option `timastamp: true` (see bottom)
  },
  {
    timestamps: true, // add createdAt, updatedAt fields
    toJSON: { getters: true },
    toObject: { virtuals: true },
  }
);

UserSchema.set('autoIndex', false);
UserSchema.index({ name: 1, age: -1 });

UserSchema.virtual('nameVirtual').get(function () { // eslint-disable-line
  return `VirtualFieldValue${this._id}`;
});


const UserModel = mongoose.model('User', UserSchema);

export {
  UserSchema,
  UserModel,
};
