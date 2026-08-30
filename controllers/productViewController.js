const ProductView = require('../models/ProductViewModel');

const Product = require('../models/ProductModel');

const User = require('../models/UserModel');

/*
  Log a completed dwell on a product. Product name / image / category /
  price are denormalized from the DB here so the client payload stays
  tiny (works with navigator.sendBeacon on unload) and admin reads are
  cheap.
*/

const logProductView = async (req, res) => {
  try {
    const { visitorId, userId, productId, duration, source } = req.body;

    if (!visitorId || !productId || !duration) {
      return res.status(400).json({
        message: 'Missing tracking data'
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    /* Resolve the customer name/email so admin can see who was browsing */
    let userName = 'Guest';
    let userEmail = '';

    if (userId) {
      const user = await User.findById(userId).select('name email');
      if (user) {
        userName = user.name;
        userEmail = user.email;
      }
    }

    const view = await ProductView.create({
      visitorId,
      userId: userId || null,
      userName,
      userEmail,
      productId,
      productName: product.name,
      image: product.image,
      category: product.category,
      price: product.price,
      duration: Math.round(duration),
      source: source === 'quickview' ? 'quickview' : 'details'
    });

    res.status(201).json({
      message: 'Tracked',
      id: view._id
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/* The home-page section shows one tidy pair of rows */
const RECOMMENDATION_COUNT = 6;

/*
  Product ids ordered by how much time the whole store has spent on them.
  Used to top up a short list with the next most engaging products.
*/

const globalDwellOrder = async () => {
  const rows = await ProductView.aggregate([
    {
      $group: {
        _id: '$productId',
        totalTime: { $sum: '$duration' }
      }
    },
    { $sort: { totalTime: -1 } }
  ]);

  return rows.map((r) => String(r._id));
};

/*
  Time-based suggestions for a visitor.

  The products the visitor has spent the most time on are suggested back to
  them, ordered by total seconds — longest first. One second qualifies the
  same as an hour; time decides the order, and the top RECOMMENDATION_COUNT
  of that ranking is what the page shows.

  If that leaves the row short, products they have not opened yet are
  appended, ranked by the time other visitors have given them.

  Each product carries `viewedSeconds` so the page can show why it ranks
  where it does (0 for the appended, not-yet-viewed ones).
*/

const getRecommendations = async (req, res) => {
  try {
    const { visitorId } = req.params;

    const perProduct = await ProductView.aggregate([
      { $match: { visitorId } },
      {
        $group: {
          _id: '$productId',
          totalTime: { $sum: '$duration' }
        }
      },
      { $sort: { totalTime: -1 } }
    ]);

    const picks = [];
    const chosen = new Set();

    const add = (product, seconds) => {
      const id = String(product._id);

      if (chosen.has(id) || picks.length >= RECOMMENDATION_COUNT) {
        return;
      }

      chosen.add(id);

      picks.push({
        ...product.toObject(),
        viewedSeconds: Math.round(seconds)
      });
    };

    /*
      The visitor's own history first. Products deleted since they were
      viewed simply drop out, which is why this maps over the DB result
      rather than trusting the aggregate's id list.
    */
    if (perProduct.length) {
      const viewedIds = perProduct.map((p) => p._id);

      const viewed = await Product.find({ _id: { $in: viewedIds } });

      const byId = new Map(viewed.map((p) => [String(p._id), p]));

      perProduct.forEach((row) => {
        const product = byId.get(String(row._id));

        if (product) {
          add(product, row.totalTime);
        }
      });
    }

    /*
      Still a thin row — a new visitor, or someone who has only opened one
      or two products. Fill with what the rest of the store dwells on, so
      the section always has something to show.
    */
    if (picks.length < RECOMMENDATION_COUNT) {
      const dwellOrder = await globalDwellOrder();

      const rest = await Product.find({
        _id: { $nin: [...chosen] }
      });

      const rank = (p) => {
        const i = dwellOrder.indexOf(String(p._id));

        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      };

      rest
        .sort((a, b) => rank(a) - rank(b))
        .slice(0, RECOMMENDATION_COUNT - picks.length)
        .forEach((p) => add(p, 0));
    }

    res.json(picks);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/*
  Admin: time spent per product across all visitors.
  Sorted by total time so the "most engaging" products surface first.
*/

const getProductTimeStats = async (req, res) => {
  try {
    const stats = await ProductView.aggregate([
      {
        $group: {
          _id: '$productId',
          productName: { $first: '$productName' },
          image: { $first: '$image' },
          category: { $first: '$category' },
          totalTime: { $sum: '$duration' },
          views: { $sum: 1 },
          avgTime: { $avg: '$duration' },
          visitors: { $addToSet: '$visitorId' }
        }
      },
      {
        $project: {
          productName: 1,
          image: 1,
          category: 1,
          totalTime: 1,
          views: 1,
          avgTime: { $round: ['$avgTime', 1] },
          uniqueVisitors: { $size: '$visitors' }
        }
      },
      { $sort: { totalTime: -1 } }
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/*
  Admin: time spent per customer (named users + guests), so admin can see
  WHO is spending the most time and on how many products.
*/

const getUserTimeStats = async (req, res) => {
  try {
    const stats = await ProductView.aggregate([
      {
        $group: {
          _id: '$visitorId',
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
          userId: { $first: '$userId' },
          totalTime: { $sum: '$duration' },
          views: { $sum: 1 },
          products: { $addToSet: '$productId' }
        }
      },
      {
        $project: {
          userName: 1,
          userEmail: 1,
          userId: 1,
          totalTime: 1,
          views: 1,
          productsViewed: { $size: '$products' },
          isGuest: { $eq: ['$userId', null] }
        }
      },
      { $sort: { totalTime: -1 } }
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/*
  Admin: which products a specific visitor viewed and how long on each.
  Used by the expandable row in the customer engagement table.
*/

const getVisitorProductBreakdown = async (req, res) => {
  try {
    const { visitorId } = req.params;

    const rows = await ProductView.aggregate([
      { $match: { visitorId } },
      {
        $group: {
          _id: '$productId',
          productName: { $first: '$productName' },
          image: { $first: '$image' },
          category: { $first: '$category' },
          totalTime: { $sum: '$duration' },
          views: { $sum: 1 },
          lastViewed: { $max: '$createdAt' }
        }
      },
      { $sort: { totalTime: -1 } }
    ]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/*
  When a guest logs in, re-attribute the browsing they did in this browser
  (tracked under an anonymous visitorId) to their account. Their guest
  dwell then shows under their real name instead of "Guest", and future
  views merge with it because visitorId becomes their userId.
*/

const claimGuestViews = async (req, res) => {
  try {
    const { anonVisitorId, userId } = req.body;

    if (!anonVisitorId || !userId) {
      return res.status(400).json({
        message: 'Missing claim data'
      });
    }

    const user = await User.findById(userId).select('name email');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const result = await ProductView.updateMany(
      { visitorId: anonVisitorId },
      {
        $set: {
          visitorId: String(userId),
          userId,
          userName: user.name,
          userEmail: user.email
        }
      }
    );

    res.json({
      message: 'Claimed',
      updated: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  logProductView,
  getRecommendations,
  getProductTimeStats,
  getUserTimeStats,
  getVisitorProductBreakdown,
  claimGuestViews
};
