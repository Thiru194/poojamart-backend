const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./models/CategoryModel');

mongoose
  .connect(process.env.MONGO_URI)

  .then(() => {
    console.log('MongoDB Connected');

    insertCategories();
  })

  .catch((error) => {
    console.log(error);
  });

const categories = [
  {
    name: 'Mobiles',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9'
  },

  {
    name: 'Laptops',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853'
  },

  {
    name: 'Speakers',
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d'
  },

  {
    name: 'Accessories',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'
  },

  {
    name: 'Gaming',
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae'
  },

  {
    name: 'Fitness',
    image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6'
  },

  {
    name: 'Smart Watches',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'
  },

  {
    name: 'Headphones',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'
  },

  {
    name: 'Tablets',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0'
  },

  {
    name: 'Cameras',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32'
  },

  {
    name: 'Televisions',
    image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6'
  },

  {
    name: 'Printers',
    image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6'
  },

  {
    name: 'Monitors',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf'
  },

  {
    name: 'Keyboards',
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae'
  },

  {
    name: 'Mice',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46'
  },

  {
    name: 'Power Banks',
    image: 'https://images.unsplash.com/photo-1585338447937-7082f8fc763d'
  }
];
const insertCategories = async () => {
  try {
    await Category.deleteMany();

    await Category.insertMany(categories);

    console.log('Categories Inserted');

    process.exit();
  } catch (error) {
    console.log(error);

    process.exit();
  }
};
