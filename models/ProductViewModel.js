const mongoose = require('mongoose');

/*
  One document per completed "dwell" on a product. A single visit can
  produce several documents (e.g. the user switches tabs and comes back),
  which are summed on read. `visitorId` is the userId for logged-in users
  or a persisted anonymous id for guests, so every visit is tracked.
*/

const productViewSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    /* Denormalized so admin can attribute time to a named customer */
    userName: {
      type: String,
      default: 'Guest'
    },

    userEmail: {
      type: String,
      default: ''
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },

    productName: {
      type: String
    },

    image: {
      type: String
    },

    category: {
      type: String
    },

    price: {
      type: Number
    },

    /* Seconds spent on the product this dwell */
    duration: {
      type: Number,
      required: true,
      min: 0
    },

    /* Where the dwell happened */
    source: {
      type: String,
      enum: ['details', 'quickview'],
      default: 'details'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ProductView', productViewSchema);
