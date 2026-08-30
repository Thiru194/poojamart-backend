const mongoose = require('mongoose');

require('dotenv').config();

const Product = require('./models/ProductModel');
const Category = require('./models/CategoryModel');

/*
  Tops every category up to 10 products. Categories already at 10+ are left
  untouched. Products are deduped by name and use their category's own image
  (curated + guaranteed to load). Additive — never deletes.

  Run once:  node seedFillCategories.js
*/

const TEMPLATES = {
  Keyboards: [
    ['Logitech MX Keys', 9999, 'Premium wireless keyboard', ['Backlit', 'USB-C', 'Multi-device']],
    ['Keychron K2', 7499, 'Compact mechanical keyboard', ['Hot-swap', 'Bluetooth', 'RGB']],
    ['Razer Huntsman Mini', 8999, '60% optical gaming keyboard', ['Optical', 'RGB', 'PBT keycaps']],
    ['Corsair K70 RGB', 12999, 'Mechanical gaming keyboard', ['Cherry MX', 'Aluminium', 'RGB']],
    ['HP Wireless K200', 1499, 'Everyday wireless keyboard', ['Wireless', 'Spill-resistant', 'Quiet']],
    ['Dell KB216', 999, 'Reliable wired keyboard', ['Wired', 'Full-size', 'Plug & play']],
    ['Logitech K380', 2999, 'Multi-device compact keyboard', ['Bluetooth', '3 devices', 'Compact']],
    ['Redgear Shadow', 1999, 'Budget gaming keyboard', ['Membrane', 'Backlit', 'Braided cable']],
    ['Zebronics Max Plus', 1299, 'Value mechanical keyboard', ['Blue switches', 'LED', 'Metal top']],
    ['Apple Magic Keyboard', 9900, 'Sleek wireless keyboard', ['Rechargeable', 'Scissor keys', 'Slim']]
  ],
  Televisions: [
    ['Sony Bravia 55" 4K', 79999, '4K HDR smart TV', ['4K HDR', 'Google TV', 'Dolby']],
    ['Samsung Crystal 50" 4K', 45999, 'Crystal 4K UHD TV', ['4K', 'Tizen OS', 'HDR10+']],
    ['LG OLED C3 55"', 139999, 'Premium OLED TV', ['OLED', '120Hz', 'webOS']],
    ['Mi TV 43" FHD', 25999, 'Value smart TV', ['FHD', 'PatchWall', 'Dolby Audio']],
    ['OnePlus TV 55" Q2', 54999, 'QLED smart TV', ['QLED', 'Dolby Vision', 'Android TV']],
    ['TCL 65" 4K', 59999, 'Big-screen 4K TV', ['4K', 'Google TV', 'HDR']],
    ['Realme 40" Smart TV', 21999, 'Compact smart TV', ['FHD', 'Android', 'Chromecast']],
    ['Panasonic 43" 4K', 38999, '4K LED smart TV', ['4K', 'HDR', 'Web browser']],
    ['Sony 65" Full Array', 129999, 'Full-array LED 4K TV', ['Full array', '120Hz', 'Google TV']],
    ['Toshiba 50" 4K', 33999, 'Affordable 4K TV', ['4K', 'Vidaa OS', 'Dolby']]
  ],
  Speakers: [
    ['JBL Flip 6', 9999, 'Portable waterproof speaker', ['IP67', '12hr', 'PartyBoost']],
    ['Bose SoundLink Flex', 14999, 'Premium portable speaker', ['Waterproof', 'PositionIQ', '12hr']],
    ['Sony SRS-XB13', 3499, 'Compact extra-bass speaker', ['Extra Bass', 'IP67', '16hr']],
    ['Marshall Emberton II', 12999, 'Retro-style portable speaker', ['360 sound', 'IP67', '20hr']],
    ['boAt Stone 350', 1999, 'Rugged budget speaker', ['IPX7', '12hr', 'TWS']],
    ['Sony SRS-XG300', 24999, 'Powerful party speaker', ['X-Balanced', '25hr', 'Lights']],
    ['JBL PartyBox 110', 26999, 'Loud party speaker', ['160W', 'Light show', 'IPX4']],
    ['Ultimate Ears BOOM 3', 13999, '360 portable speaker', ['360 sound', 'IP67', '15hr']],
    ['Amazon Echo Dot 5', 5499, 'Smart voice speaker', ['Alexa', 'Rich sound', 'Smart home']],
    ['Zebronics Sound Bomb', 2499, 'Value TWS speaker', ['TWS', 'IPX5', '12hr']]
  ],
  Gaming: [
    ['Sony PlayStation 5', 54990, 'Next-gen gaming console', ['4K gaming', 'SSD', 'DualSense']],
    ['Xbox Series X', 52990, 'Powerful gaming console', ['4K 120fps', '1TB SSD', 'Quick Resume']],
    ['Nintendo Switch OLED', 34999, 'Hybrid gaming console', ['OLED', 'Handheld', 'Joy-Con']],
    ['Razer Kishi V2', 7999, 'Mobile gaming controller', ['Low latency', 'Ergonomic', 'USB-C']],
    ['Logitech G502 Hero', 4999, 'Pro gaming mouse', ['25K DPI', '11 buttons', 'RGB']],
    ['SteelSeries Arctis 7', 12999, 'Wireless gaming headset', ['Lossless', '24hr', 'ClearCast']],
    ['Razer Kraken', 5999, 'Gaming headset with mic', ['7.1 surround', 'Cooling gel', 'RGB']],
    ['Xbox Wireless Controller', 5499, 'Ergonomic game controller', ['Bluetooth', 'Textured grip', 'Share']],
    ['Logitech G920', 24999, 'Racing wheel & pedals', ['Force feedback', 'Leather', 'Responsive']],
    ['Redgear Pro Wireless', 2499, 'Budget wireless controller', ['Wireless', 'Dual vibration', 'Turbo']]
  ],
  Fitness: [
    ['Fitbit Charge 6', 14999, 'Advanced fitness tracker', ['GPS', 'HR', '7-day battery']],
    ['Mi Smart Band 8', 3499, 'Popular fitness band', ['AMOLED', '150 modes', '16-day battery']],
    ['Garmin Vivosmart 5', 15999, 'Slim fitness tracker', ['Body Battery', 'HR', '7-day']],
    ['Amazfit Band 7', 2999, 'Value fitness band', ['AMOLED', 'SpO2', '18-day']],
    ['Noise Pulse Band', 1499, 'Budget fitness band', ['Color display', 'HR', 'SpO2']],
    ['Yoga Mat Pro', 1499, 'Anti-slip exercise mat', ['6mm', 'Anti-slip', 'Eco TPE']],
    ['Adjustable Dumbbell Set', 5999, 'Home workout dumbbells', ['Adjustable', 'Compact', 'Steel']],
    ['Resistance Bands Kit', 999, 'Full-body resistance set', ['5 levels', 'Portable', 'Latex']],
    ['Skipping Rope Pro', 499, 'Speed skipping rope', ['Ball bearing', 'Adjustable', 'Anti-slip']],
    ['Digital Weighing Scale', 1299, 'Smart body weight scale', ['LED', '180kg', 'Tempered glass']]
  ],
  'Power Banks': [
    ['Anker PowerCore 20000', 3999, 'High-capacity power bank', ['20000mAh', 'PD', '2 ports']],
    ['Mi Power Bank 3i', 1999, 'Value 20000mAh bank', ['18W', 'Triple port', 'Fast charge']],
    ['Ambrane 10000mAh', 999, 'Compact power bank', ['10000mAh', '20W', 'Slim']],
    ['Realme 30W Dart', 2499, 'Fast-charge power bank', ['30W', '10000mAh', 'Dual output']],
    ['Anker Nano 10000', 3499, 'Pocket-size power bank', ['10000mAh', '30W', 'USB-C']],
    ['boAt EnergyShroom', 1799, 'Rugged power bank', ['20000mAh', '22.5W', 'LED']],
    ['Samsung 25W Bank', 2999, 'Super-fast power bank', ['25W', '10000mAh', 'USB-C']],
    ['URBN 27000mAh', 2799, 'Extra-large power bank', ['27000mAh', '22.5W', 'Triple port']],
    ['Portronics Luxcell', 1299, 'Slim wireless power bank', ['10000mAh', 'Wireless', 'PD']],
    ['Duracell 15000', 2199, 'Reliable power bank', ['15000mAh', '18W', 'Dual USB']]
  ],
  Tablets: [
    ['Apple iPad 10th Gen', 44900, 'Everyday all-round tablet', ['10.9"', 'A14', 'USB-C']],
    ['Samsung Galaxy Tab S9', 74999, 'Premium Android tablet', ['AMOLED', 'S Pen', 'Snapdragon 8 Gen 2']],
    ['iPad Air M2', 59900, 'Powerful mid tablet', ['M2', 'Liquid Retina', 'USB-C']],
    ['Xiaomi Pad 6', 26999, 'Value flagship tablet', ['120Hz', 'Snapdragon 870', '8840mAh']],
    ['Lenovo Tab P11', 19999, 'Entertainment tablet', ['2K', 'Dolby Atmos', 'Quad speakers']],
    ['Samsung Tab A9+', 18999, 'Affordable big tablet', ['11"', '90Hz', 'Quad speakers']],
    ['Realme Pad 2', 15999, 'Budget media tablet', ['2K', 'Helio G99', '8360mAh']],
    ['iPad Mini 6', 46900, 'Compact powerful tablet', ['8.3"', 'A15', 'USB-C']],
    ['OnePlus Pad', 37999, 'Premium Android tablet', ['144Hz', 'Dimensity 9000', '9510mAh']],
    ['Honor Pad X9', 15499, 'Large-screen value tablet', ['11.5"', '120Hz', '6 speakers']]
  ],
  Mice: [
    ['Logitech MX Master 3S', 8999, 'Pro productivity mouse', ['8K DPI', 'Quiet click', 'MagSpeed']],
    ['Logitech G502 X', 6999, 'Precision gaming mouse', ['25.6K DPI', 'Lightforce', 'RGB']],
    ['Razer DeathAdder V3', 5999, 'Ergonomic gaming mouse', ['30K DPI', '64g', 'Optical']],
    ['Logitech Pebble M350', 1799, 'Silent compact mouse', ['Silent', 'Slim', 'Bluetooth']],
    ['HP X200', 799, 'Everyday wired mouse', ['Wired', '1000 DPI', 'Ambidextrous']],
    ['Dell MS116', 699, 'Reliable optical mouse', ['Wired', 'Optical', 'Plug & play']],
    ['Zebronics Transformer', 999, 'Budget gaming mouse', ['Backlit', '3200 DPI', 'Braided']],
    ['Logitech M235', 1299, 'Compact wireless mouse', ['Wireless', 'Long battery', 'Nano receiver']],
    ['Redgear A15', 899, 'Value wired gaming mouse', ['RGB', '3200 DPI', '6 buttons']],
    ['Apple Magic Mouse', 8500, 'Sleek multi-touch mouse', ['Multi-touch', 'Rechargeable', 'Slim']]
  ],
  Monitors: [
    ['LG UltraGear 27" 144Hz', 24999, 'Fast gaming monitor', ['144Hz', '1ms', 'IPS']],
    ['Dell S2721 27" QHD', 21999, 'Sharp QHD monitor', ['QHD', '75Hz', 'IPS']],
    ['Samsung Odyssey G5 32"', 27999, 'Curved gaming monitor', ['165Hz', '1000R', 'QHD']],
    ['BenQ GW2480 24"', 9999, 'Eye-care office monitor', ['FHD', 'IPS', 'Low blue light']],
    ['Acer Nitro 23.8" 165Hz', 12999, 'Budget gaming monitor', ['165Hz', 'FHD', 'FreeSync']],
    ['LG 27" 4K UHD', 32999, '4K creator monitor', ['4K', 'HDR10', 'USB-C']],
    ['ASUS ProArt 27"', 45999, 'Color-accurate monitor', ['Calman', 'QHD', '100% sRGB']],
    ['MSI Optix 27" Curved', 17999, 'Immersive curved monitor', ['165Hz', 'Curved', 'FHD']],
    ['ViewSonic 24" FHD', 8499, 'Value everyday monitor', ['FHD', 'IPS', '75Hz']],
    ['Samsung 34" Ultrawide', 39999, 'Ultrawide productivity monitor', ['Ultrawide', '100Hz', 'HDR10']]
  ],
  Headphones: [
    ['Sony WH-1000XM5', 29990, 'Best-in-class ANC headphones', ['ANC', '30hr', 'LDAC']],
    ['Bose QC Ultra', 34999, 'Premium noise-cancelling', ['ANC', 'Immersive audio', '24hr']],
    ['Apple AirPods Pro 2', 24900, 'Flagship ANC earbuds', ['ANC', 'USB-C', 'Spatial audio']],
    ['Sony WF-1000XM5', 21999, 'Top ANC earbuds', ['ANC', '8hr', 'LDAC']],
    ['JBL Tune 760NC', 5999, 'Value ANC headphones', ['ANC', '35hr', 'Foldable']],
    ['boAt Rockerz 450', 1499, 'Budget wireless headphones', ['15hr', '40mm', 'Lightweight']],
    ['Sennheiser HD 450BT', 9999, 'Balanced ANC headphones', ['ANC', '30hr', 'aptX']],
    ['OnePlus Buds 3', 5499, 'Value flagship earbuds', ['ANC', 'Dual drivers', '44hr']],
    ['Marshall Major IV', 11999, 'Iconic on-ear headphones', ['80hr', 'Wireless charge', 'Foldable']],
    ['Nothing Ear (2)', 9999, 'Transparent design earbuds', ['ANC', 'Hi-Res', 'LHDC']]
  ],
  Printers: [
    ['HP DeskJet 2331', 4499, 'All-in-one home printer', ['Print/Scan/Copy', 'USB', 'Compact']],
    ['Canon PIXMA G3010', 12999, 'Ink tank all-in-one', ['Ink tank', 'WiFi', 'Low cost/page']],
    ['Epson EcoTank L3250', 15999, 'Refillable ink tank printer', ['EcoTank', 'WiFi', '3-in-1']],
    ['HP LaserJet M126nw', 16999, 'Mono laser printer', ['Laser', 'WiFi', 'Fast']],
    ['Brother HL-B2000D', 13499, 'Duplex mono laser', ['Auto duplex', 'Fast', 'High yield']],
    ['Canon PIXMA TS207', 3299, 'Compact single-function printer', ['USB', 'Compact', 'Affordable']],
    ['Epson L3110', 13999, 'Popular ink tank printer', ['Ink tank', '3-in-1', 'Low cost']],
    ['HP Smart Tank 580', 17999, 'Wireless ink tank printer', ['WiFi', 'Ink tank', 'Mobile print']],
    ['Brother DCP-T420W', 14499, 'Wireless ink tank AIO', ['WiFi', 'Ink tank', '3-in-1']],
    ['Canon imageCLASS MF3010', 15499, 'Compact laser AIO', ['Laser', 'Scan/Copy', 'Compact']]
  ],
  Electronics: [
    ['Amazon Echo Show 8', 12999, 'Smart display with Alexa', ['8" HD', 'Alexa', 'Video call']],
    ['Apple TV 4K', 14900, 'Streaming media player', ['4K HDR', 'tvOS', 'Siri remote']],
    ['Google Nest Hub', 7999, 'Smart home display', ['Assistant', '7" display', 'Smart home']],
    ['Ring Video Doorbell', 8999, 'Smart video doorbell', ['1080p', 'Motion alerts', '2-way talk']],
    ['TP-Link Deco Mesh', 10999, 'Whole-home mesh WiFi', ['Mesh', 'Dual-band', 'App control']],
    ['Philips Hue Starter Kit', 9999, 'Smart lighting kit', ['16M colors', 'App/voice', 'Dimmable']],
    ['Sonos One Speaker', 19999, 'Smart Hi-Fi speaker', ['Voice control', 'Rich sound', 'WiFi']],
    ['Logitech C920 Webcam', 6999, 'Full HD webcam', ['1080p', 'Stereo mic', 'Autofocus']],
    ['Wipro Smart Bulb', 799, 'WiFi color smart bulb', ['16M colors', 'App/voice', 'Schedule']],
    ['Seagate 2TB HDD', 5999, 'Portable external drive', ['2TB', 'USB 3.0', 'Plug & play']]
  ]
};

