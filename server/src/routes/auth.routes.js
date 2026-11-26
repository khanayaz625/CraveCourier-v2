import { Router } from 'express';
import {
  register,
  login,
  adminLogin,
  refreshAccessToken,
  logout,
  verifyEmail,
  resendOtp,
  forgotPassword,
  resetPassword,
  getMe,
  sendMobileOtp,
  verifyMobileOtp,
  sendEmailLoginOtp,
  verifyEmailLoginOtp,
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { otpRateLimiter } from '../middlewares/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  verifyEmailSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendMobileOtpSchema,
  verifyMobileOtpSchema,
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
} from '../validations/auth.validation.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/admin-login', validate(adminLoginSchema), adminLogin);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logout);

// Verification and Password Recovery
router.post('/verify-email', otpRateLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-otp', otpRateLimiter, validate(resendOtpSchema), resendOtp);
router.post('/forgot-password', otpRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', otpRateLimiter, validate(resetPasswordSchema), resetPassword);

// Fast 1-Tap Mobile OTP Endpoints (Phone Login)
router.post('/mobile/send-otp', otpRateLimiter, validate(sendMobileOtpSchema), sendMobileOtp);
router.post('/mobile/verify-otp', otpRateLimiter, validate(verifyMobileOtpSchema), verifyMobileOtp);

// Email OTP Login Endpoints (Passwordless & Session-Expired Re-Login)
router.post('/email/send-otp', otpRateLimiter, validate(sendEmailOtpSchema), sendEmailLoginOtp);
router.post('/email/verify-otp', otpRateLimiter, validate(verifyEmailOtpSchema), verifyEmailLoginOtp);

// Protected User State
router.get('/me', protect, getMe);

export default router;

