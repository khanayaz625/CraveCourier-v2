import { Router } from 'express';
import {
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  reorderOrder,
} from '../controllers/order.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Customer: View their own orders
router.get('/my-orders', protect, getMyOrders);

// Admin: View all platform orders
router.get('/', protect, authorize('admin'), getAllOrders);

// View single order (Customer owner, Delivery partner, or Admin)
router.get('/:id', protect, getOrderById);

// Update status (Admin or Delivery partner)
router.patch('/:id/status', protect, authorize('admin', 'delivery'), updateOrderStatus);

// Reorder items from completed order
router.post('/:id/reorder', protect, reorderOrder);

export default router;

