const express = require('express');

const mongoose = require('mongoose');

const cors = require('cors');

require('dotenv').config();

/* Routes */

const productRoutes = require('./routes/productRoutes');

const categoryRoutes = require('./routes/categoryRoutes');

const userRoutes = require('./routes/userRoutes');

const cartRoutes = require('./routes/cartRoutes');

const orderRoutes = require('./routes/orderRoutes');

const wishlistRoutes = require('./routes/wishlistRoutes');

const addressRoutes = require('./routes/addressRoutes');

const reviewRoutes = require('./routes/reviewRoutes');

const adminRoutes = require('./routes/adminRoutes');

const uploadRoutes = require('./routes/uploadRoutes');

const paymentRoutes = require('./routes/paymentRoutes');
const couponRoutes = require('./routes/couponRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const refundRoutes = require('./routes/refundRoutes');

const productViewRoutes = require('./routes/productViewRoutes');

const aiRoutes = require('./routes/aiRoutes');

const deliveryRoutes = require('./routes/deliveryRoutes');

const {
  findImage,
  openImageStream,
  contentTypeOf
} = require('./utils/imageStore');

const app = express();

/* Middleware */

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json());

/* Image Access

   Images live in MongoDB (GridFS) — the local uploads/ folder is no longer
   served, so the database is the single source of truth in dev and on
   Render alike. The path is unchanged, so image URLs already stored in the
   database keep working. */

app.get('/uploads/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;

    const file = await findImage(filename);

    if (!file) {
      return res.status(404).json({
        message: 'Image not found'
      });
    }

    /* Filenames are unique and their content never changes, so let browsers
       cache them instead of re-fetching on every page view. */
    res.set({
      'Content-Type': contentTypeOf(file),
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: `"${file._id}"`
    });

    if (req.headers['if-none-match'] === `"${file._id}"`) {
      return res.status(304).end();
    }

    const stream = openImageStream(filename);

    stream.on('error', (error) => {
      console.error('Image stream error:', error);

      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  } catch (error) {
    console.error('Image retrieval failed:', error);

    res.status(500).json({
      message: 'Failed to retrieve image'
    });
  }
});

/* API Routes */

app.use('/api/products', productRoutes);

app.use('/api/categories', categoryRoutes);

app.use('/api/users', userRoutes);

app.use('/api/cart', cartRoutes);

app.use('/api/orders', orderRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/wishlist', wishlistRoutes);

app.use('/api/address', addressRoutes);

app.use('/api/reviews', reviewRoutes);

app.use('/api/upload', uploadRoutes);

app.use('/api/admin', adminRoutes);

app.use('/api/payment', paymentRoutes);
app.use(
  '/api/coupons',

  couponRoutes
);

app.use('/api/refunds', refundRoutes);
app.use(
  '/api/notifications',

  notificationRoutes
);

app.use('/api/product-views', productViewRoutes);

app.use('/api/ai', aiRoutes);

app.use('/api/delivery', deliveryRoutes);
/* MongoDB Connection */

mongoose
  .connect(process.env.MONGO_URI)

  .then(async () => {
    console.log('MongoDB Connected');

    /* Backfill: schedule auto-delete for tickets that were already
     "Closed" before the closedAt field existed. They get closedAt
     set to their last-updated time, so the 7-day TTL applies. */
    try {
      const Ticket = require('./models/TicketModel');

      const closedWithoutStamp = await Ticket.find({
        status: 'Closed',
        closedAt: null
      });

      for (const ticket of closedWithoutStamp) {
        ticket.closedAt = ticket.updatedAt || new Date();

        await ticket.save();
      }

      if (closedWithoutStamp.length > 0) {
        console.log(
          `Scheduled auto-delete for ${closedWithoutStamp.length} previously-closed ticket(s)`
        );
      }
    } catch (error) {
      console.log('Ticket backfill error:', error.message);
    }

    /* Say which brain ShopGenie is using. Without a key it silently falls
       back to the rule engine, which looks like the assistant is broken. */
    const { activeProvider } = require('./controllers/aiController');

    const provider = activeProvider();

    console.log(
      provider
        ? `ShopGenie: AI enabled (${provider.name})`
        : 'ShopGenie: rule engine only (set GEMINI_API_KEY in .env to enable AI)'
    );

    const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server Running on Port ${PORT}`);
});
  })

  .catch((error) => {
    console.log(error);
  });
