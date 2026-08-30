const User = require('../models/UserModel');

const Product = require('../models/ProductModel');

const Order = require('../models/OrderModel');

const Category = require('../models/CategoryModel');

const Review = require('../models/ReviewModel');
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const totalProducts = await Product.countDocuments();

    const totalOrders = await Order.countDocuments();

    const orders = await Order.find();

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    res.json({
      totalUsers,

      totalProducts,

      totalOrders,

      totalRevenue
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({
      stock: {
        $lte: 5
      }
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getSalesAnalytics = async (req, res) => {
  try {
    const orders = await Order.find();

    const monthlySales = {};

    orders.forEach((order) => {
      const month = new Date(order.createdAt).toLocaleString('default', {
        month: 'short'
      });

      monthlySales[month] = (monthlySales[month] || 0) + order.total;
    });

    const result = Object.keys(monthlySales).map((month) => ({
      month,

      sales: monthlySales[month]
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getCategoryAnalytics = async (req, res) => {
  try {
    const categories = await Category.find();

    const analytics = [];

    for (const category of categories) {
      const products = await Product.find({
        category: category.name
      });

      const productIds = products.map((product) => product._id.toString());

      let revenue = 0;

      const orders = await Order.find();

      orders.forEach((order) => {
        order.orderItems?.forEach((item) => {
          if (productIds.includes(item.productId?.toString())) {
            revenue += item.price * item.quantity;
          }
        });
      });

      analytics.push({
        category: category.name,

        revenue
      });
    }

    res.json(analytics);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getTopSellingProducts = async (req, res) => {
  try {
    const orders = await Order.find();

    const productSales = {};

    orders.forEach((order) => {
      order.orderItems?.forEach((item) => {
        const key = item.name;

        productSales[key] = (productSales[key] || 0) + item.quantity;
      });
    });

    const result = Object.keys(productSales)
      .map((name) => ({
        name,

        sales: productSales[name]
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getOrderStatusStats = async (req, res) => {
  try {
    const confirmed = await Order.countDocuments({
      status: 'Confirmed'
    });

    const processing = await Order.countDocuments({
      status: 'Processing'
    });

    const shipped = await Order.countDocuments({
      status: 'Shipped'
    });

    const outForDelivery = await Order.countDocuments({
      status: 'Out For Delivery'
    });

    const delivered = await Order.countDocuments({
      status: 'Delivered'
    });

    const cancelled = await Order.countDocuments({
      status: 'Cancelled'
    });

    res.json({
      confirmed,

      processing,

      shipped,

      outForDelivery,

      delivered,

      cancelled
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getRecentOrders = async (req, res) => {
  try {
    const orders = await Order.find()

      .populate('userId', 'name email')

      .sort({
        createdAt: -1
      })

      .limit(5);

    res.json(orders);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getRecentUsers = async (req, res) => {
  try {
    const users = await User.find()

      .sort({
        createdAt: -1
      })

      .limit(5)

      .select('name email createdAt');

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getRevenueStats = async (req, res) => {
  try {
    const orders = await Order.find();

    const today = new Date();

    let todayRevenue = 0;

    let weekRevenue = 0;

    let monthRevenue = 0;

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt);

      const diffDays = Math.floor((today - orderDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        todayRevenue += order.total;
      }

      if (diffDays <= 7) {
        weekRevenue += order.total;
      }

      if (
        orderDate.getMonth() === today.getMonth() &&
        orderDate.getFullYear() === today.getFullYear()
      ) {
        monthRevenue += order.total;
      }
    });

    res.json({
      todayRevenue,

      weekRevenue,

      monthRevenue
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getRecentActivities = async (req, res) => {
  try {
    const activities = [];

    /* Latest Orders */

    const recentOrders = await Order.find()

      .sort({
        createdAt: -1
      })

      .limit(5);

    recentOrders.forEach((order) => {
      activities.push({
        icon: '📦',

        message: `Order #${order._id.toString().slice(-6)} placed`,

        date: order.createdAt
      });
    });

    /* Latest Users */

    const recentUsers = await User.find()

      .sort({
        createdAt: -1
      })

      .limit(5);

    recentUsers.forEach((user) => {
      activities.push({
        icon: '👤',

        message: `${user.name} registered`,

        date: user.createdAt
      });
    });

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(activities.slice(0, 10));
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getInventoryAnalytics = async (req, res) => {
  try {
    const products = await Product.find();

    let totalInventoryValue = 0;

    let lowStockValue = 0;

    let outOfStockProducts = 0;

    products.forEach((product) => {
      const value = product.price * product.stock;

      totalInventoryValue += value;

      if (product.stock <= 5 && product.stock > 0) {
        lowStockValue += value;
      }

      if (product.stock === 0) {
        outOfStockProducts++;
      }
    });

    res.json({
      totalInventoryValue,

      lowStockValue,

      outOfStockProducts
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getCustomerAnalytics = async (req, res) => {
  try {
    const totalCustomers = await User.countDocuments({
      isAdmin: false
    });

    const today = new Date();

    const startOfMonth = new Date(
      today.getFullYear(),

      today.getMonth(),

      1
    );

    const newCustomers = await User.countDocuments({
      isAdmin: false,

      createdAt: {
        $gte: startOfMonth
      }
    });

    const orders = await Order.find();

    const customerSpending = {};

    let totalRevenue = 0;

    orders.forEach((order) => {
      totalRevenue += order.total;

      const userId = order.userId?.toString();

      customerSpending[userId] = (customerSpending[userId] || 0) + order.total;
    });

    let topBuyerId = null;

    let highestSpent = 0;

    Object.keys(customerSpending).forEach((userId) => {
      if (customerSpending[userId] > highestSpent) {
        highestSpent = customerSpending[userId];

        topBuyerId = userId;
      }
    });

    let topBuyer = 'No Orders';

    if (topBuyerId) {
      const user = await User.findById(topBuyerId);

      if (user) {
        topBuyer = user.name;
      }
    }

    const averageOrderValue =
      orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

    res.json({
      totalCustomers,

      newCustomers,

      topBuyer,

      averageOrderValue
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getReviewAnalytics = async (req, res) => {
  try {
    const reviews = await Review.find();

    const totalReviews = reviews.length;

    const totalRating = reviews.reduce(
      (sum, review) => sum + review.rating,

      0
    );

    const averageRating =
      totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;

    const fiveStarReviews = reviews.filter(
      (review) => review.rating === 5
    ).length;

    const oneStarReviews = reviews.filter(
      (review) => review.rating === 1
    ).length;

    res.json({
      totalReviews,

      averageRating,

      fiveStarReviews,

      oneStarReviews
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const getTopRatedProducts = async (req, res) => {
  try {
    const reviews = await Review.find().populate('productId', 'name');

    const productRatings = {};

    reviews.forEach((review) => {
      const productId = review.productId?._id;

      if (!productId) return;

      if (!productRatings[productId]) {
        productRatings[productId] = {
          name: review.productId.name,

          totalRating: 0,

          totalReviews: 0
        };
      }

      productRatings[productId].totalRating += review.rating;

      productRatings[productId].totalReviews++;
    });

    const result = Object.values(productRatings)
      .map((product) => ({
        name: product.name,

        averageRating: (product.totalRating / product.totalReviews).toFixed(1),

        totalReviews: product.totalReviews
      }))
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 5);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getBestSellingProducts = async (req, res) => {
  try {
    const orders = await Order.find();

    const products = {};

    orders.forEach((order) => {
      order.orderItems.forEach((item) => {
        const key = item.productId;

        if (!products[key]) {
          products[key] = {
            name: item.name,

            totalSold: 0
          };
        }

        products[key].totalSold += item.quantity;
      });
    });

    const bestSelling = Object.values(products)

      .sort((a, b) => b.totalSold - a.totalSold)

      .slice(0, 5);

    res.json(bestSelling);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
module.exports = {
  getDashboardStats,

  getLowStockProducts,

  getSalesAnalytics,

  getCategoryAnalytics,

  getTopSellingProducts,

  getRecentOrders,

  getOrderStatusStats,

  getRecentUsers,

  getRevenueStats,

  getRecentActivities,

  getInventoryAnalytics,

  getCustomerAnalytics,

  getReviewAnalytics,

  getTopRatedProducts,

  getBestSellingProducts
};
