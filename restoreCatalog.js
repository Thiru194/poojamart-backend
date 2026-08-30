const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const Product = require('./models/ProductModel');
const Category = require('./models/CategoryModel');

/*
  Restore a catalog backup created by seedSpiritualStore.js.

  Usage:
    node restoreCatalog.js                     -> restores the newest backup
    node restoreCatalog.js catalog-backup-....json  -> restores a specific file

  REPLACE: clears current products/categories and re-inserts the backed-up ones
  (with their original _id values preserved).
*/

const backupDir = path.join(__dirname, 'backups');

const pickBackupFile = () => {
  const arg = process.argv[2];
  if (arg) {
    const full = path.isAbsolute(arg) ? arg : path.join(backupDir, arg);
    if (!fs.existsSync(full)) throw new Error(`Backup not found: ${full}`);
    return full;
  }

  if (!fs.existsSync(backupDir)) {
    throw new Error('No backups folder found. Nothing to restore.');
  }

  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith('catalog-backup-') && f.endsWith('.json'))
    .sort();

  if (!files.length) throw new Error('No backup files found in /backups.');

  return path.join(backupDir, files[files.length - 1]);
};

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    try {
      const file = pickBackupFile();
      console.log(`Restoring from: ${file}\n`);

      const { products = [], categories = [] } = JSON.parse(
        fs.readFileSync(file, 'utf-8')
      );

      const delP = await Product.deleteMany({});
      const delC = await Category.deleteMany({});
      console.log(
        `Removed ${delP.deletedCount} current products and ${delC.deletedCount} categories.`
      );

      if (categories.length) await Category.insertMany(categories);
      if (products.length) await Product.insertMany(products);
      console.log(
        `Restored ${categories.length} categories and ${products.length} products.`
      );
    } catch (error) {
      console.log('Restore error:', error.message);
    }

    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.log('Connection error:', error.message);
    process.exit(1);
  });
