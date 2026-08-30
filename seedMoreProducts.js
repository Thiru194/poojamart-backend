const mongoose = require('mongoose');

require('dotenv').config();

const Product = require('./models/ProductModel');

/*
  Additive seed: inserts 50 demo products (10 each across Mobiles, Laptops,
  Accessories, Cameras, Smart Watches) WITHOUT deleting existing products.

  Run once:  node seedMoreProducts.js
*/

/* Category-appropriate Unsplash images (reused within a category). */
const IMG = {
  mobile: [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9',
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab',
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97'
  ],
  laptop: [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed'
  ],
  accessory: [
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0',
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'
  ],
  camera: [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f'
  ],
  watch: [
    'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12'
  ]
};

const img = (arr, i) => arr[i % arr.length];

const mobiles = [
  ['iPhone 15 Pro', 134900, 'Titanium flagship with A17 Pro', ['A17 Pro chip', '48MP camera', 'Titanium body']],
  ['Samsung Galaxy S24 Ultra', 129999, 'AI-powered Galaxy flagship', ['200MP camera', 'S Pen', 'Snapdragon 8 Gen 3']],
  ['OnePlus 12', 64999, 'Flagship killer with fast charging', ['100W charging', 'Snapdragon 8 Gen 3', '120Hz AMOLED']],
  ['Google Pixel 8', 75999, 'Best-in-class computational camera', ['Tensor G3', 'Magic Editor', '7 yrs updates']],
  ['Xiaomi 14', 69999, 'Compact powerhouse with Leica optics', ['Leica camera', 'Snapdragon 8 Gen 3', '120Hz']],
  ['Realme GT 6', 40999, 'Performance-focused mid flagship', ['Snapdragon 8s Gen 3', '120W charge', '5500 nits']],
  ['Vivo X100', 63999, 'Photography-first flagship', ['Zeiss optics', 'Dimensity 9300', '100W charge']],
  ['Oppo Find X7', 59999, 'Sleek design with Hasselblad camera', ['Hasselblad', 'Dimensity 9300', 'AMOLED']],
  ['Nothing Phone 2', 44999, 'Unique Glyph interface design', ['Glyph LEDs', 'Snapdragon 8+ Gen 1', 'Clean OS']],
  ['Motorola Edge 50', 35999, 'Curved display with clean Android', ['pOLED display', '125W charge', 'IP68']]
];

const laptops = [
  ['Dell XPS 15', 165999, 'Premium creator laptop', ['Intel Core i9', 'OLED display', 'RTX 4060']],
  ['HP Spectre x360', 139999, 'Convertible 2-in-1 ultrabook', ['360 hinge', 'OLED touch', 'Intel Evo']],
  ['Lenovo ThinkPad X1 Carbon', 152999, 'Business-class lightweight laptop', ['1.12kg', 'Core i7', 'MIL-STD tested']],
  ['Asus ROG Zephyrus G14', 149999, 'Compact gaming powerhouse', ['Ryzen 9', 'RTX 4070', '165Hz']],
  ['Apple MacBook Air M3', 114900, 'Fanless, all-day battery ultrabook', ['M3 chip', '18hr battery', 'Liquid Retina']],
  ['Acer Swift 3', 62999, 'Affordable everyday ultrabook', ['Core i5', '16GB RAM', '1.2kg']],
  ['MSI Katana 15', 94999, 'Value gaming laptop', ['RTX 4060', '144Hz', 'Core i7']],
  ['Microsoft Surface Laptop 5', 108999, 'Premium Windows ultrabook', ['PixelSense touch', 'Core i7', 'Alcantara']],
  ['Samsung Galaxy Book4 Pro', 129999, 'Sleek AMOLED productivity laptop', ['AMOLED', 'Core Ultra 7', '1.16kg']],
  ['LG Gram 16', 119999, 'Ultra-light large-screen laptop', ['1.19kg', '16" display', 'Core i7']]
];

const accessories = [
  ['USB-C 65W Fast Charger', 1999, 'Compact GaN fast charger', ['65W GaN', 'Multi-device', 'Foldable pins']],
  ['Wireless Ergonomic Mouse', 1499, 'Silent-click wireless mouse', ['Silent click', '2.4GHz', '18-month battery']],
  ['Mechanical Keyboard', 3999, 'Hot-swappable RGB keyboard', ['Hot-swap', 'RGB', 'PBT keycaps']],
  ['Laptop Sleeve 15.6"', 899, 'Water-resistant padded sleeve', ['Water-resistant', 'Padded', 'Slim']],
  ['Power Bank 20000mAh', 2499, 'High-capacity fast power bank', ['20000mAh', '22.5W', 'Dual USB']],
  ['7-in-1 USB-C Hub', 2799, 'Expand ports for your laptop', ['HDMI 4K', 'SD reader', '100W PD']],
  ['Adjustable Phone Stand', 699, 'Aluminium foldable stand', ['Aluminium', 'Foldable', 'Anti-slip']],
  ['Tempered Glass Protector', 499, 'Crystal-clear screen guard', ['9H hardness', 'Oleophobic', 'Bubble-free']],
  ['Bluetooth 5.3 Adapter', 899, 'Add wireless audio to any PC', ['BT 5.3', 'Plug & play', 'Low latency']],
  ['Cable Organizer Kit', 599, 'Tidy up your desk cables', ['Reusable', '10 clips', 'Adhesive']]
];

