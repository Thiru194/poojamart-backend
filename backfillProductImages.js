const mongoose = require('mongoose');

require('dotenv').config();

const Product = require('./models/ProductModel');

/*
  Gives every product a 5-image gallery. Products in the same category
  share the same set of category-appropriate images. Each product's own
  existing `image` is kept as the first (main) image, then 4 category
  images are appended. Only touches products that don't already have a
  5+ image gallery, so it's safe to re-run.

  Run once:  node backfillProductImages.js
*/

const U = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`;

/* 4 extra images per category (the product's own image is image #1). */
const POOLS = {
  Mobiles: ['1592750475338-74b7b21085ab', '1598327105666-5b89351aff97', '1580910051074-3eb694886505', '1510557880182-3d4d3cba35a5'],
  Laptops: ['1517336714731-489689fd1ca8', '1588872657578-7efd1f1555ed', '1541807084-5c52b6b3adef', '1496181133206-80ce9b88a853'],
  Accessories: ['1527864550417-7fd91fc51a46', '1505740420928-5e560c06d30e', '1600080972464-8e5f35f63d08', '1583863788434-e58a36330cf0'],
  Cameras: ['1502920917128-1aa500764cbd', '1526170375885-4d8ecf77b99f', '1606986628253-05620e9b0f4b', '1516035069371-29a1b244cc32'],
  'Smart Watches': ['1508685096489-7aacd43bd3b1', '1546868871-7041f2a55e12', '1579586337278-3befd40fd17a', '1575311373937-040b8e1fd5b6'],
  Speakers: ['1507878866276-a947ef722fee', '1608043152269-423dbba4e7e1', '1589003077984-894e133dabab', '1545454675-3531b543be5d'],
  Keyboards: ['1587829741301-dc798b83add3', '1618384887929-16ec33fab9ef', '1595225476474-87563907a212', '1511467687858-23d96c32e4ae'],
  Televisions: ['1461151304267-38535e780c79', '1601944177325-f8867652837f', '1571415060716-baff5f717797', '1593784991095-a205069470b6'],
  Gaming: ['1552820728-8b83bb6b773f', '1593305841991-05c297ba4575', '1550745165-9bc0b252726f', '1606144042614-b2417e99c4e3'],
  Fitness: ['1571902943202-507ec2618e8f', '1518611012118-696072aa579a', '1534438327276-14e5300c3a48', '1571019613454-1cb2f99b2d8b'],
  'Power Banks': ['1609091839311-d5365f9ff1c5', '1622957461168-202e611c1e2f', '1585338107529-13afc5f02586', '1583863788434-e58a36330cf0'],
  Tablets: ['1544244015-0df4b3ffc6b0', '1561154464-82e9adf32764', '1585790050230-5dd28404ccb9', '1546054454-aa26e2b734c7'],
  Mice: ['1527814050087-3793815479db', '1615663245857-ac93bb7c39e7', '1618384887929-16ec33fab9ef', '1527864550417-7fd91fc51a46'],
  Monitors: ['1527443224154-c4a3942d3acf', '1587614382346-4ec70e388b28', '1517336714731-489689fd1ca8', '1546538915-a9e2c8d0b3d0'],
  Headphones: ['1583394838336-acd977736f90', '1484704849700-f032a568e944', '1546435770-a3e426bf472b', '1505740420928-5e560c06d30e'],
  Printers: ['1612815154858-60aa4c59eaa6', '1586953208448-b95a79798f07', '1563770660941-20978e870e26', '1516387938699-a93567ec168e'],
  Electronics: ['1498049794561-7780e7231661', '1526170375885-4d8ecf77b99f', '1550009158-9ebf69173e03', '1512446816042-444d641267d4']
};

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected — backfilling galleries...');

    const products = await Product.find();

    let updated = 0;

    for (const product of products) {
      if (product.images && product.images.length >= 5) {
        continue;
      }

      const extras = (POOLS[product.category] || []).map(U);

      /* main image first, then category extras, deduped, padded to 5 */
      const set = [];
      const push = (url) => {
        if (url && !set.includes(url)) set.push(url);
      };

      push(product.image);
      extras.forEach(push);
      while (set.length < 5) {
        push(product.image + '#' + set.length); // guaranteed unique padding
      }

      product.images = set.slice(0, 5);
      await product.save();
      updated++;
    }

    console.log(`Backfilled ${updated} of ${products.length} product(s).`);

    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.log('Error:', error.message);
    process.exit(1);
  });
