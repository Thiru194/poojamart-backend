const express = require('express');

const router = express.Router();

const upload = require('../middleware/uploadMiddleware');

router.post(
  '/',

  upload.single('image'),

  (req, res) => {
    res.json({
      image: `${process.env.BACKEND_URL}/uploads/${req.file.filename}`
    });
  }
);

/* Multiple images (product gallery). Returns an array of URLs. */
router.post(
  '/multiple',

  upload.array('images', 10),

  (req, res) => {
    const images = (req.files || []).map(
      (file) => `${process.env.BACKEND_URL}/uploads/${file.filename}`
    );
    res.json({ images });
  }
);

module.exports = router;
