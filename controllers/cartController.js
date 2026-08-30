const mongoose = require('mongoose');

const Cart = require('../models/CartModel');

const Product = require('../models/ProductModel');

/* How many DIFFERENT products may ride in the trolley at once. Quantity of an
   individual product is capped separately, by its stock. */
const MAX_CART_PRODUCTS = 5;

/* Look up a product by the cart's string productId, tolerating bad ids */
const findProduct = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(String(productId))) {
    return null;
  }

  return Product.findById(productId);
};

/* Add To Cart */

const addToCart = async (req, res) => {
  try {
    const quantity = Math.max(1, Number(req.body.quantity) || 1);

    const product = await findProduct(req.body.productId);

    /* Already in this user's cart? Bump the line instead of adding a
       duplicate row — the cart used to grow a new entry per click. */
    const existing = await Cart.findOne({
      userId: req.body.userId,
      productId: req.body.productId
    });

    /* A brand-new product needs a free slot in the trolley. Topping up
       something already in there never does. */
    if (!existing) {
      const distinct = await Cart.countDocuments({ userId: req.body.userId });

      if (distinct >= MAX_CART_PRODUCTS) {
        return res.status(400).json({
          message:
            `Your trolley is full — up to ${MAX_CART_PRODUCTS} different ` +
            `products per order. Remove one to add another.`,
          trolleyFull: true
        });
      }
    }

    const wanted = (existing ? existing.quantity : 0) + quantity;

    if (product && wanted > product.stock) {
      return res.status(400).json({
        message:
          product.stock > 0
            ? `Only ${product.stock} left in stock`
            : 'This product is out of stock'
      });
    }

    if (existing) {
      existing.quantity = wanted;

      /* Keep the line at the current price */
      if (product) existing.price = product.price;

      await existing.save();

      return res.status(200).json(existing);
    }

    /* Fall back to the product record for anything the caller left out. Buy
       Now, for instance, carries no image — and the product row is the
       authoritative source for all of this anyway. */
    const item = await Cart.create({
      userId: req.body.userId,

      productId: req.body.productId,

      name: req.body.name || product?.name || 'Product',

      image: req.body.image || product?.image || '',

      price:
        typeof req.body.price === 'number' ? req.body.price : product?.price,

      quantity
    });

    res.status(201).json(item);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message
    });
  }
};

/* Update the quantity of a cart line */
const updateCartItem = async (req, res) => {
  try {
    const item = await Cart.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Cart Item Not Found' });
    }

    const quantity = Number(req.body.quantity);

    if (!Number.isFinite(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const product = await findProduct(item.productId);

    if (product && quantity > product.stock) {
      return res.status(400).json({
        message:
          product.stock > 0
            ? `Only ${product.stock} left in stock`
            : 'This product is out of stock'
      });
    }

    item.quantity = quantity;

    await item.save();

    res.json(item);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* Get Cart */

const getCartItems = async (req, res) => {
  try {
    const items = await Cart.find({
      userId: req.params.userId
    }).lean();

    /* Attach the CURRENT stock and price so the cart can show real
       availability instead of assuming everything is in stock. */
    const ids = items
      .map((item) => String(item.productId))
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    const products = await Product.find({ _id: { $in: ids } })
      .select('stock price')
      .lean();

    const byId = {};

    products.forEach((product) => {
      byId[String(product._id)] = product;
    });

    items.forEach((item) => {
      const product = byId[String(item.productId)];

      /* A product deleted after being added reads as unavailable */
      item.stock = product ? product.stock : 0;
      item.currentPrice = product ? product.price : item.price;
      item.available = Boolean(product);
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
/* Delete Item */

const removeCartItem = async (req, res) => {
  try {
    await Cart.findByIdAndDelete(req.params.id);

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
  MAX_CART_PRODUCTS,

  addToCart,

  getCartItems,

  updateCartItem,

  removeCartItem
};
