const express = require('express');

const router = express.Router();

const upload = require('../middleware/uploadMiddleware');

router.post(
  '/',

  upload.single('image'),

  (req, res) => {
    res.json({
      image: `http://localhost:5000/uploads/${req.file.filename}`
    });
  }
);

/* Multiple images (product gallery). Returns an array of URLs. */
router.post(
  '/multiple',

  upload.array('images', 10),

  (req, res) => {
    const images = (req.files || []).map(
      (file) => `http://localhost:5000/uploads/${file.filename}`
    );
    res.json({ images });
  }
);

module.exports = router;
