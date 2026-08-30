const mongoose = require('mongoose');

const fs = require('fs');

const path = require('path');

require('dotenv').config();

const {
  saveImage,
  findImage,
  contentTypeFor,
  BUCKET_NAME
} = require('./utils/imageStore');

/*
  One-time migration: copies every file in the local uploads/ folder into
  MongoDB (GridFS bucket `images`), keeping the exact filename so the URLs
  already stored on products, users and refunds keep resolving.

  Safe to re-run — files already in the database are skipped.

  Run:  node migrateImagesToMongo.js
*/

const UPLOADS_DIR = path.join(__dirname, 'uploads');

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  console.log('MongoDB Connected — migrating uploads/ into GridFS...');

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('No uploads/ folder found — nothing to migrate.');

    await mongoose.disconnect();

    return;
  }

  const files = fs
    .readdirSync(UPLOADS_DIR)
    .filter((name) => fs.statSync(path.join(UPLOADS_DIR, name)).isFile());

  let uploaded = 0;

  let skipped = 0;

  let repaired = 0;

  let failed = 0;

  let bytes = 0;

  for (const filename of files) {
    try {
      const existing = await findImage(filename);

      if (existing) {
        /* Already stored — just make sure it carries a content type, so the
           browser gets image/jpeg rather than a download prompt. */
        if (!existing.metadata || !existing.metadata.contentType) {
          await mongoose.connection.db
            .collection(`${BUCKET_NAME}.files`)
            .updateOne(
              { _id: existing._id },
              { $set: { 'metadata.contentType': contentTypeFor(filename) } }
            );

          repaired++;
        }

        skipped++;

        continue;
      }

      const filePath = path.join(UPLOADS_DIR, filename);

      const buffer = fs.readFileSync(filePath);

      await saveImage({
        buffer,
        filename,
        contentType: contentTypeFor(filename)
      });

      uploaded++;

      bytes += buffer.length;

      console.log(
        `  stored ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`
      );
    } catch (error) {
      failed++;

      console.log(`  FAILED ${filename}: ${error.message}`);
    }
  }

  console.log(
    `\nDone. ${uploaded} stored (${(bytes / 1024 / 1024).toFixed(1)} MB), ` +
      `${skipped} already in MongoDB (${repaired} content type(s) repaired), ` +
      `${failed} failed, ${files.length} total.`
  );

  await mongoose.disconnect();
};

migrate().catch(async (error) => {
  console.log('Migration failed:', error.message);

  await mongoose.disconnect();

  process.exit(1);
});
