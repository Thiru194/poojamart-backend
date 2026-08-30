const express = require('express');

const router = express.Router();

const {
  createPayment,
  verifyPayment
} = require('../controllers/paymentController');

/* Open a Razorpay order and hand back the id the checkout needs */
router.post('/', createPayment);

/* Check the signature Razorpay returned after the customer paid */
router.post('/verify', verifyPayment);

module.exports = router;
