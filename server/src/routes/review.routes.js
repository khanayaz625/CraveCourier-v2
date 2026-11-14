import { Router } from 'express';
import {
  createOrderReview,
  getOrderReviews,
  getProductReviews,
} from '../controllers/review.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

// Public: View product reviews
router.get('/product/:productId', getProductReviews);

// Protected: View or create order reviews
router.get('/order/:orderId', protect, getOrderReviews);
router.post('/', protect, createOrderReview);

export default router;

