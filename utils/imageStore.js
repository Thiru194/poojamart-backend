const mongoose = require('mongoose');

/*
  Image storage backed by MongoDB GridFS.

  Uploads used to land in the local `uploads/` folder, which works on a dev
  machine but not on Render — the disk is wiped on every deploy, so every
  product/profile/refund photo disappeared. Files now live in the database
  (bucket `images`) so they survive restarts and redeploys.

  Filenames keep the same "<timestamp>-<original name>" shape the old multer
  disk storage used, so the URLs already saved in products, users and refunds
  ("<BACKEND_URL>/uploads/<filename>") keep resolving.
*/

const BUCKET_NAME = 'images';

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp'
};

/* Best guess from the file extension, for anything stored without a type. */
const contentTypeFor = (filename) => {
  const dot = String(filename || '').lastIndexOf('.');

  const extension = dot === -1 ? '' : filename.slice(dot).toLowerCase();

  return CONTENT_TYPES[extension] || 'application/octet-stream';
};

/* The MongoDB driver dropped GridFS's own contentType option, so the type
   is kept in metadata. Older files fall back to the extension. */
const contentTypeOf = (file) =>
  (file && file.metadata && file.metadata.contentType) ||
  (file && file.contentType) ||
  contentTypeFor(file && file.filename);

let bucket = null;

const getBucket = () => {
  if (!bucket) {
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: BUCKET_NAME
    });
  }

  return bucket;
};

/* "<timestamp>-<original name>" — matches the old multer filenames. */
const buildFilename = (originalName) => {
  const safeName = String(originalName || 'image')
    .split('/')
    .pop()
    .split('\\')
    .pop()
    .trim();

  return `${Date.now()}-${safeName}`;
};

/* Store a buffer and resolve with the stored filename. */
const saveImage = ({ buffer, originalName, contentType, filename }) =>
  new Promise((resolve, reject) => {
    const storedName = filename || buildFilename(originalName);

    const stream = getBucket().openUploadStream(storedName, {
      metadata: {
        contentType: contentType || contentTypeFor(storedName)
      }
    });

    stream.on('error', reject);

    stream.on('finish', () => {
      resolve(storedName);
    });

    stream.end(buffer);
  });

/* File metadata (_id, length, contentType, uploadDate) or null. */
const findImage = async (filename) => {
  const files = await getBucket().find({ filename }).limit(1).toArray();

  return files[0] || null;
};

/* Readable stream for a stored file — used by the /uploads route. */
const openImageStream = (filename) =>
  getBucket().openDownloadStreamByName(filename);

/* Whole file as a Buffer — used for inline email attachments. */
const readImageBuffer = async (filename) => {
  const file = await findImage(filename);

  if (!file) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const chunks = [];

    const stream = getBucket().openDownloadStream(file._id);

    stream.on('data', (chunk) => chunks.push(chunk));

    stream.on('error', reject);

    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

/* Delete every revision of a filename. Safe to call for unknown names. */
const deleteImage = async (filename) => {
  const files = await getBucket().find({ filename }).toArray();

  for (const file of files) {
    await getBucket().delete(file._id);
  }

  return files.length;
};

module.exports = {
  BUCKET_NAME,
  CONTENT_TYPES,
  getBucket,
  buildFilename,
  contentTypeFor,
  contentTypeOf,
  saveImage,
  findImage,
  openImageStream,
  readImageBuffer,
  deleteImage
};
