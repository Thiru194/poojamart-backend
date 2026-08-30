const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,

      required: true,

      unique: true
    },

    discountPercentage: {
      type: Number,

      required: true
    },

    minOrderAmount: {
      type: Number,

      default: 0
    },

    expiryDate: {
      type: Date,

      required: true
    },

    isActive: {
      type: Boolean,

      default: true
    },

    usageLimit: {
      type: Number,

      default: 100
    },

    usedCount: {
      type: Number,

      default: 0
    },

    /* Products this coupon applies to. Empty = applies to ALL products
       (store-wide). When set, the discount only applies to these products. */
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,

        ref: 'Product'
      }
    ]
  },

  {
    timestamps: true
  }
);

module.exports = mongoose.model('Coupon', couponSchema);
