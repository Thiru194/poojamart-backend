const express = require('express');

const router = express.Router();

const {
  addToWishlist,

  getWishlist,

  removeWishlistItem
} = require('../controllers/wishlistController');

router.post('/', addToWishlist);

router.get('/:userId', getWishlist);

router.delete('/:id', removeWishlistItem);

module.exports = router;
