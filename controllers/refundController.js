const path = require('path');

const fs = require('fs');

const Refund = require('../models/RefundModel');

const sendEmail = require('../utils/sendEmail');

const supportEmailTemplate = require('../utils/supportEmailTemplate');

const refundAdminEmailTemplate = require('../utils/refundAdminEmailTemplate');

// Create Refund

const createRefund = async (req, res) => {
  try {
    const refund = await Refund.create(req.body);

    res.status(201).json(refund);

    sendEmail(
      refund.email,
      '💰 Refund Request Received — PoojaMart',
      supportEmailTemplate({
        heading: '💰 Refund Request Submitted',
        tagline: 'REFUND REQUEST',
        name: refund.userName,
        intro:
          'We have received your refund request and our team will review it shortly. We\'ll email you as soon as the status changes — you can also track it anytime under <strong>My Refunds</strong>.',
        rows: [
          { label: '🧾 Order Number', value: refund.orderNumber },
          { label: '📦 Product', value: refund.productName },
          { label: '📝 Reason', value: refund.reason }
        ],
        status: 'Pending',
        ctaText: '💰 Track My Refund',
        ctaUrl: 'http://localhost:3000/my-refunds'
      })
    ).catch((err) => {
      console.log('Refund request email failed:', err.message);
    });

    /* Notify the admin (store inbox) with the request + evidence photos. */
    notifyAdminRefund(refund).catch((err) => {
      console.log('Admin refund email failed:', err.message);
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message
    });
  }
};

/* Email the store/admin inbox about a new refund request, embedding the
   customer's evidence photos inline (read off disk as CID attachments so they
   render even though the URLs point at localhost). */
const notifyAdminRefund = async (refund) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

  if (!adminEmail) {
    return;
  }

  const attachments = [];

  const cids = [];

  (refund.images || []).forEach((url, i) => {
    const filename = String(url).split('/').pop();

    const diskPath = path.join(__dirname, '..', 'uploads', filename);

    if (fs.existsSync(diskPath)) {
      const cid = `refundimg${i}`;

      attachments.push({
        filename,
        content: fs.readFileSync(diskPath),
        cid
      });

      cids.push(cid);
    }
  });

  await sendEmail(
    adminEmail,
    `🔔 New Refund Request — ${refund.orderNumber || ''}`.trim(),
    refundAdminEmailTemplate(refund, cids),
    attachments
  );
};

// Get All Refunds

const getRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find().sort({
      createdAt: -1
    });

    res.json(refunds);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getRefundStats = async (req, res) => {
  try {
    const total = await Refund.countDocuments();

    const pending = await Refund.countDocuments({
      status: 'Pending'
    });

    const approved = await Refund.countDocuments({
      status: 'Approved'
    });

    const rejected = await Refund.countDocuments({
      status: 'Rejected'
    });

    const refunded = await Refund.countDocuments({
      status: 'Refunded'
    });

    res.json({
      total,
      pending,
      approved,
      rejected,
      refunded
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
/* Statuses that end the request for good. Reaching one locks every further
   decision and starts the 5-day auto-delete handled by the TTL index. */
const FINAL_STATUSES = ['Rejected', 'Refunded'];

/* Which transitions the admin is allowed to make. Mirrors what the admin UI
   disables, enforced here too so a stale page or a direct API call cannot
   reopen a settled request. */
const canTransition = (from, to) => {
  if (from === to) return false;

  /* Rejected and Refunded are both terminal — the decision is made. */
  if (FINAL_STATUSES.includes(from)) return false;

  /* Once approved, the request cannot be rejected; it can only be paid out. */
  if (from === 'Approved' && to === 'Rejected') return false;

  return true;
};

// Update Refund Status

const updateRefundStatus = async (req, res) => {
  try {
    const refund = await Refund.findById(req.params.id);

    if (!refund) {
      return res.status(404).json({
        message: 'Refund Not Found'
      });
    }

    const nextStatus = req.body.status;

    if (nextStatus && nextStatus !== refund.status) {
      if (!canTransition(refund.status, nextStatus)) {
        return res.status(409).json({
          message: `A ${refund.status} refund cannot be changed to ${nextStatus}`
        });
      }

      refund.status = nextStatus;

      /* Stamp settledAt on a final status to start the 5-day countdown, and
         clear it if the request moves back to an open state. */
      if (FINAL_STATUSES.includes(refund.status)) {
        refund.settledAt = new Date();
      } else {
        refund.settledAt = null;
      }
    }

    await refund.save();

    res.json(refund);

    /* Friendlier intro line per status */
    const statusIntro =
      {
        Approved:
          'Great news! Your refund request has been <strong>approved</strong> and is now being processed.',
        Refunded:
          'Your refund has been <strong>completed</strong> — the amount will reflect in your account shortly. 🎉',
        Rejected:
          'After review, we were unable to approve this refund request. If you believe this is a mistake, please raise a support ticket and we\'ll take another look.',
        Pending: 'Your refund request is back under review.'
      }[refund.status] || 'Your refund request has been updated.';

    sendEmail(
      refund.email,
      `💰 Refund ${refund.status} — PoojaMart`,
      supportEmailTemplate({
        heading: '💰 Refund Status Updated',
        tagline: 'REFUND UPDATE',
        name: refund.userName,
        intro: statusIntro,
        rows: [
          { label: '🧾 Order Number', value: refund.orderNumber },
          { label: '📦 Product', value: refund.productName },
          { label: '📝 Reason', value: refund.reason }
        ],
        status: refund.status,
        ctaText: '💰 View My Refunds',
        ctaUrl: 'http://localhost:3000/my-refunds'
      })
    ).catch((err) => {
      console.log('Refund status email failed:', err.message);
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message
    });
  }
};

const getUserRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find({
      user: req.params.userId
    })

      .sort({
        createdAt: -1
      });

    res.json(refunds);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const checkRefundExists = async (req, res) => {
  try {
    const refund = await Refund.findOne({
      order: req.params.orderId,

      product: req.params.productId
    });

    res.json({
      exists: !!refund
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
module.exports = {
  createRefund,
  getRefunds,
  updateRefundStatus,
  getUserRefunds,
  checkRefundExists,
  getRefundStats
};
