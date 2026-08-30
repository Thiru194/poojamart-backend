const express = require('express');

const router = express.Router();

const {
  createTicket,
  getTickets,
  getTicketById,
  getUserTickets,
  updateTicket,
  getTicketStats,
  deleteTicket,
  getRecentTickets
} = require('../controllers/ticketController');

// Create Ticket

router.post('/', createTicket);

// Get All Tickets

router.get('/', getTickets);

// Get Single Ticket
router.get('/stats', getTicketStats);
router.get('/recent', getRecentTickets);
router.get('/:id', getTicketById);
router.get('/user/:email', getUserTickets);
router.put('/:id', updateTicket);
router.delete('/:id', deleteTicket);

module.exports = router;
