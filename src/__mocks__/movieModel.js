import mongoose, { Schema } from 'mongoose';

const MovieSchema = new Schema({
  _id: String,

  characters: {
    type: [ String ], // redundant but i need it.
    description: 'A character in the Movie, Person or Droid.'
  },

  director: {
    type: String,  // id of director
    description: 'Directed the movie.'
  },

  imdbRatings: String,
  releaseDate: String,
});

export const MovieModel = mongoose.model('Movie', MovieSchema);
