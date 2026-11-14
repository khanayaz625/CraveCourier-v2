import { Router } from 'express';
import {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  syncGuestCart,
} from '../controllers/cart.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

// All cart operations require authentication
router.use(protect);

router.get('/', getCart);
router.post('/items', addItem);
router.put('/items/:productId', updateItemQuantity);
router.delete('/items/:productId', removeItem);
router.delete('/', clearCart);

// Coupons
router.post('/coupon', applyCoupon);
router.delete('/coupon', removeCoupon);

// Guest sync
router.post('/sync', syncGuestCart);

export default router;
