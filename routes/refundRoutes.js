const express = require('express');

const router = express.Router();

const {
  createRefund,
  getRefunds,
  updateRefundStatus,
  getUserRefunds,
  checkRefundExists,
  getRefundStats
} = require('../controllers/refundController');

router.post('/', createRefund);
router.get('/', getRefunds);
router.put('/:id', updateRefundStatus);
router.get('/user/:userId', getUserRefunds);
router.get(
  '/check/:orderId/:productId',

  checkRefundExists
);
router.get('/stats', getRefundStats);
module.exports = router;
