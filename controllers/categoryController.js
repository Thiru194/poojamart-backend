const Category = require('../models/CategoryModel');

const Product = require('../models/ProductModel');

const Order = require('../models/OrderModel');

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();

    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const products = await Product.find({
          category: category.name
        });

        const productCount = products.length;

        let revenue = 0;

        let orders = 0;

        const productIds = products.map((product) => product._id.toString());

        const allOrders = await Order.find();

        allOrders.forEach((order) => {
          order.orderItems?.forEach((item) => {
            if (productIds.includes(item.productId?.toString())) {
              orders += 1;

              revenue += item.price * item.quantity;
            }
          });
        });

        return {
          ...category._doc,

          productCount,

          revenue,

          orders
        };
      })
    );

    res.json(categoriesWithStats);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
/* Create Category */

const createCategory = async (req, res) => {
  try {
    const category = await Category.create({
      name: req.body.name,

      image: req.body.image
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* Delete Category */
/* Update Category */

const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: 'Category Not Found'
      });
    }

    category.name = req.body.name;

    category.image = req.body.image;

    await category.save();

    res.json(category);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: 'Category Not Found'
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Category Deleted Successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
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

module.exports = {
  getCategories,

  createCategory,

  updateCategory,

  deleteCategory,

  getProductsByCategory
};
