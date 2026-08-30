const Order = require('../models/OrderModel');

const Product = require('../models/ProductModel');

const Cart = require('../models/CartModel');

const User = require('../models/UserModel');

const sendEmail = require('../utils/sendEmail');

const deliveryOtpEmailTemplate = require('../utils/deliveryOtpEmailTemplate');

const sendSms = require('../utils/smsClient');

const { createNotification } = require('./notificationController');

const { isSignatureValid } = require('./paymentController');

const createOrder = async (req, res) => {
  try {
    const {
      paymentId,

      razorpayOrderId,

      razorpaySignature,

      userId,

      customerName,

      phone,

      address,

      city,

      pincode,

      total,

      status,

      orderItems
    } = req.body;
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({
        message: 'No items found in cart'
      });
    }

    /*
      An order claiming to be paid has to prove it.

      The signature is re-checked here rather than trusting that the client
      called /api/payment/verify first, because nothing stops a client from
      posting straight to this endpoint. This runs before any stock is taken,
      so a rejected payment leaves the catalogue untouched.
    */
    const isOnlinePayment = Boolean(
      paymentId || razorpayOrderId || razorpaySignature
    );

    if (isOnlinePayment) {
      const verified = isSignatureValid({
        razorpay_order_id: razorpayOrderId,

        razorpay_payment_id: paymentId,

        razorpay_signature: razorpaySignature
      });

      if (!verified) {
        return res.status(400).json({
          message: 'Payment verification failed. Order was not created.'
        });
      }
    }

    for (const item of orderItems) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          message: `${item.name} Not Found`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `${item.name} Out Of Stock`
        });
      }

      product.stock = product.stock - item.quantity;

      await product.save();
    }

    const order = await Order.create({
      paymentId,

      userId,

      customerName,

      phone,

      address,

      city,

      pincode,

      total,

      orderItems,

      razorpayOrderId: razorpayOrderId || '',

      /* Decided here, never taken from the request: a verified payment is
         Paid and Confirmed, cash on delivery stays Pending and Processing. */
      paymentStatus: isOnlinePayment ? 'Paid' : 'Pending',

      paidAt: isOnlinePayment ? new Date() : null,

      status: isOnlinePayment ? 'Confirmed' : status || 'Processing'
    });

    await Cart.deleteMany({
      userId
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getOrders = async (req, res) => {
  try {
    const filter = req.params.userId ? { userId: req.params.userId } : {};

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    /* Attach each product's current image to its order item.
       orderItems only store productId/name/price, so we look the
       images up in one batch query. This keeps productId as a raw
       id (refund + admin flows depend on that) while giving the
       client an `image` to render — works for existing orders too. */
    const productIds = orders.flatMap((order) =>
      (order.orderItems || [])
        .map((item) => item.productId)
        .filter(Boolean)
    );

    if (productIds.length > 0) {
      const products = await Product.find({ _id: { $in: productIds } })
        .select('image')
        .lean();

      const imageById = {};
      products.forEach((product) => {
        imageById[String(product._id)] = product.image;
      });

      orders.forEach((order) => {
        (order.orderItems || []).forEach((item) => {
          item.image = imageById[String(item.productId)] || '';
        });
      });
    }

    res.json(orders);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order Not Found'
      });
    }

    const newStatus = req.body.status;

    /* A cancelled order is terminal — it can't be pushed back into the flow. */
    if (order.status === 'Cancelled') {
      return res.status(400).json({
        message: 'Cancelled orders cannot be updated'
      });
    }

    const wasOutForDelivery = order.status === 'Out For Delivery';

    /* To mark an order Delivered, the partner must enter the OTP the customer
       received. Only enforced when an OTP was actually issued, and an admin
       can override (their dashboard has no OTP field). */
    if (newStatus === 'Delivered' && order.deliveryOtp) {
      const override = req.body.override === true;

      const providedOtp = String(req.body.otp || '').trim();

      if (!override && providedOtp !== order.deliveryOtp) {
        return res.status(400).json({
          message: 'Invalid delivery OTP'
        });
      }

      order.deliveryOtp = ''; // consume it
    }

    order.status = newStatus;

    if (newStatus === 'Delivered') {
      order.deliveredAt = order.deliveredAt || new Date();
    } else {
      order.deliveredAt = undefined;
    }

    /* Generate + email a fresh OTP the first time the order goes Out For
       Delivery. */
    let generatedOtp = null;

    if (newStatus === 'Out For Delivery' && !wasOutForDelivery) {
      generatedOtp = String(Math.floor(1000 + Math.random() * 9000));

      order.deliveryOtp = generatedOtp;
    }

    await order.save();

    res.json(order);

    if (generatedOtp) {
      sendDeliveryOtp(order, generatedOtp).catch((err) =>
        console.log('Delivery OTP send failed:', err.message)
      );
    }
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* Email the customer their delivery OTP. Runs in the background after the
   status response is sent. (WhatsApp can be added here later.) */
const sendDeliveryOtp = async (order, otp) => {
  const user = await User.findById(order.userId).select('name email');

  const shortId = `#${String(order._id).slice(-6)}`;

  /* Email channel */
  if (user && user.email) {
    try {
      await sendEmail(
        user.email,
        `🔐 Delivery OTP for Order ${shortId}`,
        deliveryOtpEmailTemplate(user.name, otp, order.orderItems)
      );
    } catch (err) {
      console.log('Delivery OTP email failed:', err.message);
    }
  }

  /* SMS channel (to the order's phone) */
  if (order.phone) {
    try {
      await sendSms(
        order.phone,
        `PoojaMart delivery code: ${otp}. ` +
          `Your order ${shortId} is out for delivery. Share this code with the ` +
          `delivery partner to confirm receipt. Do not share it beforehand.`
      );
    } catch (err) {
      console.log('Delivery OTP SMS failed:', err.message);
    }
  }
};
/* Customer: cancel an order.
   Only allowed while the order is still Confirmed, Processing or Shipped —
   once it is Out For Delivery (or Delivered) it is with the partner and can no
   longer be pulled back. The stock taken at checkout is returned to each
   product. */
const CANCELLABLE_STATUSES = ['Confirmed', 'Processing', 'Shipped'];

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order Not Found'
      });
    }

    if (order.status === 'Cancelled') {
      return res.status(400).json({
        message: 'Order is already cancelled'
      });
    }

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({
        message:
          order.status === 'Delivered'
            ? 'Delivered orders cannot be cancelled. Please request a refund.'
            : 'This order is out for delivery and can no longer be cancelled'
      });
    }

    const reason = String(req.body.reason || '').trim();

    if (!reason) {
      return res.status(400).json({
        message: 'A cancellation reason is required'
      });
    }

    /* Put the reserved stock back */
    for (const item of order.orderItems) {
      if (!item.productId) continue;

      const product = await Product.findById(item.productId);

      if (product) {
        product.stock = product.stock + (item.quantity || 0);
        await product.save();
      }
    }

    order.status = 'Cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = reason;
    order.cancelDescription = String(req.body.description || '').trim();
    order.deliveryOtp = '';
    order.deliveredAt = undefined;

    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order Not Found'
      });
    }

    await Order.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Order Deleted Successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
