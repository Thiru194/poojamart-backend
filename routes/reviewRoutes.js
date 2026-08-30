const express = require('express');

const router = express.Router();

const {
  addReview,

  getReviews,

  getAllReviews,

  getRatingSummary,

  deleteReview
} = require('../controllers/reviewController');

router.post('/', addReview);

/* Admin - all reviews grouped by product */
router.get('/', getAllReviews);

/* Average rating + count per product, for listings */
router.get('/summary', getRatingSummary);

router.get('/product/:productId', getReviews);

router.delete('/delete/:id', deleteReview);
module.exports = router;
