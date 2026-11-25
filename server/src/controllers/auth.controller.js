import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.model.js';
import { DeliveryPartnerProfile } from '../models/DeliveryPartnerProfile.model.js';
import { ENV } from '../config/env.js';
import {
  sendVerificationOtpEmail,
  sendLoginOtpEmail,
  sendPasswordResetOtpEmail,
} from '../services/email.service.js';
import {
  sendSmsOtp,
  maskPhoneNumber,
  formatPhoneNumber,
} from '../services/sms.service.js';

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
    if (existingUser.isEmailVerified) {
      throw new ApiError(409, 'An account with this email address already exists. Please log in.');
    }

    // Existing unverified account: update credentials, refresh OTP and allow re-verification!
    existingUser.name = name || existingUser.name;
    existingUser.password = password; // mongoose pre-save hook will hash this password
    if (phone) existingUser.phone = phone;
    if (role) existingUser.role = role;

    const verificationOtp = generateOTP();
    existingUser.verificationOtp = verificationOtp;
    existingUser.verificationOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
    if (existingUser.phone || phone) {
      existingUser.phoneOtp = verificationOtp;
      existingUser.phoneOtpExpires = existingUser.verificationOtpExpires;
    }
    await existingUser.save();

    console.info(`[AUTH] Refreshed OTP for unverified account ${email}: ${verificationOtp}`);

    // Dispatch fresh transactional verification email
    const refreshEmailRes = await sendVerificationOtpEmail({
      toEmail: existingUser.email,
      toName: existingUser.name,
      otp: verificationOtp,
      expiryMinutes: 15,
    }).catch((err) => {
      console.error('[AUTH] Failed to send verification email on account refresh:', err);
      return { success: false };
    });

    // Dispatch fresh SMS OTP via 2Factor.in / SMS Gateway
    if (existingUser.phone || phone) {
      sendSmsOtp({
        phone: existingUser.phone || phone,
        otp: verificationOtp,
        purpose: 'Account Registration Verification',
      }).catch((err) => console.error('[AUTH] Failed to send SMS OTP on account refresh:', err));
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          user: {
            _id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
            phone: existingUser.phone,
            isEmailVerified: false,
            avatar: existingUser.avatar,
          },
          requiresVerification: true,
          emailSent: Boolean(refreshEmailRes?.success),
        },
        'A fresh 6-digit verification code has been sent to your email.'
      )
    );
  }

  // 2. Generate Email & SMS Verification OTP (valid for 15 minutes)
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
    phoneOtp: phone ? verificationOtp : undefined,
    phoneOtpExpires: phone ? verificationOtpExpires : undefined,
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

  // 5. Registration created, dispatch verification email & SMS OTP
  console.info(`[AUTH] Verification OTP for ${email}: ${verificationOtp}`);

  // Dispatch live transactional email via Brevo
  const emailRes = await sendVerificationOtpEmail({
    toEmail: user.email,
    toName: user.name,
    otp: verificationOtp,
    expiryMinutes: 15,
  }).catch((err) => {
    console.error(`[AUTH] Failed to send verification email to ${user.email}:`, err);
    return { success: false };
  });

  // Dispatch live SMS OTP via 2Factor.in / SMS Gateway
  if (user.phone) {
    sendSmsOtp({
      phone: user.phone,
      otp: verificationOtp,
      purpose: 'Account Registration Verification',
    }).catch((err) => console.error(`[AUTH] Failed to send SMS OTP to ${user.phone}:`, err));
  }

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
          isEmailVerified: false,
          avatar: user.avatar,
        },
        requiresVerification: true,
        emailSent: Boolean(emailRes?.success),
      },
      'Registration successful. Please verify with the 6-digit code sent to your email.'
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

  // 3.5. Ensure email is verified before allowing sign in!
  if (!user.isEmailVerified) {
    // Generate fresh OTP and dispatch to email so user can immediately verify
    const verificationOtp = generateOTP();
    user.verificationOtp = verificationOtp;
    user.verificationOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    console.info(`[AUTH] Dispatched new verification OTP on login attempt for ${user.email}: ${verificationOtp}`);

    sendVerificationOtpEmail({
      toEmail: user.email,
      toName: user.name,
      otp: verificationOtp,
      expiryMinutes: 15,
    }).catch((err) => console.error('[AUTH] Failed to dispatch verification email on login:', err));

    return res.status(403).json({
      statusCode: 403,
      success: false,
      isEmailVerified: false,
      email: user.email,
      role: user.role,
      message: 'Email verification required. We have dispatched a fresh 6-digit code to your email. Please verify to sign in.',
    });
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

  // 5.5. Two-Factor Mobile Authentication Check
  if (user.twoFactorEnabled && user.phone) {
    const twoFactorOtp = generateOTP();
    const twoFactorTempToken = crypto.randomBytes(32).toString('hex');
    user.twoFactorOtp = twoFactorOtp;
    user.twoFactorOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.twoFactorTempToken = twoFactorTempToken;
    await user.save({ validateBeforeSave: false });

    // Send SMS OTP
    await sendSmsOtp({
      phone: user.phone,
      otp: twoFactorOtp,
      purpose: '2-Factor Security',
    });

    // Send backup copy to user email
    sendVerificationOtpEmail({
      toEmail: user.email,
      toName: user.name,
      otp: twoFactorOtp,
      expiryMinutes: 10,
    }).catch(() => {});

    const maskedPhone = maskPhoneNumber(user.phone);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          requires2FA: true,
          twoFactorTempToken,
          maskedPhone,
          phone: user.phone,
        },
        `2-Factor Authentication Required: A 6-digit security code has been sent to ${maskedPhone}.`
      )
    );
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
 * @desc   Verify email & mobile phone with 6-digit OTP
 * @route  POST /api/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, phone, otp } = req.body;

  let query = {};
  if (email) {
    query.email = email;
  } else if (phone) {
    const rawDigits = phone.replace(/[^\d]/g, '').slice(-10);
    query = { $or: [{ phone: formatPhoneNumber(phone) }, { phone: { $regex: rawDigits } }] };
  } else {
    throw new ApiError(400, 'Please provide an email address or mobile phone number.');
  }

  const user = await User.findOne(query).select('+verificationOtp +verificationOtpExpires +phoneOtp +phoneOtpExpires');
  if (!user) {
    throw new ApiError(404, 'User account not found');
  }

  if (user.isEmailVerified && user.isPhoneVerified) {
    return res.status(200).json(new ApiResponse(200, {}, 'Account is already verified.'));
  }

  const isMatch =
    (user.verificationOtp && user.verificationOtp === otp) ||
    (user.phoneOtp && user.phoneOtp === otp);

  if (!isMatch) {
    throw new ApiError(400, 'Invalid verification code. Please check and try again.');
  }

  const isExpired =
    user.verificationOtpExpires && new Date() > user.verificationOtpExpires &&
    (!user.phoneOtpExpires || new Date() > user.phoneOtpExpires);

  if (isExpired) {
    throw new ApiError(400, 'Verification code has expired. Please request a new code.');
  }

  user.isEmailVerified = true;
  user.isPhoneVerified = true;
  user.verificationOtp = undefined;
  user.verificationOtpExpires = undefined;
  user.phoneOtp = undefined;
  user.phoneOtpExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // Generate tokens NOW upon successful verification
  const { accessToken, refreshToken } = await generateTokens(user._id);
  res.cookie('crave_refreshToken', refreshToken, getCookieOptions(true));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isEmailVerified: true,
        isPhoneVerified: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          isEmailVerified: true,
          isPhoneVerified: true,
          avatar: user.avatar,
        },
        accessToken,
      },
      'Account verified successfully. Welcome to Crave Courier!'
    )
  );
});

