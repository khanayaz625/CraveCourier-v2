import { Router } from 'express';
import {
  getProducts,
  getAutocompleteSuggestions,
  getFeaturedSections,
  getProductBySlugOrId,
  createProduct,
  updateProduct,
  deleteProduct,
  exportProductsCSV,
  importProducts,
} from '../controllers/product.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
} from '../validations/catalog.validation.js';

const router = Router();

// Public Catalog Endpoints
router.get('/', getProducts);
router.get('/export/csv', exportProductsCSV);
router.get('/autocomplete', getAutocompleteSuggestions);
router.get('/sections/featured', getFeaturedSections);
router.get('/:identifier', getProductBySlugOrId);

// Bulk Import (Admin)
router.post('/import/csv', protect, authorize('admin'), importProducts);
router.post('/import', protect, authorize('admin'), importProducts);

// Protected Management Endpoints (Admin, Vendor)
router.post(
  '/',
  protect,
  authorize('admin', 'vendor'),
  validate(createProductSchema),
  createProduct
);

router.put(
  '/:id',
  protect,
  authorize('admin', 'vendor'),
  validate(updateProductSchema),
  updateProduct
);

router.delete('/:id', protect, authorize('admin', 'vendor'), deleteProduct);

export default router;

