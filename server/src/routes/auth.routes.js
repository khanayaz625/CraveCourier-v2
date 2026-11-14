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

// Protected User State
router.get('/me', protect, getMe);

export default router;