/**
 * @desc   Resend verification OTP (SMS & Email)
 * @route  POST /api/auth/resend-otp
 */
export const resendOtp = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;

  let query = {};
  if (email) {
    query.email = email;
  } else if (phone) {
    const rawDigits = phone.replace(/[^\d]/g, '').slice(-10);
    query = { $or: [{ phone: formatPhoneNumber(phone) }, { phone: { $regex: rawDigits } }] };
  } else {
    throw new ApiError(400, 'Please provide an email address or mobile phone number.');
  }

  const user = await User.findOne(query);
  if (!user) {
    throw new ApiError(404, 'User account not found');
  }

  if (user.isEmailVerified && user.isPhoneVerified) {
    return res.status(200).json(new ApiResponse(200, {}, 'Account is already verified.'));
  }

  const newOtp = generateOTP();
  user.verificationOtp = newOtp;
  user.verificationOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
  if (user.phone) {
    user.phoneOtp = newOtp;
    user.phoneOtpExpires = user.verificationOtpExpires;
  }
  await user.save({ validateBeforeSave: false });

  console.info(`[AUTH] Resent Verification OTP for ${user.email || user.phone}: ${newOtp}`);

  // Dispatch live transactional email via Brevo
  let emailRes = { success: false };
  if (user.email) {
    emailRes = await sendVerificationOtpEmail({
      toEmail: user.email,
      toName: user.name,
      otp: newOtp,
      expiryMinutes: 15,
    }).catch((err) => {
      console.error('[AUTH] Failed to resend verification email:', err);
      return { success: false };
    });
  }

  // Dispatch live SMS OTP via 2Factor.in / SMS Gateway
  if (user.phone) {
    sendSmsOtp({
      phone: user.phone,
      otp: newOtp,
      purpose: 'Account Verification',
    }).catch((err) => console.error('[AUTH] Failed to resend SMS OTP:', err));
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        emailSent: Boolean(emailRes?.success),
      },
      'A fresh 6-digit verification code has been dispatched to your email.'
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
  const emailDispatch = await sendPasswordResetOtpEmail({
    toEmail: user.email,
    toName: user.name,
    otp: resetOtp,
    expiryMinutes: 15,
  });

  if (!emailDispatch?.success) {
    console.error(`[AUTH] Failed to send password reset email to ${user.email}:`, emailDispatch?.error);
  } else {
    console.info(`[AUTH] Password reset email sent to ${user.email}, messageId: ${emailDispatch?.messageId}`);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        emailSent: Boolean(emailDispatch?.success),
      },
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

  if (!user || !user.isEmailVerified) {
    throw new ApiError(401, 'Email verification required. Please verify your email.');
  }

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

