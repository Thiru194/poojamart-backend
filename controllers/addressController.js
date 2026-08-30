const Address = require('../models/AddressModel');

const saveAddress = async (req, res) => {
  try {
    const existing = await Address.findOne({
      userId: req.body.userId
    });

    if (existing) {
      existing.name = req.body.name;

      existing.phone = req.body.phone;

      existing.address = req.body.address;

      existing.city = req.body.city;

      existing.pincode = req.body.pincode;

      await existing.save();

      return res.json(existing);
    }

    const address = await Address.create(req.body);

    res.status(201).json(address);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      userId: req.params.userId
    });

    res.json(address);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  saveAddress,

  getAddress
};
