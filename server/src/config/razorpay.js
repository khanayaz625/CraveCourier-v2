import Razorpay from 'razorpay';
import { ENV } from './env.js';

export const isRazorpayConfigured = () => {
  return (
    Boolean(ENV.RAZORPAY_KEY_ID) &&
    Boolean(ENV.RAZORPAY_KEY_SECRET) &&
    !ENV.RAZORPAY_KEY_ID.includes('placeholder') &&
    (ENV.RAZORPAY_KEY_ID.startsWith('rzp_test_') || ENV.RAZORPAY_KEY_ID.startsWith('rzp_live_'))
  );
};

export const razorpay = new Razorpay({
  key_id: ENV.RAZORPAY_KEY_ID || 'rzp_test_U0kEbnHVgIfK1G',
  key_secret: ENV.RAZORPAY_KEY_SECRET || 'gAxJ8oYQzJH9ee2z74hGIuOZ',
});

export default razorpay;