/**
 * @desc   Verify 2-Factor Authentication OTP
 * @route  POST /api/auth/verify-2fa
 */
export const verify2FA = asyncHandler(async (req, res) => {
  const { twoFactorTempToken, otp } = req.body;

  const user = await User.findOne({ twoFactorTempToken })
    .select('+twoFactorOtp +twoFactorOtpExpires +twoFactorTempToken');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired two-factor authentication session. Please sign in again.');
  }

  if (!user.twoFactorOtp || user.twoFactorOtp !== otp) {
    throw new ApiError(400, 'Invalid 6-digit security code. Please check your SMS and try again.');
  }

  if (new Date() > user.twoFactorOtpExpires) {
    throw new ApiError(400, 'Security code has expired. Please request a fresh code.');
  }

  // Clear temporary 2FA token credentials
  user.twoFactorOtp = undefined;
  user.twoFactorOtpExpires = undefined;
  user.twoFactorTempToken = undefined;
  await user.save({ validateBeforeSave: false });

  // Generate session tokens
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
          twoFactorEnabled: user.twoFactorEnabled,
          isEmailVerified: user.isEmailVerified,
          avatar: user.avatar,
        },
        accessToken,
      },
      'Two-Factor Authentication verified successfully'
    )
  );
});

/**
 * @desc   Resend 2-Factor Authentication SMS OTP
 * @route  POST /api/auth/resend-2fa
 */
