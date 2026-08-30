const Wishlist = require('../models/WishlistModel');

/* Add To Wishlist */

const addToWishlist = async (req, res) => {
  try {
    const exists = await Wishlist.findOne({
      userId: req.body.userId,

      productId: req.body.productId
    });

    if (exists) {
      return res.status(400).json({
        message: 'Already In Wishlist'
      });
    }

    const item = await Wishlist.create({
      userId: req.body.userId,

      productId: req.body.productId,

      name: req.body.name,

      image: req.body.image,

      price: req.body.price
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* Get Wishlist */

const getWishlist = async (req, res) => {
  try {
    const items = await Wishlist.find({
      userId: req.params.userId
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* Remove Wishlist */

const removeWishlistItem = async (req, res) => {
  try {
    await Wishlist.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Removed'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  addToWishlist,

  getWishlist,

  removeWishlistItem
};
