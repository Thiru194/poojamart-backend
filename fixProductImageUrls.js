require('dotenv').config();

const mongoose = require('mongoose');
const Product = require('./models/ProductModel');

const OLD_BASE = 'http://localhost:5000/uploads/';
const NEW_BASE = 'https://poojamart-backend.onrender.com/uploads/';

async function fixProductImageUrls() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected.');

    const products = await Product.find({
      $or: [
        { image: { $regex: '^http://localhost:5000/uploads/' } },
        { images: { $elemMatch: { $regex: '^http://localhost:5000/uploads/' } } }
      ]
    });

    console.log(`Found ${products.length} products to update.`);

    let updated = 0;

    for (const product of products) {
      let changed = false;

      if (product.image && product.image.startsWith(OLD_BASE)) {
        product.image = product.image.replace(OLD_BASE, NEW_BASE);
        changed = true;
      }

      if (Array.isArray(product.images)) {
        product.images = product.images.map((url) => {
          if (typeof url === 'string' && url.startsWith(OLD_BASE)) {
            changed = true;
            return url.replace(OLD_BASE, NEW_BASE);
          }

          return url;
        });
      }

      if (changed) {
        await product.save();
        updated++;
      }
    }

    console.log(`Successfully updated ${updated} products.`);
    console.log('Old image URLs have been replaced with Render URLs.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

fixProductImageUrls();