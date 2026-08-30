const express = require('express');

const router = express.Router();

const {
  getNotifications,

  markAsRead
} = require('../controllers/notificationController');

router.get(
  '/:email',

  getNotifications
);

router.put(
  '/read/:id',

  markAsRead
);

module.exports = router;
