import { Router } from 'express';
import {
  createPaymentIntent,
  confirmStripePayment,
  createCodOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
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

// 3. Razorpay Endpoints (UPI, Cards, NetBanking, Wallets)
router.post('/razorpay/create-order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);

// 4. Admin-Triggered Refunds
router.post('/refund/:orderId', protect, authorize('admin'), refundOrder);

export default router;

