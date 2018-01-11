/* @flow */

import mongoose from 'mongoose';
import { composeWithMongoose } from '../index';

describe('github issues checks', () => {
  it('#78 Mongoose and Discriminators', () => {
    const options = { discriminatorKey: 'kind' };

    const eventSchema = new mongoose.Schema({ time: Date }, options);
    const Event = mongoose.model('GenericEvent', eventSchema);

    const clickedLinkSchema = new mongoose.Schema({ url: String }, options);
    const ClickedLinkEvent = Event.discriminator('ClickedLinkEvent', clickedLinkSchema);

    const EventTC = composeWithMongoose(Event);
    const ClickedLinkEventTC = composeWithMongoose(ClickedLinkEvent);

    expect(EventTC.getFieldNames()).toEqual(['time', '_id', 'kind']);
    expect(ClickedLinkEventTC.getFieldNames()).toEqual(['url', '_id', 'time', 'kind']);
  });
});
