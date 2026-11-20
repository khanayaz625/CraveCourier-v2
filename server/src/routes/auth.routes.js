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
  verify2FA,
  resend2FA,
  sendMobileOtp,
  verifyMobileOtp,
  toggle2FA,
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  verifyEmailSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verify2FASchema,
  resend2FASchema,
  sendMobileOtpSchema,
  verifyMobileOtpSchema,
  toggle2FASchema,
} from '../validations/auth.validation.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/admin-login', validate(adminLoginSchema), adminLogin);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logout);

// Verification and Password Recovery
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/resend-otp', validate(resendOtpSchema), resendOtp);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// 2-Factor Mobile Authentication Endpoints
router.post('/verify-2fa', validate(verify2FASchema), verify2FA);
router.post('/resend-2fa', validate(resend2FASchema), resend2FA);
router.post('/toggle-2fa', protect, validate(toggle2FASchema), toggle2FA);

// Fast 1-Tap Mobile OTP Endpoints (Phone Login)
router.post('/mobile/send-otp', validate(sendMobileOtpSchema), sendMobileOtp);
router.post('/mobile/verify-otp', validate(verifyMobileOtpSchema), verifyMobileOtp);

// Protected User State
router.get('/me', protect, getMe);

export default router;

