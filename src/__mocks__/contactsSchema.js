import { Schema } from './mongooseCommon';

const ContactsSchema = new Schema({
  phones: [String],
  email: String,
  skype: String,
  locationId: Schema.Types.ObjectId,
});

export default ContactsSchema;
