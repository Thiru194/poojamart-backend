const express = require('express');

const router = express.Router();

const productController = require('../controllers/productController');

/* Top Sale Products */
router.get('/topsale', productController.getTopSaleProducts);

/* Products By Category */
router.get('/category/:category', productController.getProductsByCategory);

/* Create Product */
router.post('/', productController.createProduct);

/* All Products */
router.get('/', productController.getProducts);

/* Toggle Top Sale */
router.put('/:id/topsale', productController.toggleTopSale);

/* Single Product */
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);

router.delete('/:id', productController.deleteProduct);
router.put('/hero/:id', productController.setHeroProduct);
module.exports = router;
