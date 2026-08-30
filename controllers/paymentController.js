const crypto = require('crypto');

const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,

  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/*
  Step 1 - open an order on Razorpay.

  The rupee amount is converted to paise here rather than on the client, so
  the unit is never something the browser gets to decide. The publishable
  key id travels back with the order: the checkout needs it, and sourcing it
  from here means switching between test and live keys is a change to the
  server environment alone, with no edit to the frontend.
*/

const createPayment = async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: 'Invalid payment amount'
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),

      currency: 'INR',

      receipt: `receipt_${Date.now()}`
    });

    res.json({
      id: order.id,

      amount: order.amount,

      currency: order.currency,

      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.log('Razorpay order creation failed:', error.message);

    res.status(500).json({
      message: error.message
    });
  }
};

/*
  Step 3 - prove the payment actually happened.

  Razorpay signs the string `<razorpay_order_id>|<razorpay_payment_id>` with
  our key secret. Recomputing that HMAC and finding it matches is the only
  thing separating a real payment from a browser that simply claims one —
  everything the client hands back can otherwise be typed by hand.

  The comparison uses timingSafeEqual so the check itself gives nothing away
  about how close a forged signature came.
*/

const isSignatureValid = ({
  razorpay_order_id: orderId,
  razorpay_payment_id: paymentId,
  razorpay_signature: signature
}) => {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');

  const b = Buffer.from(String(signature), 'utf8');

  /* timingSafeEqual throws on a length mismatch, so that is checked first */
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/*
  The verification endpoint the checkout calls the moment Razorpay hands back
  a result. It reports the verdict early so the customer sees a truthful
  message, but it is NOT what protects the database — order creation runs the
  same check again before writing anything, so skipping this call gains an
  attacker nothing.
*/

const verifyPayment = async (req, res) => {
  if (!isSignatureValid(req.body)) {
    return res.status(400).json({
      verified: false,

      message: 'Payment signature verification failed'
    });
  }

  res.json({
    verified: true,

    message: 'Payment verified'
  });
};

module.exports = {
  createPayment,

  verifyPayment,

  isSignatureValid
};
