const multer = require('multer');

/*
  Files are held in memory and then written to MongoDB (GridFS) by the upload
  routes — see utils/imageStore.js. Nothing touches the local disk any more,
  because the deployed server's filesystem is wiped on every restart.
*/

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    /* Comfortably above the largest image in the catalogue (~2.5 MB). */
    fileSize: 8 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);

      return;
    }

    cb(new Error('Only image files are allowed'));
  }
});

module.exports = upload;