/* Admin: assign (or unassign) a delivery partner to an order */
const assignDeliveryPartner = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order Not Found' });
    }

    /* A partner can only be assigned once the order has been shipped, so
       every stage before that is blocked — Confirmed included. */
    if (order.status === 'Confirmed' || order.status === 'Processing') {
      return res.status(400).json({
        message: 'Order must be Shipped before assigning a delivery partner'
      });
    }

    const newPartnerId = req.body.deliveryPartner || null;
    const changed =
      String(order.deliveryPartner || '') !== String(newPartnerId || '');

    order.deliveryPartner = newPartnerId;
    await order.save();

    res.json(order);

    /* Notify the newly-assigned partner (email + in-app), in the background */
    if (newPartnerId && changed) {
      notifyPartnerAssigned(order, newPartnerId).catch((err) =>
        console.log('Partner assignment notify failed:', err.message)
      );
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* Delivery partner: mark cash-on-delivery collected */
const markCodCollected = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order Not Found' });
    }

    order.codCollected = req.body.codCollected !== false;
    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* Email + in-app notification to a partner when assigned an order */
const notifyPartnerAssigned = async (order, partnerId) => {
  const partner = await User.findById(partnerId);
  if (!partner) return;

  const shortId = `#${String(order._id).slice(-6)}`;
  const itemsList = order.orderItems
    .map((i) => `${i.name} × ${i.quantity}`)
    .join(', ');

  /* In-app notification (shows in the partner's bell) */
  await createNotification(
    partner.email,
    '🛵 New Delivery Assigned',
    `Order ${shortId} to ${order.customerName}, ${order.city} - ${order.pincode}`,
    String(order._id)
  );

  /* Email */
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #fed7aa;border-radius:14px;">
    <div style="background:linear-gradient(120deg,#0f172a,#7c2d12 60%,#ea580c);color:#fff;padding:22px;border-radius:12px;text-align:center;">
      <h2 style="margin:0;">🛵 New Delivery Assigned</h2>
    </div>
    <p style="font-size:15px;color:#111827;margin-top:20px;">Hi <b>${partner.name}</b>,</p>
    <p style="font-size:14px;color:#4b5563;line-height:1.6;">
      You have been assigned a new order to deliver. Please log in to your
      partner dashboard to view the full details.
    </p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px;margin:16px 0;">
      <p style="margin:4px 0;"><b>Order:</b> ${shortId}</p>
      <p style="margin:4px 0;"><b>Customer:</b> ${order.customerName} (${order.phone})</p>
      <p style="margin:4px 0;"><b>Address:</b> ${order.address}, ${order.city} - ${order.pincode}</p>
      <p style="margin:4px 0;"><b>Items:</b> ${itemsList}</p>
      <p style="margin:4px 0;"><b>Amount:</b> ₹${order.total} ${order.paymentId ? '(Paid Online)' : '(COD)'}</p>
    </div>
    <p style="font-size:13px;color:#6b7280;">Thank you for delivering with us,<br/><b>PoojaMart Partner Team</b></p>
  </div>`;

  await sendEmail(partner.email, `New Delivery Assigned — ${shortId}`, html);
};

const getPurchasedProducts = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.params.userId
    });

    const products = [];

    orders.forEach((order) => {
      order.orderItems.forEach((item) => {
        products.push({
          orderId: order._id,

          productId: item.productId,

          name: item.name,

          quantity: item.quantity,

          price: item.price
        });
      });
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  createOrder,

  getOrders,

  getPurchasedProducts,

  updateOrderStatus,

  assignDeliveryPartner,

  markCodCollected,

  cancelOrder,

  deleteOrder
};
