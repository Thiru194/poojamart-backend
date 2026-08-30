const express = require('express');

const router = express.Router();

const {
  saveAddress,

  getAddress
} = require('../controllers/addressController');

router.post('/', saveAddress);

router.get('/:userId', getAddress);

module.exports = router;
