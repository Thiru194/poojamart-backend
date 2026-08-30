const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: 'User',

      required: true
    },

    customerName: String,

    phone: String,

    address: String,

    city: String,

    pincode: String,

    orderItems: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,

          ref: 'Product'
        },

        name: String,

        quantity: {
          type: Number,

          default: 1
        },

        price: Number
      }
    ],

    total: Number,

    couponCode: {
      type: String,

      default: ''
    },

    discount: {
      type: Number,

      default: 0
    },

    discountAmount: {
      type: Number,

      default: 0
    },

    paymentId: {
      type: String
    },

    /* Razorpay's own order id, kept so a payment can be reconciled against
       the gateway dashboard later. Empty for cash on delivery. */
    razorpayOrderId: {
      type: String,

      default: ''
    },

    /* Only ever set to Paid after the gateway signature has been verified on
       the server. A COD order stays Pending until the cash is collected. */
    paymentStatus: {
      type: String,

      enum: ['Pending', 'Paid', 'Failed'],

      default: 'Pending'
    },

    paidAt: {
      type: Date,

      default: null
    },

    status: {
      type: String,

      /* Confirmed is where a verified online payment lands. COD orders skip
         it and start at Processing, since nothing has been paid yet. */
      enum: [
        'Confirmed',
        'Processing',
        'Shipped',
        'Out For Delivery',
        'Delivered',
        'Cancelled'
      ],

      default: 'Processing'
    },

    deliveredAt: {
      type: Date
    },

    /* Set when the customer cancels the order. Cancellation is only allowed
       before the order goes Out For Delivery. */
    cancelledAt: {
      type: Date
    },

    cancelReason: {
      type: String,
      default: ''
    },

    cancelDescription: {
      type: String,
      default: ''
    },

    /* Delivery partner assigned by admin */
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    /* Cash-on-delivery collected flag (set by the partner) */
    codCollected: {
      type: Boolean,
      default: false
    },

    /* One-time code emailed to the customer when the order goes Out For
       Delivery. The delivery partner must enter it to mark it Delivered.
       Cleared once consumed. */
    deliveryOtp: {
      type: String,
      default: ''
    }
  },

  {
    timestamps: true
  }
);

module.exports = mongoose.model('Order', orderSchema);
