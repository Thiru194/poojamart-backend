const mongoose = require('mongoose');

require('dotenv').config();

const Product = require('./models/ProductModel');

/* MongoDB Connection */

mongoose
  .connect(process.env.MONGO_URI)

  .then(() => {
    console.log('MongoDB Connected');

    insertProducts();
  })

  .catch((error) => {
    console.log(error);
  });

/* Products Data */

const products = [
  {
    name: 'Accessories Kit',
    category: 'Accessories',
    price: 1299,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    shortDescription: 'Modern accessories collection',
    description: 'Premium accessories kit with stylish design.',
    topSale: true
  },

  {
    name: 'Bluetooth Speaker',
    category: 'Electronics',
    price: 2499,
    image: 'https://images.unsplash.com/photo-1507878866276-a947ef722fee',
    shortDescription: 'Portable wireless speaker',
    description: 'High-quality wireless speaker with deep bass.',
    topSale: true
  },

  {
    name: 'Camera Lens',
    category: 'Electronics',
    price: 8999,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32',
    shortDescription: 'Professional camera lens',
    description: 'Capture sharp and high-quality photos.',
    topSale: false
  },

  {
    name: 'Dell Laptop',
    category: 'Electronics',
    price: 65999,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853',
    shortDescription: 'Powerful productivity laptop',
    description: 'High-performance Dell laptop for gaming and work.',
    topSale: true
  },

  {
    name: 'Earbuds',
    category: 'Electronics',
    price: 1999,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    shortDescription: 'Wireless bluetooth earbuds',
    description: 'Crystal-clear sound with long battery life.',
    topSale: false
  },

  {
    name: 'Fitness Band',
    category: 'Fitness',
    price: 2499,
    image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6',
    shortDescription: 'Smart fitness tracker',
    description: 'Track fitness and heart rate easily.',
    topSale: true
  },

  {
    name: 'Gaming Keyboard',
    category: 'Gaming',
    price: 3499,
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae',
    shortDescription: 'RGB gaming keyboard',
    description: 'Mechanical keyboard with RGB lighting.',
    topSale: false
  },

  {
    name: 'Gaming Mouse',
    category: 'Gaming',
    price: 1499,
    image: 'https://images.unsplash.com/photo-1527814050087-3793815479db',
    shortDescription: 'Precision gaming mouse',
    description: 'Smooth gaming performance with RGB effects.',
    topSale: true
  },

  {
    name: 'Headphones',
    category: 'Electronics',
    price: 2999,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    shortDescription: 'Noise cancelling headphones',
    description: 'Premium sound quality and deep bass.',
    topSale: false
  },

  {
    name: 'iPhone 15',
    category: 'Mobiles',
    price: 79999,
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9',
    shortDescription: 'Latest Apple smartphone',
    description: 'Advanced iPhone with premium camera quality.',
    topSale: true
  },

  {
    name: 'JBL Speaker',
    category: 'Electronics',
    price: 4599,
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d',
    shortDescription: 'Portable JBL speaker',
    description: 'Powerful sound with premium quality.',
    topSale: false
  },

  {
    name: 'Kitchen Set',
    category: 'Kitchen',
    price: 3999,
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba',
    shortDescription: 'Modern kitchen essentials',
    description: 'Complete kitchen set with premium quality.',
    topSale: false
  },

  {
    name: 'Nike Shoes',
    category: 'Shoes',
    price: 4999,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
    shortDescription: 'Comfortable running shoes',
    description: 'Stylish and comfortable Nike sports shoes.',
    topSale: true
  },

  {
    name: 'Office Chair',
    category: 'Furniture',
    price: 8999,
    image: 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455',
    shortDescription: 'Ergonomic office chair',
    description: 'Comfortable office chair with back support.',
    topSale: false
  },

  {
    name: 'Portable Charger',
    category: 'Accessories',
    price: 1799,
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0',
    shortDescription: 'Fast charging power bank',
    description: 'Portable power bank with fast charging support.',
    topSale: true
  },

  {
    name: 'Samsung Tablet',
    category: 'Mobiles',
    price: 25999,
    image: 'https://images.unsplash.com/photo-1546054454-aa26e2b734c7',
    shortDescription: 'Android smart tablet',
    description: 'Samsung tablet for entertainment and productivity.',
    topSale: false
  },

  {
    name: 'Travel Bag',
    category: 'Travel',
    price: 3499,
    image: 'https://images.unsplash.com/photo-1542296332-2e4473faf563',
    shortDescription: 'Premium travel backpack',
    description: 'Modern travel backpack with spacious storage.',
    topSale: false
  },

  {
    name: 'Wireless Mouse',
    category: 'Accessories',
    price: 1299,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46',
    shortDescription: 'Smooth wireless mouse',
    description: 'Comfortable wireless mouse with precise tracking.',
    topSale: true
  }
];

/* Insert Products */

const insertProducts = async () => {
  try {
    await Product.deleteMany();

    await Product.insertMany(products);

    console.log('Products Inserted');

    process.exit();
  } catch (error) {
    console.log(error);

    process.exit();
  }
};
