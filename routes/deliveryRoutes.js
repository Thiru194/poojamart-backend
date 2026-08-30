const express = require('express');

const router = express.Router();

const {
  registerPartner,
  loginPartner,
  getPartners,
  getApprovedPartners,
  setPartnerApproval,
  deletePartner,
  getPartnerOrders,
  getPartnerStats
} = require('../controllers/deliveryController');

/* Partner auth */
router.post('/register', registerPartner);
router.post('/login', loginPartner);

/* Admin partner management */
router.get('/partners', getPartners);
router.get('/partners/approved', getApprovedPartners);
router.put('/partners/:id/approval', setPartnerApproval);
router.delete('/partners/:id', deletePartner);

/* Partner workspace */
router.get('/orders/:partnerId', getPartnerOrders);
router.get('/stats/:partnerId', getPartnerStats);

module.exports = router;
