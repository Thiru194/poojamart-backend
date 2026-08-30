const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'User',

      required: true
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'Product',

      required: true
    },

    userName: {
      type: String,

      required: true
    },

    rating: {
      type: Number,

      required: true
    },

    comment: {
      type: String,

      required: true
    }
  },

  {
    timestamps: true
  }
);

module.exports = mongoose.model('Review', reviewSchema);
