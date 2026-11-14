import { Router } from 'express';
import {
  getDeliveryProfile,
  toggleDutyStatus,
  updateGpsLocation,
  getAvailableOrders,
  acceptOrder,
  rejectOrder,
  pickupOrder,
  startOutForDelivery,
  completeDeliveryWithOtp,
  autoAssignNearestPartner,
  getEarningsHistory,
  updateKycProfile,
} from '../controllers/delivery.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all delivery partner endpoints (Role: delivery or admin)
router.use(protect);
router.use(authorize('delivery', 'admin'));

// Profile & Telemetry
router.get('/profile', getDeliveryProfile);
router.patch('/status', toggleDutyStatus);
router.patch('/location', updateGpsLocation);
router.patch('/kyc', updateKycProfile);

// Order Queue & Dispatch Flow
router.get('/available-orders', getAvailableOrders);
router.post('/auto-assign/:orderId', autoAssignNearestPartner);
router.post('/orders/:id/accept', acceptOrder);
router.post('/orders/:id/reject', rejectOrder);

// Active Delivery Milestones
router.patch('/orders/:id/pickup', pickupOrder);
router.patch('/orders/:id/out-for-delivery', startOutForDelivery);
router.post('/orders/:id/complete', completeDeliveryWithOtp);

// Earnings & History
router.get('/earnings', getEarningsHistory);

export default router;

