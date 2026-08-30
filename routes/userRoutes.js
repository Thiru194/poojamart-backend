const express = require('express');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');

const {
  registerUser,

  loginUser,

  getUserProfile,

  getAllUsers,

  deleteUser,

  makeAdmin,

  updateProfile,

  getAccountStats,

  forgotPassword,

  verifyOtp,

  resetPassword,

  getBuyAgainProducts
} = require('../controllers/userController');

/* Register */

router.post('/register', registerUser);

/* Login */

router.post('/login', loginUser);

/* Profile */

router.get('/profile', protect, getUserProfile);

/* Admin - Get All Users */

router.get('/', getAllUsers);

/* Admin - Delete User */

router.delete('/:id', deleteUser);

/* Admin - Make User Admin */

router.put('/admin/:id', makeAdmin);
router.put(
  '/profile',

  protect,

  updateProfile
);
router.get(
  '/account-stats',

  protect,

  getAccountStats
);
router.post('/forgot-password', forgotPassword);

router.post('/verify-otp', verifyOtp);

router.post('/reset-password', resetPassword);

router.get(
  '/buy-again',

  protect,

  getBuyAgainProducts
);

module.exports = router;
