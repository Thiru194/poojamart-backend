const Notification = require('../models/NotificationModel');

// Get User Notifications

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userEmail: req.params.email
    })

      .sort({
        createdAt: -1
      });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// Create Notification

const createNotification = async (
  userEmail,

  title,

  message,

  ticketId = ''
) => {
  await Notification.create({
    userEmail,

    title,

    message,

    ticketId
  });
};

// Mark As Read

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        message: 'Notification Not Found'
      });
    }

    notification.isRead = true;

    await notification.save();

    res.json(notification);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  getNotifications,

  createNotification,

  markAsRead
};