export const resend2FA = asyncHandler(async (req, res) => {
  const { twoFactorTempToken } = req.body;

  const user = await User.findOne({ twoFactorTempToken })
    .select('+twoFactorOtp +twoFactorOtpExpires +twoFactorTempToken');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired two-factor session. Please log in again.');
  }

  const newOtp = generateOTP();
  user.twoFactorOtp = newOtp;
  user.twoFactorOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  await sendSmsOtp({
    phone: user.phone,
    otp: newOtp,
    purpose: '2-Factor Security',
  });

  sendVerificationOtpEmail({
    toEmail: user.email,
    toName: user.name,
    otp: newOtp,
    expiryMinutes: 10,
  }).catch(() => {});

  return res.status(200).json(
    new ApiResponse(
      200,
      {},
      `A fresh 6-digit security code has been sent to your phone.`
    )
  );
});

/**
 * @desc   Fast 1-Tap Mobile OTP Login - Send SMS
 * @route  POST /api/auth/mobile/send-otp
 */
export const sendMobileOtp = asyncHandler(async (req, res) => {
  const { phone, role = 'customer' } = req.body;
  const cleanPhone = formatPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
  }

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  // Find existing user or create/update candidate
  let user = await User.findOne({ phone: cleanPhone });
  if (user) {
    user.phoneOtp = otp;
    user.phoneOtpExpires = otpExpires;
    await user.save({ validateBeforeSave: false });
  } else {
    const rawDigits = phone.replace(/[^\d]/g, '').slice(-10);
    user = await User.findOne({ phone: { $regex: rawDigits } });
    if (user) {
      user.phone = cleanPhone;
      user.phoneOtp = otp;
      user.phoneOtpExpires = otpExpires;
      await user.save({ validateBeforeSave: false });
    } else {
      // Auto-register new user with mobile number
      const tempEmail = `phone_${rawDigits}_${Date.now()}@cravecourier.app`;
      user = await User.create({
        name: 'Crave Foodie',
        email: tempEmail,
        password: crypto.randomBytes(16).toString('hex'),
        phone: cleanPhone,
        role: role || 'customer',
        phoneOtp: otp,
        phoneOtpExpires: otpExpires,
        isEmailVerified: true,
        isPhoneVerified: false,
      });

      if (user.role === 'delivery') {
        await DeliveryPartnerProfile.create({
          user: user._id,
          vehicle: { type: 'bike' },
          isOnline: false,
          isAvailable: false,
          currentLocation: { type: 'Point', coordinates: [0, 0] },
        });
      }
    }
  }

  await sendSmsOtp({
    phone: cleanPhone,
    otp,
    purpose: 'Mobile Login',
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        phone: maskPhoneNumber(cleanPhone),
      },
      `6-digit OTP code sent to ${maskPhoneNumber(cleanPhone)}`
    )
  );
});

/**
 * @desc   Fast 1-Tap Mobile OTP Login - Verify Code & Authenticate
 * @route  POST /api/auth/mobile/verify-otp
 */
export const verifyMobileOtp = asyncHandler(async (req, res) => {
  const { phone, otp, name, role = 'customer' } = req.body;
  const cleanPhone = formatPhoneNumber(phone);
  const rawDigits = phone.replace(/[^\d]/g, '').slice(-10);

  const user = await User.findOne({
    $or: [{ phone: cleanPhone }, { phone: { $regex: rawDigits } }],
  }).select('+phoneOtp +phoneOtpExpires');

  if (!user) {
    throw new ApiError(404, 'No account found for this mobile number. Please request a new OTP.');
  }

  if (!user.phoneOtp || user.phoneOtp !== otp) {
    throw new ApiError(400, 'Invalid OTP code. Please enter the 6-digit code received via SMS.');
  }

  if (new Date() > user.phoneOtpExpires) {
    throw new ApiError(400, 'OTP code has expired. Please request a new OTP.');
  }

  // Mark phone as verified and clear temporary OTP
  user.isPhoneVerified = true;
  user.phoneOtp = undefined;
  user.phoneOtpExpires = undefined;
  if (name && name.trim()) {
    user.name = name.trim();
  }
  await user.save({ validateBeforeSave: false });

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
          twoFactorEnabled: user.twoFactorEnabled,
          isPhoneVerified: user.isPhoneVerified,
          avatar: user.avatar,
        },
        accessToken,
      },
      'Logged in successfully via mobile OTP'
    )
  );
});

