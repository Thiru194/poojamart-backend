const express = require('express');

const router = express.Router();

const upload = require('../middleware/uploadMiddleware');

const { saveImage } = require('../utils/imageStore');

/* Images are stored in MongoDB, but the URL shape is unchanged
   ("<BACKEND_URL>/uploads/<filename>") so every URL already saved on a
   product, profile or refund keeps working. */
const imageUrl = (filename) => `${process.env.BACKEND_URL}/uploads/${filename}`;

router.post(
  '/',

  upload.single('image'),

  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'No image uploaded'
        });
      }

      const filename = await saveImage({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        contentType: req.file.mimetype
      });

      res.json({
        image: imageUrl(filename)
      });
    } catch (error) {
      console.log('Image upload failed:', error.message);

      res.status(500).json({
        message: 'Image upload failed'
      });
    }
  }
);

/* Multiple images (product gallery). Returns an array of URLs. */
router.post(
  '/multiple',

  upload.array('images', 10),

  async (req, res) => {
    try {
      const images = [];

      for (const file of req.files || []) {
        const filename = await saveImage({
          buffer: file.buffer,
          originalName: file.originalname,
          contentType: file.mimetype
        });

        images.push(imageUrl(filename));
      }

      res.json({ images });
    } catch (error) {
      console.log('Image upload failed:', error.message);

      res.status(500).json({
        message: 'Image upload failed'
      });
    }
  }
);

module.exports = router;
