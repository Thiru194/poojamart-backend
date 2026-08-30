const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const Product = require('./models/ProductModel');
const Category = require('./models/CategoryModel');

/*
  DIVINE & SPIRITUAL STORE SEED

  REPLACE: removes the current products and categories and replaces them with a
  spiritual / divine catalog (idols, puja items, incense, malas, spiritual
  jewellery, sacred books, yantras, crystals). Safe to re-run (it just rebuilds
  the spiritual catalog each time).

  Run:  node seedSpiritualStore.js

  Images use LoremFlickr (thematic, keyword-based). Swap any image later from
  the Admin → Edit Product / Category screens if you want exact photos.
*/

/* Stable thematic image for a keyword (lock keeps it from changing on reload) */
let lockSeed = 100;
const flick = (kw, lock) => `https://loremflickr.com/600/600/${kw}?lock=${lock}`;

const build = (rows, category, keyword) =>
  rows.map((r) => {
    const a = lockSeed++;
    const b = lockSeed++;
    const c = lockSeed++;

    return {
      name: r[0],
      category,
      price: r[1],
      image: flick(keyword, a),
      images: [flick(keyword, a), flick(keyword, b), flick(keyword, c)],
      stock: 10 + (a % 40),
      shortDescription: r[2],
      description: `${r[0]} — ${r[2]}. A sacred addition to our ${category} collection, crafted to bring peace, positivity and divine blessings to your home.`,
      highlights: r[3],
      topSale: r[4] === 'sale' || r[5] === 'sale',
      heroProduct: r[4] === 'hero' || r[5] === 'hero'
    };
  });

/* ---- Categories (name + keyword for the card image) ---- */
const CATEGORIES = [
  ['Idols & Statues', 'statue'],
  ['Puja Essentials', 'candle'],
  ['Incense & Dhoop', 'incense'],
  ['Rudraksha & Malas', 'beads'],
  ['Spiritual Jewellery', 'bracelet'],
  ['Sacred Books', 'book'],
  ['Yantras & Wall Art', 'mandala'],
  ['Gemstones & Crystals', 'crystal']
];

/* ---- Products per category: [name, price, shortDesc, highlights, tag?, tag?] ---- */
const idols = [
  ['Brass Ganesha Idol', 1299, 'Handcrafted brass Lord Ganesha', ['Pure brass', 'Handcrafted', 'Removes obstacles'], 'hero'],
  ['Marble Krishna Murti', 2499, 'Elegant marble Krishna with flute', ['Fine marble', 'Hand-painted', 'Divine grace'], 'sale'],
  ['Panchmukhi Hanuman Idol', 1799, 'Five-faced Hanuman for protection', ['Brass finish', 'Protective', 'Detailed carving']],
  ['Lakshmi-Ganesh Set', 1999, 'Prosperity idol pair for Diwali', ['Set of 2', 'Prosperity', 'Gift ready'], 'sale'],
  ['Nataraja Bronze Statue', 3499, 'Dancing Shiva in antique bronze', ['Antique bronze', 'Temple grade', 'Collectible']],
  ['Meditating Buddha Idol', 999, 'Serene Buddha for calm & peace', ['Resin finish', 'Calming', 'Home decor']]
];

const puja = [
  ['Brass Puja Thali Set', 899, 'Complete brass aarti thali set', ['7 pieces', 'Pure brass', 'Daily worship'], 'sale'],
  ['Brass Diya (Set of 5)', 499, 'Traditional oil lamps for aarti', ['Set of 5', 'Long burn', 'Festive']],
  ['Camphor Aarti Holder', 349, 'Kapoor holder with wooden handle', ['Heat safe', 'Wooden handle', 'Easy hold']],
  ['Kumkum & Chandan Box', 299, 'Compartment box for tilak items', ['Multi-compartment', 'Brass', 'Compact']],
  ['Puja Bell (Ghanti)', 449, 'Resonant brass worship bell', ['Clear tone', 'Pure brass', 'Ergonomic']],
  ['Silver-Plated Kalash', 1299, 'Sacred pot for rituals & havan', ['Silver plated', 'Ceremonial', 'Elegant'], 'sale']
];

const incense = [
  ['Sandalwood Agarbatti', 199, 'Pure chandan incense sticks', ['Natural', 'Long lasting', '100 sticks']],
  ['Loban Sambrani Cups', 149, 'Instant-light dhoop cups', ['Instant light', 'Air purifying', '12 cups'], 'sale'],
  ['Nag Champa Incense', 179, 'Classic temple fragrance', ['Iconic aroma', 'Hand rolled', 'Meditation']],
  ['Herbal Dhoop Sticks', 129, 'Charcoal-free herbal dhoop', ['Charcoal free', 'Herbal', 'Low smoke']],
  ['Rose & Jasmine Incense', 159, 'Floral devotional fragrance', ['Floral', 'Soothing', '2 packs']],
  ['Guggul Dhoop Cones', 189, 'Traditional guggul cones', ['Purifying', 'Resin based', '24 cones']]
];

const malas = [
  ['5 Mukhi Rudraksha Mala', 599, '108+1 bead rudraksha mala', ['108+1 beads', 'Energised', 'Japa ready'], 'sale'],
  ['Tulsi Japa Mala', 349, 'Sacred tulsi wood mala', ['Holy basil', 'Lightweight', 'Vaishnav']],
  ['Sphatik Crystal Mala', 799, 'Clear quartz prayer mala', ['Natural crystal', 'Cooling energy', 'Cleansing']],
  ['Sandalwood Chandan Mala', 449, 'Fragrant sandalwood beads', ['Real chandan', 'Aromatic', 'Calming']],
  ['Lotus Seed Mala', 399, 'Kamalgatta 108-bead mala', ['Lotus seeds', 'Lakshmi puja', 'Traditional']],
  ['Rudraksha Bracelet', 299, 'Everyday rudraksha wrist mala', ['Elastic fit', 'Unisex', 'Energised']]
];