/**
 * @desc   Toggle Two-Factor Mobile Authentication on user profile
 * @route  POST /api/auth/toggle-2fa
 */
export const toggle2FA = asyncHandler(async (req, res) => {
  const { enabled, phone } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User account not found');
  }

  if (enabled) {
    const targetPhone = phone || user.phone;
    if (!targetPhone) {
      throw new ApiError(400, 'A valid mobile phone number is required to enable Two-Factor Authentication.');
    }
    user.phone = formatPhoneNumber(targetPhone);
    user.twoFactorEnabled = true;
    user.isPhoneVerified = true;
  } else {
    user.twoFactorEnabled = false;
  }

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        twoFactorEnabled: user.twoFactorEnabled,
        phone: user.phone,
      },
      user.twoFactorEnabled
        ? `Two-Factor Mobile Authentication is now ACTIVE. Every sign in will require an SMS code sent to ${maskPhoneNumber(user.phone)}.`
        : 'Two-Factor Mobile Authentication has been deactivated.'
    )
  );
});

/**
 * @desc   Send 6-digit Email OTP for Passwordless / Session-Expired Login
 * @route  POST /api/auth/email/send-otp
 */
export const sendEmailLoginOtp = asyncHandler(async (req, res) => {
  const { email, role } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'No account found with this email address. Please sign up first.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account is deactivated. Please contact support.');
  }

  if (user.role === 'admin' && !role) {
    throw new ApiError(403, 'Administrators must log in via the dedicated /admin/login portal.');
  }

  if (role && user.role !== role) {
    throw new ApiError(
      403,
      `This account is registered as a ${user.role}. Please log in under the ${user.role} tab.`
    );
  }

  const otp = generateOTP();
  user.loginOtp = otp;
  user.loginOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  console.info(`[AUTH] Email Login OTP for ${user.email}: ${otp}`);

  const emailRes = await sendLoginOtpEmail({
    toEmail: user.email,
    toName: user.name,
    otp,
    expiryMinutes: 15,
  }).catch((err) => {
    console.error(`[AUTH] Failed to send login OTP email to ${user.email}:`, err);
    return { success: false, error: err.message };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email: user.email,
        emailSent: Boolean(emailRes?.success),
      },
      emailRes?.success
        ? `6-digit sign-in OTP sent to ${user.email}`
        : `6-digit sign-in OTP generated for ${user.email}.`
    )
  );
});

/**
 * @desc   Verify 6-digit Email OTP and issue session tokens
 * @route  POST /api/auth/email/verify-otp
 */
export const verifyEmailLoginOtp = asyncHandler(async (req, res) => {
  const { email, otp, role } = req.body;

  const user = await User.findOne({ email }).select('+loginOtp +loginOtpExpires');
  if (!user) {
    throw new ApiError(404, 'No account found with this email address.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account is deactivated. Please contact support.');
  }

  if (role && user.role !== role) {
    throw new ApiError(
      403,
      `This account is registered as a ${user.role}. Please log in under the ${user.role} tab.`
    );
  }

  if (!user.loginOtp || user.loginOtp !== otp) {
    throw new ApiError(400, 'Invalid 6-digit email OTP code. Please check your inbox and try again.');
  }

  if (!user.loginOtpExpires || new Date() > user.loginOtpExpires) {
    throw new ApiError(400, 'Email OTP code has expired. Please request a new code.');
  }

  // Email ownership verified; clear temporary login OTP
  user.isEmailVerified = true;
  user.loginOtp = undefined;
  user.loginOtpExpires = undefined;
  await user.save({ validateBeforeSave: false });

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
          isEmailVerified: true,
          twoFactorEnabled: user.twoFactorEnabled,
          avatar: user.avatar,
        },
        accessToken,
      },
      'Logged in successfully via Email OTP'
    )
  );
});

