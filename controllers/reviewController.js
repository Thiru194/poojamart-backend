const Review = require('../models/ReviewModel');

const Product = require('../models/ProductModel');

const addReview = async (req, res) => {
  try {
    const review = await Review.create(req.body);

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        message: 'Review Not Found'
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Review Deleted Successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      productId: req.params.productId
    });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* Rating summary for every reviewed product, in one aggregate.
   Product listings use this to show real ratings — a product with no
   reviews simply isn't in the result, so the client shows 0. */
const getRatingSummary = async (req, res) => {
  try {
    const summary = await Review.aggregate([
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    res.json(
      summary.map((item) => ({
        productId: String(item._id),
        averageRating: Number(item.averageRating.toFixed(1)),
        totalReviews: item.totalReviews
      }))
    );
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* Admin: every review, newest first, grouped per product.
   The admin review dashboard uses this to spot products that are being
   rated badly so they can be edited/restocked/pulled. */
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).lean();

    const productIds = [
      ...new Set(reviews.map((r) => String(r.productId)).filter(Boolean))
    ];

    const products = await Product.find({ _id: { $in: productIds } })
      .select('name image price stock category')
      .lean();

    const productById = {};
    products.forEach((p) => {
      productById[String(p._id)] = p;
    });

    /* Bucket the reviews under their product, carrying enough product detail
       for the admin to act on it without a second request. */
    const groups = {};

    reviews.forEach((review) => {
      const key = String(review.productId);

      if (!groups[key]) {
        const product = productById[key];

        groups[key] = {
          productId: key,
          /* The product may have been deleted after being reviewed */
          name: product ? product.name : 'Deleted Product',
          image: product ? product.image : '',
          price: product ? product.price : 0,
          stock: product ? product.stock : 0,
          category: product ? product.category : '',
          exists: Boolean(product),
          reviews: [],
          totalReviews: 0,
          averageRating: 0,
          ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }

      groups[key].reviews.push(review);

      const star = Math.round(review.rating);

      if (groups[key].ratingCounts[star] !== undefined) {
        groups[key].ratingCounts[star] += 1;
      }
    });

    const result = Object.values(groups).map((group) => {
      const total = group.reviews.length;

      const sum = group.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);

      return {
        ...group,
        totalReviews: total,
        averageRating: total ? Number((sum / total).toFixed(2)) : 0,
        lastReviewedAt: group.reviews[0]?.createdAt || null
      };
    });

    /* Worst rated first — that's what needs attention */
    result.sort((a, b) => a.averageRating - b.averageRating);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  addReview,

  getReviews,

  getAllReviews,

  getRatingSummary,

  deleteReview
};
