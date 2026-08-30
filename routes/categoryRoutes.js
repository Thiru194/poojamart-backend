const express = require('express');

const router = express.Router();

const {
  getCategories,

  createCategory,

  updateCategory,

  deleteCategory,

  getProductsByCategory
} = require('../controllers/categoryController');

/* Get All Categories
   Create Category */

router
  .route('/')

  .get(getCategories)

  .post(createCategory);

/* Get Products By Category */

router.get(
  '/products/:category',

  getProductsByCategory
);

/* Update Category
   Delete Category */

router
  .route('/:id')

  .put(updateCategory)

  .delete(deleteCategory);

module.exports = router;