const jewellery = [
  ['Seven Chakra Bracelet', 399, 'Balancing chakra stone bracelet', ['7 stones', 'Healing', 'Adjustable'], 'sale'],
  ['Om Pendant Necklace', 499, 'Sacred Om symbol pendant', ['Oxidised finish', 'Unisex', 'Chain included']],
  ['Evil Eye Nazar Bracelet', 249, 'Protective nazar bracelet', ['Protection', 'Adjustable', 'Handmade']],
  ['Silver Trishul Locket', 699, 'Lord Shiva trishul pendant', ['925 look', 'Detailed', 'Devotional']],
  ['Navratna Ring', 1499, 'Nine sacred gemstone ring', ['9 gemstones', 'Astrological', 'Adjustable'], 'sale'],
  ['Copper Healing Bracelet', 349, 'Pure copper wellness band', ['Pure copper', 'Ayurvedic', 'Unisex']]
];

const books = [
  ['Bhagavad Gita (Hardbound)', 299, 'Gita with meaning & commentary', ['Hardbound', 'Sanskrit + English', 'Illustrated'], 'sale'],
  ['Hanuman Chalisa', 99, 'Pocket Hanuman Chalisa', ['Pocket size', 'Easy chant', 'Illustrated']],
  ['Ramayana Illustrated', 499, 'Beautifully illustrated Ramayana', ['Color plates', 'Hardbound', 'Family read']],
  ['Sundarkand Path', 149, 'Sundarkand with meaning', ['Clear print', 'With meaning', 'Devotional']],
  ['Devi Mahatmyam', 249, 'Durga Saptashati text', ['Sanskrit', 'Navratri', 'Complete path']],
  ['Vishnu Sahasranamam', 129, '1000 names of Lord Vishnu', ['Transliteration', 'Meaning', 'Compact']]
];

const yantras = [
  ['Shree Yantra (Copper)', 799, 'Energised copper Shree Yantra', ['Pure copper', 'Prosperity', 'Energised'], 'hero'],
  ['Om Wall Hanging', 599, 'Metal Om for main door', ['Metal art', 'Auspicious', 'Wall mount']],
  ['Vastu Dosh Yantra', 349, 'Corrects vastu imbalance', ['Vastu', 'Framed', 'Wall/altar']],
  ['Mandala Tapestry', 699, 'Cotton mandala wall tapestry', ['Cotton', 'Handprinted', 'Large size'], 'sale'],
  ['Gayatri Yantra Frame', 449, 'Framed Gayatri yantra', ['Framed', 'Meditation', 'Table/wall']],
  ['Swastik Door Hanging', 199, 'Auspicious toran for entrance', ['Festive', 'Handmade', 'Welcoming']]
];

const crystals = [
  ['Amethyst Cluster', 899, 'Natural amethyst calming cluster', ['Natural', 'Calming', 'Raw form'], 'sale'],
  ['Clear Quartz Point', 499, 'Master healer quartz point', ['Amplifying', 'Cleansed', 'Natural']],
  ['Rose Quartz Tumbles', 399, 'Love & harmony stone set', ['Set of 6', 'Polished', 'Love energy']],
  ['Black Tourmaline', 599, 'Protective grounding stone', ['Protection', 'Grounding', 'Raw']],
  ['Citrine Crystal', 699, 'Abundance & positivity stone', ['Wealth stone', 'Natural', 'Charged']],
  ['Seven Chakra Stone Set', 799, 'Balancing set of 7 crystals', ['7 crystals', 'Pouch included', 'Healing']]
];

const products = [
  ...build(idols, 'Idols & Statues', 'statue'),
  ...build(puja, 'Puja Essentials', 'candle'),
  ...build(incense, 'Incense & Dhoop', 'incense'),
  ...build(malas, 'Rudraksha & Malas', 'beads'),
  ...build(jewellery, 'Spiritual Jewellery', 'bracelet'),
  ...build(books, 'Sacred Books', 'book'),
  ...build(yantras, 'Yantras & Wall Art', 'mandala'),
  ...build(crystals, 'Gemstones & Crystals', 'crystal')
];

const categories = CATEGORIES.map(([name, kw], i) => ({
  name,
  image: flick(kw, 500 + i)
}));

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected — replacing catalog with spiritual store...\n');

    try {
      /* ---- Backup existing data before deleting ---- */
      const oldProducts = await Product.find().lean();
      const oldCategories = await Category.find().lean();

      const backupDir = path.join(__dirname, 'backups');
      fs.mkdirSync(backupDir, { recursive: true });

      const stamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);
      const backupFile = path.join(backupDir, `catalog-backup-${stamp}.json`);

      fs.writeFileSync(
        backupFile,
        JSON.stringify(
          { products: oldProducts, categories: oldCategories },
          null,
          2
        )
      );
      console.log(
        `Backed up ${oldProducts.length} products and ${oldCategories.length} categories to:`
      );
      console.log(`  ${backupFile}\n`);

      /* ---- Replace with spiritual catalog ---- */
      const delP = await Product.deleteMany({});
      const delC = await Category.deleteMany({});
      console.log(
        `Removed ${delP.deletedCount} old products and ${delC.deletedCount} old categories.`
      );

      const insC = await Category.insertMany(categories);
      const insP = await Product.insertMany(products);
      console.log(
        `Added ${insC.length} spiritual categories and ${insP.length} spiritual products.`
      );
    } catch (error) {
      console.log('Seed error:', error.message);
    }

    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.log('Connection error:', error.message);
    process.exit(1);
  });
