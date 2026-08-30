const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,

      required: true
    },
    ticketId: {
      type: String,

      default: ''
    },

    title: {
      type: String,

      required: true
    },

    message: {
      type: String,

      required: true
    },

    isRead: {
      type: Boolean,

      default: false
    }
  },

  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
