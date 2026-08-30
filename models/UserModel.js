const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    phone: {
      type: String,
      required: true
    },

    gender: {
      type: String,
      default: ''
    },

    dateOfBirth: {
      type: Date
    },

    address: {
      type: String,
      default: ''
    },

    city: {
      type: String,
      default: ''
    },

    state: {
      type: String,
      default: ''
    },

    pincode: {
      type: String,
      default: ''
    },

    profileImage: {
      type: String,
      default: ''
    },

    password: {
      type: String,
      required: true
    },

    isAdmin: {
      type: Boolean,
      default: false
    },

    /* Account type. Delivery partners get a separate portal + dashboard. */
    role: {
      type: String,
      enum: ['customer', 'delivery'],
      default: 'customer'
    },

    /* Delivery partners must be approved by an admin before they can work. */
    isApproved: {
      type: Boolean,
      default: false
    },

    /* Optional delivery-partner details */
    vehicleType: {
      type: String,
      default: ''
    },

    resetOtp: {
      type: String,
      default: ''
    },

    resetOtpExpiry: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
