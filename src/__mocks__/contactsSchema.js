import { Schema } from './mongooseCommon';

const ContactsSchema = new Schema(
  {
    phones: [String],
    email: String,
    skype: String,
  }
);

export default ContactsSchema;
