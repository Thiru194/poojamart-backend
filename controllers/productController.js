const path = require('path');

const fs = require('fs');

const Product = require('../models/ProductModel');

const User = require('../models/UserModel');

const sendEmail = require('../utils/sendEmail');

const megaSaleEmailTemplate = require('../utils/megaSaleEmailTemplate');

const sendSms = require('../utils/smsClient');

const { createNotification } = require('./notificationController');

const { readImageBuffer } = require('../utils/imageStore');

/* Get All Products */

const getProducts = async (req, res) => {
  try {
    const products = await Product.find();

    res.json(products);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* Get Single Product */

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product Not Found'
      });
    }

    res.json(product);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message
    });
  }
};
const setHeroProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product Not Found'
      });
    }

    /* Only a genuine change (a different product becoming the hero) should
       trigger the "mega sale started" broadcast — re-setting the same hero
       product must not spam customers. */
    const isChange = product.heroProduct !== true;

    await Product.updateMany({}, { heroProduct: false });

    product.heroProduct = true;

    await product.save();

    res.json(product);

    if (isChange) {
      notifyMegaSale(product).catch((err) =>
        console.log('Mega sale broadcast failed:', err.message)
      );
    }
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* Email every customer that a new mega sale (hero) product just went live.
   Runs in the background after the response is sent. Sends sequentially so we
   stay within the pooled transporter's connection limit / Gmail rate limits. */
const notifyMegaSale = async (product) => {
  const siteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  /* Embed the product image INTO the email (CID attachment) instead of
     linking to it. Email clients (Gmail) proxy remote images server-side and
     can't reach localhost/uploads, so a linked image would break. Loading it
     once here and bundling it makes it render everywhere. */
  const imageAttachment = await loadProductImage(product.image);

  const imageSrc = imageAttachment ? `cid:${imageAttachment.cid}` : '';

  const attachments = imageAttachment ? [imageAttachment] : [];

  const users = await User.find({ role: 'customer' }).select(
    'name email phone'
  );

  const subject = `🔥 Mega Sale Live: ${product.name} — Limited Time!`;

  const smsMessage =
    `PoojaMart MEGA SALE: ${product.name} now Rs.${product.price} (50% OFF)! ` +
    `Limited time - grab it: ${siteUrl}/product/${product._id}`;

  let sent = 0;

  for (const user of users) {
    /* In-app notification (free — shows in the customer's 🔔 bell) */
    if (user.email) {
      try {
        await createNotification(
          user.email,
          '🔥 Mega Sale Is Live!',
          `${product.name} now ₹${product.price} (50% OFF) — limited time only!`
        );
      } catch (err) {
        console.log(
          `Mega sale notification to ${user.email} failed:`,
          err.message
        );
      }
    }

    /* Email channel */
    if (user.email) {
      try {
        await sendEmail(
          user.email,
          subject,
          megaSaleEmailTemplate(product, siteUrl, user.name, imageSrc),
          attachments
        );

        sent += 1;
      } catch (err) {
        console.log(`Mega sale email to ${user.email} failed:`, err.message);
      }
    }

    /* SMS channel (customer's phone number) */
    if (user.phone) {
      try {
        await sendSms(user.phone, smsMessage);
      } catch (err) {
        console.log(`Mega sale SMS to ${user.phone} failed:`, err.message);
      }
    }
  }

  console.log(`Mega sale broadcast sent to ${sent} customer(s)`);
};

/* Load a product image (remote URL or local /uploads path) into a buffer once,
   returned as a nodemailer CID attachment. Returns null if it can't be read. */
const loadProductImage = async (rawImg) => {
  const cid = 'megaproduct';

  try {
    if (!rawImg) {
      return null;
    }

    if (/^https?:\/\//i.test(rawImg)) {
      const response = await fetch(rawImg);

      if (!response.ok) {
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      return { filename: 'product.jpg', content: buffer, cid };
    }

    /* Local upload path like "/uploads/xyz.jpg" — pull it out of MongoDB,
       falling back to disk for images still sitting in the local folder. */
    const filename = rawImg.split('/').pop();

    const stored = await readImageBuffer(filename);

    if (stored) {
      return { filename, content: stored, cid };
    }

    const diskPath = path.join(__dirname, '..', 'uploads', filename);

    if (!fs.existsSync(diskPath)) {
      return null;
    }

    return { filename, content: fs.readFileSync(diskPath), cid };
  } catch (err) {
    console.log('Mega sale image embed failed:', err.message);

    return null;
  }
};

/* Create Product */

const createProduct = async (req, res) => {
  try {
    const product = await Product.create({
      name: req.body.name,

      category: req.body.category,

      image: req.body.image,

      images: req.body.images || [],

      price: req.body.price,

      stock: req.body.stock,

      topSale: req.body.topSale,

      shortDescription: req.body.shortDescription,

      description: req.body.description,

      highlights: req.body.highlights
    });
    res.status(201).json(product);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message
    });
  }
};
const updateProduct = async (req, res) => {
  try {
    console.log('Updating Product ID:', req.params.id);

    const product = await Product.findById(req.params.id);

    if (!product) {
      console.log('Product Not Found');

      return res.status(404).json({
        message: 'Product Not Found'
      });
    }

    product.name = req.body.name;

    product.category = req.body.category;

    product.image = req.body.image;

    if (req.body.images !== undefined) {
      product.images = req.body.images;
    }

    product.price = req.body.price;

    product.stock = req.body.stock;

    product.topSale = req.body.topSale;

    product.shortDescription = req.body.shortDescription;

    product.description = req.body.description;

    if (req.body.highlights !== undefined) {
      product.highlights = req.body.highlights;
    }

    await product.save();

    console.log('Product Updated Successfully');

    res.json(product);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message
    });
  }
};
/* Get Top Sale Products */

const getTopSaleProducts = async (req, res) => {
  try {
    const products = await Product.find({
      topSale: true
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* Get Products By Category */

const getProductsByCategory = async (req, res) => {
  try {
    const products = await Product.find({
      category: req.params.category
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product Not Found'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Product Deleted'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
/* Toggle Top Sale */

const toggleTopSale = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product Not Found'
      });
    }

    product.topSale = !product.topSale;

    await product.save();

    res.json(product);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  getProducts,

  getProductById,

  createProduct,

  updateProduct,

  deleteProduct,

  getTopSaleProducts,

  getProductsByCategory,

  toggleTopSale,

  setHeroProduct
};
