import Stripe from 'stripe';
import { ENV } from './env.js';

export const isStripeConfigured = () => {
  return (
    Boolean(ENV.STRIPE_SECRET_KEY) &&
    !ENV.STRIPE_SECRET_KEY.includes('placeholder') &&
    (ENV.STRIPE_SECRET_KEY.startsWith('sk_test_') || ENV.STRIPE_SECRET_KEY.startsWith('sk_live_'))
  );
};

// Initialize Stripe instance
export const stripe = new Stripe(ENV.STRIPE_SECRET_KEY || 'sk_test_placeholder_crave', {
  apiVersion: '2024-12-18.acacia',
  appInfo: {
    name: 'Crave Food & Grocery Delivery',
    version: '1.0.0',
  },
});

export default stripe;

