const express = require('express');

const router = express.Router();

const {
  logProductView,
  getRecommendations,
  getProductTimeStats,
  getUserTimeStats,
  getVisitorProductBreakdown,
  claimGuestViews
} = require('../controllers/productViewController');

/* Track a dwell (public — logged-in users and guests) */
router.post('/', logProductView);

/* Time-based suggestions for a visitor */
router.get('/recommendations/:visitorId', getRecommendations);

/* Re-attribute a guest's browsing to their account on login */
router.post('/claim', claimGuestViews);

/* Admin: per-product time analytics */
router.get('/admin/stats', getProductTimeStats);

/* Admin: per-customer time analytics (who spent the most time) */
router.get('/admin/user-stats', getUserTimeStats);

/* Admin: products a specific visitor viewed + time on each */
router.get('/admin/user/:visitorId', getVisitorProductBreakdown);

module.exports = router;
