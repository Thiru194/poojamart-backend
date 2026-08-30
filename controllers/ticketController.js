const Ticket = require('../models/TicketModel');
const sendEmail = require('../utils/sendEmail');
const supportEmailTemplate = require('../utils/supportEmailTemplate');
const { createNotification } = require('./notificationController');
// Create Ticket

const createTicket = async (req, res) => {
  try {
    const {
      name,
      email,

      productId,
      productName,
      orderId,

      category,
      subject,
      message
    } = req.body;

    const ticket = await Ticket.create({
      name,
      email,

      productId,
      productName,
      orderId,

      category,
      subject,
      message
    });
    /* Fire-and-forget so ticket creation isn't slowed (or failed) by SMTP */
    sendEmail(
      email,
      '🎫 Support Ticket Created — PoojaMart',
      supportEmailTemplate({
        heading: '🎫 Ticket Created Successfully',
        tagline: 'SUPPORT TICKET',
        name,
        intro:
          'We have received your support request. Our team will review it and get back to you soon — you can track replies anytime under <strong>My Tickets</strong>.',
        rows: [
          { label: '🆔 Ticket ID', value: String(ticket._id) },
          { label: '📦 Product', value: productName || 'N/A' },
          { label: '📂 Category', value: category },
          { label: '📝 Subject', value: subject }
        ],
        status: 'Open',
        ctaText: '🎫 Track My Ticket',
        ctaUrl: `http://localhost:3000/ticket/${ticket._id}`
      })
    ).catch((err) => {
      console.log('Ticket created email failed:', err.message);
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message: error.message
    });
  }
};
// Get All Tickets

const getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({
      createdAt: -1
    });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message
    });
  }
};
const updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket Not Found'
      });
    }

    const oldStatus = ticket.status;

    ticket.status = req.body.status || ticket.status;

    ticket.adminReply = req.body.adminReply || ticket.adminReply;

    // Stamp closedAt when a ticket is closed (starts the 7-day
    // auto-delete countdown via the TTL index), clear it if reopened.
    if (ticket.status === 'Closed' && oldStatus !== 'Closed') {
      ticket.closedAt = new Date();
    } else if (ticket.status !== 'Closed') {
      ticket.closedAt = null;
    }

    await ticket.save();
    await createNotification(
      ticket.email,

      '🎫 Ticket Updated',

      `Your ticket "${ticket.subject}"
   status changed to ${ticket.status}`,

      ticket._id
    );
    if (req.body.adminReply && req.body.adminReply !== '') {
      await createNotification(
        ticket.email,

        '💬 Admin Replied',

        req.body.adminReply,

        ticket._id
      );
    }
    res.json(ticket);

    sendEmail(
      ticket.email,
      `🎫 Ticket Update — ${ticket.status} | PoojaMart`,
      supportEmailTemplate({
        heading: '🎫 Your Ticket Has Been Updated',
        tagline: 'SUPPORT UPDATE',
        name: ticket.name,
        intro: `The status of your ticket "<strong>${ticket.subject}</strong>" changed from <strong>${oldStatus}</strong> to:`,
        rows: [
          { label: '🆔 Ticket ID', value: String(ticket._id) },
          { label: '📦 Product', value: ticket.productName || 'N/A' },
          { label: '📂 Category', value: ticket.category },
          { label: '📝 Subject', value: ticket.subject }
        ],
        status: ticket.status,
        box: ticket.adminReply
          ? { title: '💬 Reply from our support team', text: ticket.adminReply }
          : null,
        ctaText: '🎫 View My Ticket',
        ctaUrl: `http://localhost:3000/ticket/${ticket._id}`
      })
    ).catch((err) => {
      console.log('Ticket update email failed:', err.message);
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message: error.message
    });
  }
};
// Get Single Ticket
const deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket Not Found'
      });
    }

    await Ticket.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Ticket Deleted Successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getRecentTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()

      .sort({
        createdAt: -1
      })

      .limit(5);

    res.json(tickets);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket Not Found'
      });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message
    });
  }
};
const getUserTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({
      email: req.params.email
    }).sort({
      createdAt: -1
    });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
// Ticket Analytics

const getTicketStats = async (req, res) => {
  try {
    const total = await Ticket.countDocuments();

    const open = await Ticket.countDocuments({
      status: 'Open'
    });

    const inProgress = await Ticket.countDocuments({
      status: 'In Progress'
    });

    const closed = await Ticket.countDocuments({
      status: 'Closed'
    });

    res.json({
      total,
      open,
      inProgress,
      closed
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  getUserTickets,
  updateTicket,
  getTicketStats,
  deleteTicket,
  getRecentTickets
};
