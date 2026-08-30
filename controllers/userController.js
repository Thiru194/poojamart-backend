const User = require('../models/UserModel');

const sendEmail = require('../utils/sendEmail');

const otpEmailTemplate = require('../utils/otpEmailTemplate');

const welcomeEmailTemplate = require('../utils/welcomeEmailTemplate');

const bcrypt = require('bcryptjs');

const Cart = require('../models/CartModel');

const jwt = require('jsonwebtoken');

const Order = require('../models/OrderModel');

const Wishlist = require('../models/WishlistModel');

const Product = require('../models/ProductModel');

/* Register User */

const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const userExists = await User.findOne({
      email
    });

    if (userExists) {
      return res.status(400).json({
        message: 'User already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword
    });

    /* Welcome email — fire-and-forget so signup isn't slowed by SMTP */
    sendEmail(
      user.email,
      '🕉️ Welcome to PoojaMart — Divine Essentials!',
      welcomeEmailTemplate(user.name)
    ).catch((err) => {
      console.log('Welcome email failed:', err.message);
    });

    res.status(201).json({
      _id: user._id,

      name: user.name,

      email: user.email,

      phone: user.phone
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* Login User */

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        {
          id: user._id
        },

        process.env.JWT_SECRET,

        {
          expiresIn: '7d'
        }
      );

      res.json({
        _id: user._id,

        name: user.name,

        email: user.email,

        phone: user.phone,

        isAdmin: user.isAdmin,

        role: user.role,

        isApproved: user.isApproved,

        token
      });
    } else {
      res.status(401).json({
        message: 'Invalid Email or Password'
      });
    }
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.body.email
    });

    if (!user) {
      return res.status(404).json({
        message: 'User Not Found'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOtp = otp;

    user.resetOtpExpiry = Date.now() + 10 * 60 * 1000;

    await user.save();

    /*
      Respond immediately — the OTP is already saved, so the user can proceed
      to the verify screen without waiting for the SMTP send to finish. The
      email goes out in the background.
    */
    res.json({
      message: 'OTP Sent Successfully'
    });

    sendEmail(
      user.email,

      'Your PoojaMart Password Reset Code',

      otpEmailTemplate(otp, user.name, 10)
    ).catch((err) => {
      console.log('OTP email failed to send:', err.message);
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const verifyOtp = async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.body.email
    });

    if (
      !user ||
      user.resetOtp !== req.body.otp ||
      user.resetOtpExpiry < Date.now()
    ) {
      return res.status(400).json({
        message: 'Invalid OTP'
      });
    }

    res.json({
      message: 'OTP Verified'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const resetPassword = async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.body.email
    });

    if (!user) {
      return res.status(404).json({
        message: 'User Not Found'
      });
    }

    const hashedPassword = await bcrypt.hash(
      req.body.password,

      10
    );

    user.password = hashedPassword;

    user.resetOtp = '';

    user.resetOtpExpiry = null;

    await user.save();

    res.json({
      message: 'Password Updated'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    res.json({
      _id: user._id,

      name: user.name,

      email: user.email,

      phone: user.phone,

      gender: user.gender,

      dateOfBirth: user.dateOfBirth,

      address: user.address,

      city: user.city,

      state: user.state,

      pincode: user.pincode,

      profileImage: user.profileImage,

      isAdmin: user.isAdmin
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User Not Found'
      });
    }
    console.log('REQ BODY:', req.body);

    console.log('PROFILE IMAGE:', req.body.profileImage);
    user.profileImage = req.body.profileImage || user.profileImage;
    user.name = req.body.name || user.name;

    user.phone = req.body.phone || user.phone;

    user.gender = req.body.gender || user.gender;

    user.dateOfBirth = req.body.dateOfBirth || user.dateOfBirth;

    user.address = req.body.address || user.address;

    user.city = req.body.city || user.city;

    user.state = req.body.state || user.state;

    user.pincode = req.body.pincode || user.pincode;

    await user.save();

    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getAccountStats = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user._id
    });

    const wishlistCount = await Wishlist.countDocuments({
      userId: req.user._id
    });

    const cartCount = await Cart.countDocuments({
      userId: req.user._id
    });

    const totalSpent = orders.reduce(
      (acc, order) => acc + order.total,

      0
    );

    res.json({
      orders: orders.length,

      wishlist: wishlistCount,

      cart: cartCount,

      totalSpent
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: 'User Deleted'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const makeAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User Not Found'
      });
    }

    user.isAdmin = true;

    await user.save();

    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getBuyAgainProducts = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user._id
    });

    /* Roll every order line up per product, keeping how often it was bought,
       when it was last ordered, and what was paid most recently. Cancelled
       orders don't count as a purchase. */
    const byProduct = new Map();

    orders.forEach((order) => {
      if (order.status === 'Cancelled') return;

      order.orderItems.forEach((item) => {
        const pid = item.productId ? item.productId.toString() : null;

        if (!pid) return;

        const existing = byProduct.get(pid);

        if (!existing) {
          byProduct.set(pid, {
            item,
            timesBought: item.quantity || 1,
            lastOrderedAt: order.createdAt,
            lastPricePaid: item.price
          });

          return;
        }

        existing.timesBought += item.quantity || 1;

        /* Track the most recent order for the "last paid" comparison */
        if (new Date(order.createdAt) > new Date(existing.lastOrderedAt)) {
          existing.lastOrderedAt = order.createdAt;
          existing.lastPricePaid = item.price;
        }
      });
    });

    /* Enrich with the CURRENT product record — order items don't store the
       image, stock or category. */
    const ids = [...byProduct.keys()];

    const productDocs = await Product.find({ _id: { $in: ids } })
      .select('name price image stock category')
      .lean();

    const products = [];

    productDocs.forEach((product) => {
      const entry = byProduct.get(String(product._id));

      if (!entry) return;

      products.push({
        productId: product._id,
        name: product.name || entry.item.name,
        price: product.price ?? entry.item.price,
        image: product.image || '',
        stock: product.stock ?? 0,
        category: product.category || '',
        timesBought: entry.timesBought,
        lastOrderedAt: entry.lastOrderedAt,
        lastPricePaid: entry.lastPricePaid
      });
    });

    /* Most recently ordered first — that's what a shopper reorders */
    products.sort(
      (a, b) => new Date(b.lastOrderedAt) - new Date(a.lastOrderedAt)
    );

    res.json(products);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
module.exports = {
  registerUser,

  loginUser,

  getUserProfile,

  getAllUsers,

  deleteUser,

  makeAdmin,

  updateProfile,

  getAccountStats,

  forgotPassword,

  verifyOtp,

  resetPassword,

  getBuyAgainProducts
};
