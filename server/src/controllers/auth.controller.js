import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.model.js';
import { DeliveryPartnerProfile } from '../models/DeliveryPartnerProfile.model.js';
import { ENV } from '../config/env.js';
import {
  sendVerificationOtpEmail,
  sendPasswordResetOtpEmail,
} from '../services/email.service.js';

// Helper to generate access and refresh tokens
const generateTokens = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found while generating tokens');
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

// Cookie settings helper
const getCookieOptions = (isRefresh = false) => ({
  httpOnly: true,
  secure: ENV.NODE_ENV === 'production',
  sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: isRefresh ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000,
});

// Helper to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * @desc   Register a new user (Customer or Delivery Partner)
 * @route  POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  // 1. Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'An account with this email address already exists');
  }

  // 2. Generate Email Verification OTP (valid for 15 minutes)
  const verificationOtp = generateOTP();
  const verificationOtpExpires = new Date(Date.now() + 15 * 60 * 1000);

  // 3. Create user
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: role || 'customer',
    verificationOtp,
    verificationOtpExpires,
    isEmailVerified: false,
  });

  // 4. If delivery role, initialize delivery profile
  if (user.role === 'delivery') {
    await DeliveryPartnerProfile.create({
      user: user._id,
      vehicle: { type: 'bike' },
      isOnline: false,
      isAvailable: false,
      currentLocation: {
        type: 'Point',
        coordinates: [0, 0],
      },
    });
  }

  // 5. Generate tokens
  const { accessToken, refreshToken } = await generateTokens(user._id);

  // Set refresh token in HTTP-only cookie
  res.cookie('crave_refreshToken', refreshToken, getCookieOptions(true));

  console.info(`[AUTH] Verification OTP for ${email}: ${verificationOtp}`);

  // Dispatch live transactional email via Brevo
  sendVerificationOtpEmail({
    toEmail: user.email,
    toName: user.name,
    otp: verificationOtp,
    expiryMinutes: 15,
  }).catch((err) => console.error('[AUTH] Failed to send verification email:', err));

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          avatar: user.avatar,
        },
        accessToken,
      },
      'Registration successful. Please verify your email with the 6-digit OTP code.'
    )
  );
});

/**
 * @desc   Login user (Customer / Delivery Partner)
 * @route  POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  // 1. Find user with password
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // 2. Verify account status
  if (!user.isActive) {
    throw new ApiError(403, 'Your account is deactivated. Please contact support.');
  }

  // 3. Validate password
  const isMatch = await user.isPasswordCorrect(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // 4. Role validation if client specified a role tab
  if (role && user.role !== role) {
    throw new ApiError(
      403,
      `This account is registered as a ${user.role}. Please log in under the ${user.role} tab.`
    );
  }

  // 5. Prevent admin from logging in via standard customer portal
  if (user.role === 'admin' && !role) {
    throw new ApiError(403, 'Administrators must log in via the dedicated /admin/login portal.');
  }

  // 6. Generate tokens
  const { accessToken, refreshToken } = await generateTokens(user._id);

  res.cookie('crave_refreshToken', refreshToken, getCookieOptions(true));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          avatar: user.avatar,
        },
        accessToken,
      },
      'Logged in successfully'
    )
  );
});

/**
 * @desc   Dedicated Admin Login Portal
 * @route  POST /api/auth/admin-login
 */
export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid administrator credentials');
  }

  if (user.role !== 'admin') {
    throw new ApiError(403, 'Access denied. You do not have administrator privileges.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'This administrator account is currently suspended.');
  }

  const isMatch = await user.isPasswordCorrect(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid administrator credentials');
  }

  const { accessToken, refreshToken } = await generateTokens(user._id);

  res.cookie('crave_refreshToken', refreshToken, getCookieOptions(true));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        accessToken,
      },
      'Welcome back, Administrator'
    )
  );
});

