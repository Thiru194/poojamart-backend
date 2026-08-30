const express = require('express');

const router = express.Router();

const {
  getDashboardStats,
  getLowStockProducts,
  getSalesAnalytics,
  getCategoryAnalytics,
  getTopSellingProducts,
  getRecentOrders,
  getOrderStatusStats,
  getRecentUsers,
  getRevenueStats,
  getRecentActivities,
  getInventoryAnalytics,
  getCustomerAnalytics,
  getReviewAnalytics,
  getTopRatedProducts,
  getBestSellingProducts
} = require('../controllers/adminController');

router.get('/stats', getDashboardStats);

router.get('/low-stock', getLowStockProducts);

router.get('/sales-analytics', getSalesAnalytics);
router.get('/top-rated-products', getTopRatedProducts);
router.get(
  '/category-analytics',

  getCategoryAnalytics
);
router.get('/review-analytics', getReviewAnalytics);
router.get(
  '/top-products',

  getTopSellingProducts
);
router.get(
  '/recent-orders',

  getRecentOrders
);
router.get('/order-status-stats', getOrderStatusStats);
router.get(
  '/best-selling-products',

  getBestSellingProducts
);
router.get(
  '/recent-users',

  getRecentUsers
);
router.get(
  '/revenue-stats',

  getRevenueStats
);

router.get(
  '/activities',

  getRecentActivities
);
router.get(
  '/inventory-analytics',

  getInventoryAnalytics
);
router.get(
  '/customer-analytics',

  getCustomerAnalytics
);
module.exports = router;
