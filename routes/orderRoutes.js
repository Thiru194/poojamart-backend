const express = require('express');

const router = express.Router();

const {
  createOrder,

  getOrders,

  getPurchasedProducts,

  updateOrderStatus,

  assignDeliveryPartner,

  markCodCollected,

  cancelOrder,

  deleteOrder
} = require('../controllers/orderController');

router.post('/', createOrder);

/* Admin - All Orders */

router.get('/', getOrders);

/* User Orders */
router.get('/purchased/:userId', getPurchasedProducts);
router.get('/:userId', getOrders);

/* Admin - assign delivery partner */
router.put('/:id/assign', assignDeliveryPartner);

/* Delivery partner - mark COD collected */
router.put('/:id/cod', markCodCollected);

/* Customer - cancel order (must stay above the generic PUT /:id) */
router.put('/:id/cancel', cancelOrder);

/* Update Status */

router.put('/:id', updateOrderStatus);

/* Delete Order */

router.delete('/:id', deleteOrder);

module.exports = router;
