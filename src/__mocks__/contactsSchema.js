/* @flow */

import type { Schema as SchemaType } from 'mongoose';
import { Schema } from './mongooseCommon';

const ContactsSchema: SchemaType<any> = new Schema({
  phones: [String],
  email: String,
  skype: String,
  locationId: Schema.Types.ObjectId,
});

export default ContactsSchema;
