const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    category: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    /* Primary image (thumbnail / cards). Kept for backward compatibility. */
    image: {
      type: String,
      required: true
    },

    /* Full gallery — first entry usually mirrors `image`. */
    images: [
      {
        type: String
      }
    ],

    stock: {
      type: Number,
      required: true,
      default: 0
    },

    shortDescription: {
      type: String
    },

    description: {
      type: String
    },

    highlights: [
      {
        type: String
      }
    ],

    topSale: {
      type: Boolean,
      default: false
    },

    heroProduct: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Product', productSchema);