const cameras = [
  ['Canon EOS R6 Mark II', 219999, 'Full-frame hybrid mirrorless', ['24MP FF', '40fps', '4K 60p']],
  ['Nikon Z6 II', 164999, 'Versatile full-frame mirrorless', ['24.5MP', 'Dual card', '4K UHD']],
  ['Sony Alpha A7 IV', 234999, 'Acclaimed full-frame all-rounder', ['33MP', 'Real-time AF', '4K 60p']],
  ['Fujifilm X-T5', 154999, 'Retro-style APS-C powerhouse', ['40MP APS-C', 'IBIS', 'Film sims']],
  ['Panasonic Lumix S5 II', 149999, 'Video-focused full-frame', ['Phase AF', '6K video', 'IBIS']],
  ['GoPro Hero 12 Black', 41999, 'Rugged action camera', ['5.3K video', 'HyperSmooth 6', 'Waterproof']],
  ['DJI Osmo Pocket 3', 55999, 'Pocket gimbal vlog camera', ['1" sensor', '3-axis gimbal', '4K 120fps']],
  ['Canon RF 50mm f/1.8', 15999, 'Sharp nifty-fifty prime lens', ['f/1.8', 'STM motor', 'Lightweight']],
  ['Sony FE 24-70mm f/2.8', 189999, 'Pro standard zoom lens', ['f/2.8', 'G Master', 'Weather-sealed']],
  ['Aluminium Camera Tripod', 4999, 'Stable travel tripod', ['160cm', 'Ball head', '1.4kg']]
];

const watches = [
  ['Apple Watch Series 9', 45900, 'Advanced health & fitness watch', ['S9 chip', 'Double tap', 'Always-on']],
  ['Samsung Galaxy Watch 6', 33999, 'Sleek Wear OS smartwatch', ['BioActive sensor', 'Wear OS', 'Sapphire glass']],
  ['Fitbit Versa 4', 20999, 'Everyday fitness companion', ['GPS', '6-day battery', '40+ modes']],
  ['Garmin Venu 3', 47990, 'Premium GPS health watch', ['AMOLED', '14-day battery', 'Sleep coach']],
  ['Amazfit GTR 4', 18999, 'Long-battery AMOLED watch', ['14-day battery', 'Dual GPS', '150+ modes']],
  ['Noise ColorFit Pro 5', 3499, 'Budget AMOLED smartwatch', ['1.85" AMOLED', 'BT calling', '7-day battery']],
  ['boAt Wave Call 2', 1799, 'Affordable calling smartwatch', ['BT calling', 'HR monitor', '7-day battery']],
  ['Fossil Gen 6', 22999, 'Stylish Wear OS smartwatch', ['Wear OS', 'Fast charge', 'HR + SpO2']],
  ['Huawei Watch GT 4', 21999, 'Elegant long-battery watch', ['14-day battery', 'AMOLED', 'TruSeen 5.5']],
  ['Realme Watch 3 Pro', 4999, 'Large-display budget watch', ['1.78" AMOLED', 'GPS', 'BT calling']]
];

const build = (rows, category, images, saleEvery) =>
  rows.map((r, i) => ({
    name: r[0],
    category,
    price: r[1],
    image: img(images, i),
    stock: 8 + ((i * 7) % 40),
    shortDescription: r[2],
    description: `${r[0]} — ${r[2]}. A great pick in our ${category} collection.`,
    highlights: r[3],
    topSale: i % saleEvery === 0
  }));

const products = [
  ...build(mobiles, 'Mobiles', IMG.mobile, 3),
  ...build(laptops, 'Laptops', IMG.laptop, 3),
  ...build(accessories, 'Accessories', IMG.accessory, 4),
  ...build(cameras, 'Cameras', IMG.camera, 4),
  ...build(watches, 'Smart Watches', IMG.watch, 3)
];

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected — inserting products...');
    try {
      const inserted = await Product.insertMany(products);
      console.log(`Inserted ${inserted.length} products (existing ones untouched).`);
    } catch (error) {
      console.log('Insert error:', error.message);
    }
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.log('Connection error:', error.message);
    process.exit(1);
  });
