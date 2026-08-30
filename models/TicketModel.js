const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true
    },
    productId: {
      type: String,
      default: ''
    },

    productName: {
      type: String,
      default: ''
    },

    orderId: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      required: true
    },

    subject: {
      type: String,
      required: true
    },

    message: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Closed'],
      default: 'Open'
    },

    adminReply: {
      type: String,
      default: ''
    },

    // Set when status becomes "Closed". Used by the TTL index below
    // to auto-delete closed tickets 7 days later. Cleared if reopened.
    closedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// TTL index: MongoDB automatically deletes a ticket 7 days (604800s)
// after its `closedAt` time. Tickets with closedAt = null never expire.
ticketSchema.index({ closedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('Ticket', ticketSchema);
