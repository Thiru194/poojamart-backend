const Coupon = require('../models/CouponModel');

const User = require('../models/UserModel');

const sendSms = require('../utils/smsClient');

const { createNotification } = require('./notificationController');

/* Get Coupons */

const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find()

      .sort({
        createdAt: -1
      });

    res.json(coupons);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* Create Coupon */

const createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create({
      code: req.body.code.toUpperCase(),

      discountPercentage: req.body.discountPercentage,

      expiryDate: req.body.expiryDate,

      usageLimit: req.body.usageLimit || 100,

      usedCount: 0,

      isActive: true,

      /* Empty array = applies to all products (store-wide). */
      products: Array.isArray(req.body.products) ? req.body.products : []
    });

    res.status(201).json(coupon);

    /* Optionally announce the offer to every customer (admin ticks a checkbox
       when creating the coupon). Runs in the background. */
    if (req.body.notifyCustomers) {
      notifyCouponOffer(coupon).catch((err) =>
        console.log('Offer broadcast failed:', err.message)
      );
    }
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* Announce a newly created offer/coupon to every customer.
   Primary channel: the FREE in-app notification bell (needs no SMS gateway).
   Secondary: SMS — a console no-op until Twilio credentials are configured. */
const notifyCouponOffer = async (coupon) => {
  const users = await User.find({ role: 'customer' }).select('email phone');

  const expiry = new Date(coupon.expiryDate).toLocaleDateString('en-IN');

  const scope =
    coupon.products && coupon.products.length > 0
      ? ' on selected products'
      : '';

  const message =
    `Use code ${coupon.code} to get ${coupon.discountPercentage}% ` +
    `OFF${scope}! Valid till ${expiry}.`;

  let sent = 0;

  for (const user of users) {
    /* In-app notification (shows in the customer's 🔔 bell) */
    if (user.email) {
      try {
        await createNotification(user.email, '🎟 New Offer Just Dropped', message);

        sent += 1;
      } catch (err) {
        console.log(`Offer notification to ${user.email} failed:`, err.message);
      }
    }

    /* SMS (no-ops to console until a gateway is configured) */
    if (user.phone) {
      try {
        await sendSms(
          user.phone,
          `PoojaMart Offer: ${message} Shop now: ` +
            `${process.env.FRONTEND_URL || 'http://localhost:3000'}`
        );
      } catch (err) {
        console.log(`Offer SMS to ${user.phone} failed:`, err.message);
      }
    }
  }

  console.log(`Offer announced in-app to ${sent} customer(s)`);
};

/* Delete Coupon */

const deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Coupon Deleted'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const verifyCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({
      code: {
        $regex: `^${req.body.code.trim()}$`,
        $options: 'i'
      }
    });

    if (!coupon) {
      return res.status(404).json({
        message: 'Invalid Coupon'
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        message: 'Coupon Inactive'
      });
    }

    if (new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({
        message: 'Coupon Expired'
      });
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        message: 'Coupon Usage Limit Reached'
      });
    }

    /* Product scoping: if the coupon is limited to specific products, the
       discount applies only to the eligible items in the cart. A store-wide
       coupon (empty products list) applies to the whole cart. */
    const cartItems = Array.isArray(req.body.cartItems)
      ? req.body.cartItems
      : [];

    const isScoped =
      Array.isArray(coupon.products) && coupon.products.length > 0;

    const lineTotal = (item) =>
      Number(item.price || 0) * Number(item.quantity || 1);

    let eligibleSubtotal;

    if (isScoped) {
      const allowed = new Set(coupon.products.map((id) => String(id)));

      eligibleSubtotal = cartItems
        .filter((item) => allowed.has(String(item.productId)))
        .reduce((sum, item) => sum + lineTotal(item), 0);

      if (eligibleSubtotal <= 0) {
        return res.status(400).json({
          message: 'This coupon is not valid for the items in your cart'
        });
      }
    } else {
      eligibleSubtotal = cartItems.reduce(
        (sum, item) => sum + lineTotal(item),
        0
      );
    }

    const discountAmount = Math.round(
      (eligibleSubtotal * coupon.discountPercentage) / 100
    );

    res.json({
      discount: coupon.discountPercentage,

      discountAmount,

      productSpecific: isScoped
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        message: 'Coupon Not Found'
      });
    }

    coupon.isActive = !coupon.isActive;

    await coupon.save();

    res.json(coupon);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getActiveCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,

      expiryDate: {
        $gte: new Date()
      }
    });

    res.json(coupons);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const useCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({
      code: req.params.code
    });

    if (!coupon) {
      return res.status(404).json({
        message: 'Coupon Not Found'
      });
    }

    coupon.usedCount += 1;

    await coupon.save();

    res.json({
      message: 'Coupon Usage Updated'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
module.exports = {
  getCoupons,

  createCoupon,

  deleteCoupon,

  verifyCoupon,

  toggleCouponStatus,

  getActiveCoupons,

  useCoupon
};