/**
 * @desc   Refresh access token using HTTP-only refresh token cookie
 * @route  POST /api/auth/refresh-token
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.crave_refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized request. No refresh token provided.');
  }

  try {
    const decoded = jwt.verify(incomingRefreshToken, ENV.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded._id).select('+refreshToken');
    if (!user) {
      throw new ApiError(401, 'Invalid refresh token. User not found.');
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, 'Refresh token has expired or already been rotated.');
    }

    // Rotate tokens
    const { accessToken, refreshToken } = await generateTokens(user._id);

    res.cookie('crave_refreshToken', refreshToken, getCookieOptions(true));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
          },
        },
        'Access token refreshed successfully'
      )
    );
  } catch (err) {
    throw new ApiError(401, err.message || 'Invalid refresh token. Please log in again.');
  }
});

/**
 * @desc   Logout user and invalidate refresh token
 * @route  POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.crave_refreshToken || req.body?.refreshToken;

  if (incomingRefreshToken) {
    try {
      const decoded = jwt.verify(incomingRefreshToken, ENV.JWT_REFRESH_SECRET);
      await User.findByIdAndUpdate(decoded._id, { $unset: { refreshToken: 1 } });
    } catch {
      // Ignore token verification errors during logout
    }
  } else if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
  }

  res.clearCookie('crave_refreshToken', getCookieOptions(true));
  res.clearCookie('crave_accessToken', getCookieOptions(false));

  return res.status(200).json(new ApiResponse(200, {}, 'User logged out successfully'));
});

/**
 * @desc   Verify email with 6-digit OTP
 * @route  POST /api/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select('+verificationOtp +verificationOtpExpires');
  if (!user) {
    throw new ApiError(404, 'User account not found');
  }

  if (user.isEmailVerified) {
    return res.status(200).json(new ApiResponse(200, {}, 'Email address is already verified.'));
  }

  if (user.verificationOtp !== otp) {
    throw new ApiError(400, 'Invalid verification code. Please check and try again.');
  }

  if (new Date() > user.verificationOtpExpires) {
    throw new ApiError(400, 'Verification code has expired. Please request a new code.');
  }

  user.isEmailVerified = true;
  user.verificationOtp = undefined;
  user.verificationOtpExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(200, { isEmailVerified: true }, 'Email verified successfully.')
  );
});

/**
 * @desc   Resend email verification OTP
 * @route  POST /api/auth/resend-otp
 */
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'User with this email not found');
  }

  if (user.isEmailVerified) {
    return res.status(200).json(new ApiResponse(200, {}, 'Email is already verified.'));
  }

  const newOtp = generateOTP();
  user.verificationOtp = newOtp;
  user.verificationOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  console.info(`[AUTH] Resent Verification OTP for ${email}: ${newOtp}`);

  // Dispatch live transactional email via Brevo
  sendVerificationOtpEmail({
    toEmail: user.email,
    toName: user.name,
    otp: newOtp,
    expiryMinutes: 15,
  }).catch((err) => console.error('[AUTH] Failed to resend verification email:', err));

  return res.status(200).json(
    new ApiResponse(
      200,
      {},
      'A new 6-digit verification code has been dispatched.'
    )
  );
});

/**
 * @desc   Request password reset OTP
 * @route  POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // For security, do not disclose whether user exists
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          'If an account exists with that email, a password reset code has been sent.'
        )
      );
  }

  const resetOtp = generateOTP();
  user.resetPasswordOtp = resetOtp;
  user.resetPasswordOtpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  await user.save({ validateBeforeSave: false });

  console.info(`[AUTH] Password Reset OTP for ${email}: ${resetOtp}`);

  // Dispatch live password reset email via Brevo
  sendPasswordResetOtpEmail({
    toEmail: user.email,
    toName: user.name,
    otp: resetOtp,
    expiryMinutes: 15,
  }).catch((err) => console.error('[AUTH] Failed to send password reset email:', err));

  return res.status(200).json(
    new ApiResponse(
      200,
      {},
      'If an account exists with that email, a password reset code has been sent.'
    )
  );
});

/**
 * @desc   Reset password using OTP
 * @route  POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpires');
  if (!user) {
    throw new ApiError(400, 'Invalid request. User not found.');
  }

  if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp) {
    throw new ApiError(400, 'Invalid reset code. Please check and try again.');
  }

  if (new Date() > user.resetPasswordOtpExpires) {
    throw new ApiError(400, 'Reset code has expired. Please request a new code.');
  }

  // Update password (triggers bcrypt hashing pre-save hook)
  user.password = newPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordOtpExpires = undefined;
  user.refreshToken = undefined; // Force re-login on all devices
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password reset successfully. You may now log in with your new password.'));
});

/**
 * @desc   Get current authenticated user profile
 * @route  GET /api/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  let deliveryProfile = null;
  if (user.role === 'delivery') {
    deliveryProfile = await DeliveryPartnerProfile.findOne({ user: user._id });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user,
        ...(deliveryProfile && { deliveryProfile }),
      },
      'User profile retrieved successfully'
    )
  );
});

