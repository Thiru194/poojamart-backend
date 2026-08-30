const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'User',

      required: true
    },

    name: String,

    phone: String,

    address: String,

    city: String,

    pincode: String
  },

  {
    timestamps: true
  }
);

module.exports = mongoose.model('Address', addressSchema);
