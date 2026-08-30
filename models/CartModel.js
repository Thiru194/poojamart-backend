const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'User',

      required: true
    },

    productId: {
      type: String,

      required: true
    },

    name: {
      type: String,

      required: true
    },

    /* Not required — a product with no thumbnail must still be purchasable.
       The UI falls back to a placeholder. */
    image: {
      type: String,

      default: ''
    },

    price: {
      type: Number,

      required: true
    },

    quantity: {
      type: Number,

      default: 1
    }
  },

  {
    timestamps: true
  }
);

module.exports = mongoose.model('Cart', cartSchema);
