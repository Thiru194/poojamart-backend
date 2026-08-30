const express = require('express');

const router = express.Router();

const {
  getCoupons,

  createCoupon,

  deleteCoupon,

  verifyCoupon,

  toggleCouponStatus,

  getActiveCoupons,

  useCoupon
} = require('../controllers/couponController');

router
  .route('/')

  .get(getCoupons)

  .post(createCoupon);

router.delete(
  '/:id',

  deleteCoupon
);
router.post(
  '/verify',

  verifyCoupon
);
router.put(
  '/toggle/:id',

  toggleCouponStatus
);
router.get(
  '/active',

  getActiveCoupons
);

router.put(
  '/use/:code',

  useCoupon
);

module.exports = router;
