jest.unmock('mongoose');
import mongoose, { Schema } from 'mongoose';

const ContactsSchema = new Schema(
  {
    phones: [String],
    email: String,
    skype: String,
  }
);

export default ContactsSchema;