const TARGET = 10;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected — filling categories...\n');

    const categories = await Category.find();
    const products = await Product.find().select('name category');

    const existingNames = new Set(products.map((p) => p.name.toLowerCase()));
    const countByCat = {};
    products.forEach((p) => {
      countByCat[p.category] = (countByCat[p.category] || 0) + 1;
    });

    const toInsert = [];
    const summary = [];

    for (const cat of categories) {
      const current = countByCat[cat.name] || 0;

      if (current >= TARGET) {
        summary.push(`  ${cat.name}: ${current} — left as-is`);
        continue;
      }

      const needed = TARGET - current;
      const templates = (TEMPLATES[cat.name] || []).filter(
        (t) => !existingNames.has(t[0].toLowerCase())
      );
      const chosen = templates.slice(0, needed);

      chosen.forEach((t) => {
        toInsert.push({
          name: t[0],
          category: cat.name,
          price: t[1],
          image: cat.image,
          stock: 8 + ((toInsert.length * 7) % 40),
          shortDescription: t[2],
          description: `${t[0]} — ${t[2]}. A great pick in our ${cat.name} collection.`,
          highlights: t[3],
          topSale: false
        });
        existingNames.add(t[0].toLowerCase());
      });

      const note =
        chosen.length < needed ? ` (no template for ${needed - chosen.length} more)` : '';
      summary.push(`  ${cat.name}: had ${current}, added ${chosen.length}${note}`);
    }

    if (toInsert.length) {
      await Product.insertMany(toInsert);
    }

    console.log(summary.join('\n'));
    console.log(`\nTotal inserted: ${toInsert.length}`);

    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.log('Error:', error.message);
    process.exit(1);
  });
