const express = require('express');

const router = express.Router();

const {
  MAX_CART_PRODUCTS,

  getCartItems,

  addToCart,

  updateCartItem,

  removeCartItem
} = require('../controllers/cartController');

/* How many different products fit in one order — the client reads this
   rather than hardcoding 5 in the UI. Declared before /:userId so it isn't
   swallowed by that param route. */
router.get('/limit', (req, res) => res.json({ max: MAX_CART_PRODUCTS }));

router.get('/:userId', getCartItems);

router.post('/', addToCart);

/* Change the quantity of a cart line */
router.put('/:id', updateCartItem);

router.delete('/:id', removeCartItem);

module.exports = router;
