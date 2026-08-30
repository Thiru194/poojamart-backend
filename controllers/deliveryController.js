const User = require('../models/UserModel');
const Order = require('../models/OrderModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/* ---- Delivery partner: register (pending admin approval) ---- */
const registerPartner = async (req, res) => {
  try {
    const { name, email, phone, password, vehicleType } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'delivery',
      isApproved: false,
      vehicleType: vehicleType || ''
    });

    res.status(201).json({
      message:
        'Registration successful. Your account is pending admin approval.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---- Delivery partner: login ---- */
const loginPartner = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: 'delivery' });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        message: 'Your account is awaiting admin approval.'
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isApproved: user.isApproved,
      vehicleType: user.vehicleType,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---- Admin: list all delivery partners ---- */
const getPartners = async (req, res) => {
  try {
    const partners = await User.find({ role: 'delivery' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(partners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---- Admin: only approved partners (for order assignment dropdown) ---- */
const getApprovedPartners = async (req, res) => {
  try {
    const partners = await User.find({
      role: 'delivery',
      isApproved: true
    }).select('_id name phone vehicleType');

    res.json(partners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---- Admin: approve / unapprove a partner ---- */
const setPartnerApproval = async (req, res) => {
  try {
    const partner = await User.findOne({
      _id: req.params.id,
      role: 'delivery'
    });

    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    partner.isApproved = req.body.isApproved;
    await partner.save();

    res.json({
      _id: partner._id,
      name: partner.name,
      isApproved: partner.isApproved
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---- Admin: remove a partner ---- */
const deletePartner = async (req, res) => {
  try {
    await User.deleteOne({ _id: req.params.id, role: 'delivery' });
    res.json({ message: 'Partner removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---- Partner: orders assigned to me ---- */
const getPartnerOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      deliveryPartner: req.params.partnerId
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---- Partner: dashboard stats ---- */
const getPartnerStats = async (req, res) => {
  try {
    const partnerId = req.params.partnerId;

    const orders = await Order.find({ deliveryPartner: partnerId });

    const delivered = orders.filter((o) => o.status === 'Delivered');
    /* Cancelled orders are no longer the partner's to deliver */
    const pending = orders.filter(
      (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
    );

    /* Deliveries completed today */
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const deliveredToday = delivered.filter(
      (o) => o.deliveredAt && new Date(o.deliveredAt) >= startOfDay
    );

    /* Simple flat earning model: ₹40 per completed delivery */
    const PER_DELIVERY = 40;

    res.json({
      totalAssigned: orders.length,
      delivered: delivered.length,
      pending: pending.length,
      deliveredToday: deliveredToday.length,
      codToCollect: pending.filter((o) => !o.codCollected).length,
      earnings: delivered.length * PER_DELIVERY
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerPartner,
  loginPartner,
  getPartners,
  getApprovedPartners,
  setPartnerApproval,
  deletePartner,
  getPartnerOrders,
  getPartnerStats
};
