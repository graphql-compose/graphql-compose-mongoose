jest.unmock('mongoose');
import mongoose, { Schema } from 'mongoose';

jest.unmock('./contactsSchema');
import ContactsSchema from './contactsSchema';

jest.unmock('./enumEmployment');
import enumEmployment from './enumEmployment';

jest.unmock('./languagesSchema');
import LanguagesSchema from './languagesSchema';

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

    name: {
      type: String,
      description: 'Person name',
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
      description: 'Contacts of person (phone, skype, mail and etc)',
    },

    languages: {
      type: [LanguagesSchema],
      default: [],
      description: 'Knowledge of languages',
    },

    totalExperience: {
      type: Number,
      description: 'Work experience in months',
    },

    // createdAt, created via option `timastamp: true`

    // updatedAt, created via option `timastamp: true`

    __secretField: {
      type: String,
    }
  },
  {
    timestamps: true, // add createdAt, updatedAt fields
    toJSON: { getters: true },
    toObject: { virtuals: true },
  }
);

UserSchema.index({ name: 1, totalExperience: -1 });

UserSchema.virtual('nameVirtual').get(function () {
  return 'VirtualFieldValue' + this._id;
});


const UserModel = mongoose.model('UserModel', UserSchema);

export default UserModel;
