const jwt = require('jsonwebtoken');

const User = require('../models/UserModel');

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');

      return next();
    }

    res.status(401).json({
      message: 'No Token'
    });
  } catch (error) {
    res.status(401).json({
      message: 'Not Authorized'
    });
  }
};

module.exports = {
  protect
};
