import { expect } from 'chai';
import mongoose from 'mongoose';
import getIndexesFromModel from '../getIndexesFromModel';

const AgentSchema = new mongoose.Schema(
  {
    subDoc: {
      field1: String,
      field2: {
        field21: String,
        field22: String,
      },
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

    relocation: {
      type: Boolean,
      description: 'Does candidate relocate to another region',
    },
  }
);

AgentSchema.set('autoIndex', false);
AgentSchema.index({ name: 1, age: -1 });
AgentSchema.index({ 'subDoc.field2': 1 });
AgentSchema.index({ name: 'text', skills: 'text' });

const AgentModel = mongoose.model('Agent', AgentSchema);

describe('getIndexesFromModel', () => {
  it('should get regular indexes and extract compound idx by default', () => {
    const idx = getIndexesFromModel(AgentModel);
    expect(idx).to.deep.have.all.members([
      { _id: 1 },
      { name: 1 },
      { name: 1, age: -1 },
      { 'subDoc.field2': 1 },
    ]);
  });

  it('should not extract compound indexes', () => {
    const idx = getIndexesFromModel(AgentModel, { extractCompound: false });
    expect(idx).to.deep.have.all.members([
      { _id: 1 },
      { name: 1, age: -1 },
      { 'subDoc.field2': 1 },
    ]);
  });

  it('it should return specialIndexes indexes', () => {
    const idx = getIndexesFromModel(AgentModel, { skipSpecificIndexes : false });
    expect(idx).to.deep.have.all.members([
      { _id: 1 },
      { name: 1 },
      { name: 1, age: -1 },
      { 'subDoc.field2': 1 },
      { name: 'text' },
      { name: 'text', skills: 'text' },
    ]);
  });
});
