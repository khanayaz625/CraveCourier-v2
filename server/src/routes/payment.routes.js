import { Router } from 'express';
import {
  createPaymentIntent,
  confirmStripePayment,
  createCodOrder,
  handleStripeWebhook,
  refundOrder,
} from '../controllers/payment.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// 1. Stripe Webhook (Must NOT be protected with JWT; verified via Stripe signature HMAC)
router.post('/webhook', handleStripeWebhook);

// 2. Client Payment Endpoints (Protected for customers)
router.post('/create-intent', protect, createPaymentIntent);
router.post('/confirm', protect, confirmStripePayment);
router.post('/create-cod-order', protect, createCodOrder);

// 3. Admin-Triggered Refunds
router.post('/refund/:orderId', protect, authorize('admin'), refundOrder);

export default router;

