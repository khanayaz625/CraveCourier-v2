import { Router } from 'express';
import {
  getAllCategories,
  getCategoryByIdOrSlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validations/catalog.validation.js';

const router = Router();

// Public routes
router.get('/', getAllCategories);
router.get('/:identifier', getCategoryByIdOrSlug);

// Protected Management routes (Admin, Vendor)
router.post(
  '/',
  protect,
  authorize('admin', 'vendor'),
  validate(createCategorySchema),
  createCategory
);

router.put(
  '/:id',
  protect,
  authorize('admin', 'vendor'),
  validate(updateCategorySchema),
  updateCategory
);

router.delete('/:id', protect, authorize('admin'), deleteCategory);

export default router;

