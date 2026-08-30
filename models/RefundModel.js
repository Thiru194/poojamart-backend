const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'User',

      required: true
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'Order',

      required: true
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'Product',

      required: true
    },

    reason: {
      type: String,

      required: true
    },
    userName: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },

    productName: {
      type: String,
      default: ''
    },

    orderNumber: {
      type: String,
      default: ''
    },
    description: {
      type: String,

      default: ''
    },

    /* Photos uploaded by the customer as evidence (e.g. a broken product). */
    images: [
      {
        type: String
      }
    ],

    status: {
      type: String,

      enum: ['Pending', 'Approved', 'Rejected', 'Refunded'],

      default: 'Pending'
    },

    /* Set when the request reaches a final state (Rejected or Refunded).
       Drives the TTL index below, which auto-deletes the record 5 days later.
       Cleared if the status moves back to Pending or Approved, which cancels
       the countdown. */
    settledAt: {
      type: Date,
      default: null
    }
  },

  {
    timestamps: true
  }
);

/* TTL index: MongoDB deletes a refund 5 days (432000s) after its `settledAt`
   time. Records with settledAt = null never expire.

   Note: Mongo fixes expireAfterSeconds when the index is first created. If this
   index already exists with a different value, changing the number here has no
   effect — drop the index (or run collMod) before the new value applies. */
refundSchema.index({ settledAt: 1 }, { expireAfterSeconds: 5 * 24 * 60 * 60 });

module.exports = mongoose.model('Refund', refundSchema);
