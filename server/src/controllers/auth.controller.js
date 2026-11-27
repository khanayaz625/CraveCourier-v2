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
  getPhoneLookupVariants,
} from '../services/sms.service.js';

const MAX_OTP_FAILED_ATTEMPTS = 5;
const OTP_LOCK_DURATION_MS = 15 * 60 * 1000;

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

// Cookie settings helper (supports cross-origin HTTPS even behind reverse proxy)
const getCookieOptions = (req, isRefresh = false) => {
  const isHttps =
    ENV.NODE_ENV === 'production' ||
    Boolean(req?.secure) ||
    req?.headers?.['x-forwarded-proto'] === 'https';

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: isRefresh ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000,
  };
};

// Cryptographically secure 6-digit OTP generator
const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

// Constant-time string comparison for OTPs
const isOtpMatch = (storedOtp, providedOtp) => {
  if (typeof storedOtp !== 'string' || typeof providedOtp !== 'string') return false;
  if (!storedOtp || !providedOtp) return false;
  const a = Buffer.from(storedOtp, 'utf8');
  const b = Buffer.from(providedOtp, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

// Mask OTPs in production logs
const logAuthOtp = (label, target, otp) => {
  const safeOtp = ENV.NODE_ENV === 'production' ? '******' : otp;
  console.info(`[AUTH] ${label} for ${target}: ${safeOtp}`);
};

// Lookup user safely by email, phone, or generic identifier (no unanchored $regex)
const findUserByIdentifier = async ({ email, phone, identifier }, selectFields = '') => {
  const raw = (identifier || '').trim();
  const resolvedEmail = (email || (raw.includes('@') ? raw : '')).trim().toLowerCase();
  const resolvedPhone = (phone || (!raw.includes('@') && raw ? raw : '')).trim();

  let query = null;
  if (resolvedEmail) {
    query = { email: resolvedEmail };
  } else if (resolvedPhone) {
    const variants = getPhoneLookupVariants(resolvedPhone);
    if (variants.length === 0) {
      return null;
    }
    query = { phone: { $in: variants } };
  } else {
    return null;
  }

  const dbQuery = User.findOne(query);
  return selectFields ? dbQuery.select(selectFields) : dbQuery;
};

// Enforce per-account OTP brute-force lockout
const assertNotOtpLocked = (user) => {
  if (user.otpLockedUntil && new Date() < user.otpLockedUntil) {
    throw new ApiError(
      429,
      'Too many incorrect OTP attempts. For your security, please request a new code or try again in 15 minutes.'
    );
  }
};

// Record failed OTP attempt and invalidate OTP after MAX_OTP_FAILED_ATTEMPTS
const recordOtpFailure = async (user, fieldsToClear = {}) => {
  const nextAttempts = (user.otpFailedAttempts || 0) + 1;
  user.otpFailedAttempts = nextAttempts;

  if (nextAttempts >= MAX_OTP_FAILED_ATTEMPTS) {
    Object.keys(fieldsToClear).forEach((field) => {
      user[field] = undefined;
    });
    user.otpLockedUntil = new Date(Date.now() + OTP_LOCK_DURATION_MS);
  }

  await user.save({ validateBeforeSave: false });
};

/**
 * @desc   Register a new user (Customer or Delivery Partner)
 * @route  POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  const formattedPhone = phone ? formatPhoneNumber(phone) : undefined;

  // 1. Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw new ApiError(409, 'An account with this email address already exists. Please log in.');
    }

    // Existing unverified account: update credentials, refresh OTP and allow re-verification
    existingUser.name = name || existingUser.name;
    existingUser.password = password; // mongoose pre-save hook will hash this password
    if (formattedPhone) existingUser.phone = formattedPhone;
    if (role) existingUser.role = role;

    const verificationOtp = generateOTP();
    existingUser.verificationOtp = verificationOtp;
    existingUser.verificationOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
    existingUser.otpFailedAttempts = 0;
    existingUser.otpLockedUntil = undefined;
    if (existingUser.phone) {
      existingUser.phoneOtp = verificationOtp;
      existingUser.phoneOtpExpires = existingUser.verificationOtpExpires;
    }
    await existingUser.save();

    logAuthOtp('Refreshed OTP for unverified account', email, verificationOtp);

    const [refreshEmailRes, refreshSmsRes] = await Promise.all([
      sendVerificationOtpEmail({
        toEmail: existingUser.email,
        toName: existingUser.name,
        otp: verificationOtp,
        expiryMinutes: 15,
      }).catch((err) => {
        console.error('[AUTH] Failed to send verification email on account refresh:', err);
        return { success: false };
      }),
      existingUser.phone
        ? sendSmsOtp({
            phone: existingUser.phone,
            otp: verificationOtp,
            purpose: 'Account Registration Verification',
          }).catch((err) => {
            console.error('[AUTH] Failed to send SMS OTP on account refresh:', err);
            return { success: false };
          })
        : Promise.resolve({ success: false }),
    ]);

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
          smsSent: Boolean(refreshSmsRes?.success),
          ...(refreshEmailRes?.success ? {} : { emailError: refreshEmailRes?.error || 'Email delivery failed' }),
        },
        refreshEmailRes?.success
          ? 'A fresh 6-digit verification code has been sent to your email.'
          : 'Account ready for verification, but email delivery failed. Please tap Resend OTP.'
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
    phone: formattedPhone,
    role: role || 'customer',
    verificationOtp,
    verificationOtpExpires,
    phoneOtp: formattedPhone ? verificationOtp : undefined,
    phoneOtpExpires: formattedPhone ? verificationOtpExpires : undefined,
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
  logAuthOtp('Verification OTP', email, verificationOtp);

  const [emailRes, smsRes] = await Promise.all([
    sendVerificationOtpEmail({
      toEmail: user.email,
      toName: user.name,
      otp: verificationOtp,
      expiryMinutes: 15,
    }).catch((err) => {
      console.error(`[AUTH] Failed to send verification email to ${user.email}:`, err);
      return { success: false };
    }),
    user.phone
      ? sendSmsOtp({
          phone: user.phone,
          otp: verificationOtp,
          purpose: 'Account Registration Verification',
        }).catch((err) => {
          console.error(`[AUTH] Failed to send SMS OTP to ${maskPhoneNumber(user.phone)}:`, err);
          return { success: false };
        })
      : Promise.resolve({ success: false }),
  ]);

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
        smsSent: Boolean(smsRes?.success),
        ...(emailRes?.success ? {} : { emailError: emailRes?.error || 'Email delivery failed' }),
      },
      emailRes?.success
        ? 'Registration successful. Please verify with the 6-digit code sent to your email.'
        : 'Registration successful, but we could not send the verification email right now. Please tap Resend OTP.'
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

  // 3.5. Ensure email is verified before allowing sign in
  if (!user.isEmailVerified) {
    const verificationOtp = generateOTP();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    user.verificationOtp = verificationOtp;
    user.verificationOtpExpires = expiry;
    user.otpFailedAttempts = 0;
    user.otpLockedUntil = undefined;
    if (user.phone) {
      user.phoneOtp = verificationOtp;
      user.phoneOtpExpires = expiry;
    }
    await user.save({ validateBeforeSave: false });

    logAuthOtp('Dispatched new verification OTP on login attempt', user.email, verificationOtp);

    const [loginEmailRes] = await Promise.all([
      sendVerificationOtpEmail({
        toEmail: user.email,
        toName: user.name,
        otp: verificationOtp,
        expiryMinutes: 15,
      }).catch((err) => {
        console.error('[AUTH] Failed to dispatch verification email on login:', err);
        return { success: false, error: err.message };
      }),
      user.phone
        ? sendSmsOtp({
            phone: user.phone,
            otp: verificationOtp,
            purpose: 'Account Verification',
          }).catch((err) => {
            console.error('[AUTH] Failed to dispatch SMS verification OTP on login:', err);
            return { success: false };
          })
        : Promise.resolve({ success: false }),
    ]);

    return res.status(403).json({
      statusCode: 403,
      success: false,
      isEmailVerified: false,
      email: user.email,
      role: user.role,
      emailSent: Boolean(loginEmailRes?.success),
      ...(loginEmailRes?.success ? {} : { emailError: loginEmailRes?.error || 'Email delivery failed' }),
      message: loginEmailRes?.success
        ? 'Email verification required. We have dispatched a fresh 6-digit code to your email.'
        : 'Email verification required, but we could not send the email right now. Please tap Resend OTP.',
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

  // 6. Generate tokens
  const { accessToken, refreshToken } = await generateTokens(user._id);

  res.cookie('crave_refreshToken', refreshToken, getCookieOptions(req, true));

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

  res.cookie('crave_refreshToken', refreshToken, getCookieOptions(req, true));

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

    const user = await User.findById(decoded._id).select('+refreshToken +passwordChangedAt');
    if (!user) {
      throw new ApiError(401, 'Invalid refresh token. User not found.');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
    }

    if (
      user.passwordChangedAt &&
      decoded.iat &&
      decoded.iat * 1000 < user.passwordChangedAt.getTime() - 1000
    ) {
      throw new ApiError(401, 'Password was recently changed. Please log in again.');
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, 'Refresh token has expired or already been rotated.');
    }

    // Rotate tokens
    const { accessToken, refreshToken } = await generateTokens(user._id);

    res.cookie('crave_refreshToken', refreshToken, getCookieOptions(req, true));

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
            phone: user.phone,
            avatar: user.avatar,
          },
        },
        'Access token refreshed successfully'
      )
    );
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'Invalid or expired refresh token. Please log in again.');
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

  res.clearCookie('crave_refreshToken', getCookieOptions(req, true));
  res.clearCookie('crave_accessToken', getCookieOptions(req, false));

  return res.status(200).json(new ApiResponse(200, {}, 'User logged out successfully'));
});

/**
 * @desc   Verify email & mobile phone with 6-digit OTP
 * @route  POST /api/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, phone, otp } = req.body;

  const user = await findUserByIdentifier(
    { email, phone },
    '+verificationOtp +verificationOtpExpires +phoneOtp +phoneOtpExpires +otpFailedAttempts +otpLockedUntil'
  );
  if (!user) {
    throw new ApiError(404, 'User account not found');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account is deactivated. Please contact support.');
  }

  if (user.isEmailVerified && user.isPhoneVerified) {
    return res.status(200).json(new ApiResponse(200, {}, 'Account is already verified.'));
  }

  assertNotOtpLocked(user);

  const emailOtpMatched = isOtpMatch(user.verificationOtp, otp);
  const phoneOtpMatched = isOtpMatch(user.phoneOtp, otp);

  if (!emailOtpMatched && !phoneOtpMatched) {
    await recordOtpFailure(user, {
      verificationOtp: 1,
      verificationOtpExpires: 1,
      phoneOtp: 1,
      phoneOtpExpires: 1,
    });
    throw new ApiError(400, 'Invalid verification code. Please check and try again.');
  }

  const now = new Date();
  const isEmailOtpValid =
    emailOtpMatched && user.verificationOtpExpires && now <= user.verificationOtpExpires;
  const isPhoneOtpValid =
    phoneOtpMatched && user.phoneOtpExpires && now <= user.phoneOtpExpires;

  if (!isEmailOtpValid && !isPhoneOtpValid) {
    throw new ApiError(400, 'Verification code has expired. Please request a new code.');
  }

  user.isEmailVerified = true;
  if (user.phone) user.isPhoneVerified = true;
  user.verificationOtp = undefined;
  user.verificationOtpExpires = undefined;
  user.phoneOtp = undefined;
  user.phoneOtpExpires = undefined;
  user.otpFailedAttempts = 0;
  user.otpLockedUntil = undefined;
  await user.save({ validateBeforeSave: false });

  // Generate tokens NOW upon successful verification
  const { accessToken, refreshToken } = await generateTokens(user._id);
  res.cookie('crave_refreshToken', refreshToken, getCookieOptions(req, true));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isEmailVerified: true,
        isPhoneVerified: Boolean(user.isPhoneVerified),
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          isEmailVerified: true,
          isPhoneVerified: Boolean(user.isPhoneVerified),
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

  const user = await findUserByIdentifier({ email, phone });
  if (!user) {
    throw new ApiError(404, 'User account not found');
  }

  if (user.isEmailVerified && user.isPhoneVerified) {
    return res.status(200).json(new ApiResponse(200, {}, 'Account is already verified.'));
  }

  const newOtp = generateOTP();
  user.verificationOtp = newOtp;
  user.verificationOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
  user.otpFailedAttempts = 0;
  user.otpLockedUntil = undefined;
  if (user.phone) {
    user.phoneOtp = newOtp;
    user.phoneOtpExpires = user.verificationOtpExpires;
  }
  await user.save({ validateBeforeSave: false });

  logAuthOtp('Resent Verification OTP', user.email || maskPhoneNumber(user.phone), newOtp);

  const [emailRes, smsRes] = await Promise.all([
    user.email && !user.email.endsWith('@cravecourier.app')
      ? sendVerificationOtpEmail({
          toEmail: user.email,
          toName: user.name,
          otp: newOtp,
          expiryMinutes: 15,
        }).catch((err) => {
          console.error('[AUTH] Failed to resend verification email:', err);
          return { success: false };
        })
      : Promise.resolve({ success: false }),
    user.phone
      ? sendSmsOtp({
          phone: user.phone,
          otp: newOtp,
          purpose: 'Account Verification',
        }).catch((err) => {
          console.error('[AUTH] Failed to resend SMS OTP:', err);
          return { success: false };
        })
      : Promise.resolve({ success: false }),
  ]);

  const hasRealEmail = Boolean(user.email && !user.email.endsWith('@cravecourier.app'));
  if (hasRealEmail && !emailRes?.success && !smsRes?.success) {
    throw new ApiError(
      502,
      emailRes?.error || 'Unable to deliver verification email right now. Please check email settings or try again.'
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        emailSent: Boolean(emailRes?.success),
        smsSent: Boolean(smsRes?.success),
      },
      emailRes?.success
        ? 'A fresh 6-digit verification code has been dispatched to your email.'
        : 'A fresh 6-digit verification code has been dispatched to your registered mobile number.'
    )
  );
});

/**
 * @desc   Request password reset OTP (Dispatched via BOTH Email & SMS)
 * @route  POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email, phone, identifier } = req.body;

  const user = await findUserByIdentifier({ email, phone, identifier });
  if (!user || !user.isActive) {
    // For security, do not disclose whether user exists
    return res.status(200).json(
      new ApiResponse(
        200,
        {},
        'If an account exists with those details, a 6-digit password reset code has been sent to your registered email and mobile SMS.'
      )
    );
  }

  const resetOtp = generateOTP();
  user.resetPasswordOtp = resetOtp;
  user.resetPasswordOtpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  user.otpFailedAttempts = 0;
  user.otpLockedUntil = undefined;
  await user.save({ validateBeforeSave: false });

  logAuthOtp('Password Reset OTP', user.email || maskPhoneNumber(user.phone), resetOtp);

  const hasRealEmail = Boolean(user.email && !user.email.endsWith('@cravecourier.app'));

  const [emailDispatch, smsDispatch] = await Promise.all([
    hasRealEmail
      ? sendPasswordResetOtpEmail({
          toEmail: user.email,
          toName: user.name,
          otp: resetOtp,
          expiryMinutes: 15,
        }).catch((err) => {
          console.error(`[AUTH] Failed to send password reset email to ${user.email}:`, err);
          return { success: false, error: err.message };
        })
      : Promise.resolve({ success: false }),
    user.phone
      ? sendSmsOtp({
          phone: user.phone,
          otp: resetOtp,
          purpose: 'Password Reset',
        }).catch((err) => {
          console.error(`[AUTH] Failed to send password reset SMS to ${maskPhoneNumber(user.phone)}:`, err);
          return { success: false, error: err.message };
        })
      : Promise.resolve({ success: false }),
  ]);

  if (hasRealEmail && !emailDispatch?.success) {
    console.error(`[AUTH] Failed to send password reset email to ${user.email}:`, emailDispatch?.error);
  }
  if (user.phone && !smsDispatch?.success) {
    console.warn(`[AUTH] Password reset SMS not delivered to ${maskPhoneNumber(user.phone)}:`, smsDispatch?.error);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        emailSent: Boolean(emailDispatch?.success),
        smsSent: Boolean(smsDispatch?.success),
      },
      'If an account exists with those details, a 6-digit password reset code has been sent to your registered email and mobile SMS.'
    )
  );
});

/**
 * @desc   Reset password using OTP (received via Email or SMS)
 * @route  POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, phone, identifier, otp, newPassword } = req.body;

  const user = await findUserByIdentifier(
    { email, phone, identifier },
    '+resetPasswordOtp +resetPasswordOtpExpires +otpFailedAttempts +otpLockedUntil'
  );
  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset code. Please request a new code.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account is deactivated. Please contact support.');
  }

  assertNotOtpLocked(user);

  if (!isOtpMatch(user.resetPasswordOtp, otp)) {
    await recordOtpFailure(user, {
      resetPasswordOtp: 1,
      resetPasswordOtpExpires: 1,
    });
    throw new ApiError(400, 'Invalid reset code. Please check and try again.');
  }

  if (!user.resetPasswordOtpExpires || new Date() > user.resetPasswordOtpExpires) {
    throw new ApiError(400, 'Reset code has expired. Please request a new code.');
  }

  // Update password (triggers bcrypt hashing pre-save hook)
  user.password = newPassword;
  user.passwordChangedAt = new Date();
  user.resetPasswordOtp = undefined;
  user.resetPasswordOtpExpires = undefined;
  user.otpFailedAttempts = 0;
  user.otpLockedUntil = undefined;
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
 * @desc   Fast 1-Tap Mobile OTP Login - Send SMS
 * @route  POST /api/auth/mobile/send-otp
 */
export const sendMobileOtp = asyncHandler(async (req, res) => {
  const { phone, role = 'customer' } = req.body;
  const cleanPhone = formatPhoneNumber(phone);
  const variants = getPhoneLookupVariants(phone);

  if (!cleanPhone || variants.length === 0) {
    throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
  }

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  // Find existing user or create/update candidate using safe exact variants
  let user = await User.findOne({ phone: { $in: variants } });
  if (user) {
    if (!user.isActive) {
      throw new ApiError(403, 'Your account is deactivated. Please contact support.');
    }
    user.phone = cleanPhone;
    user.phoneOtp = otp;
    user.phoneOtpExpires = otpExpires;
    user.otpFailedAttempts = 0;
    user.otpLockedUntil = undefined;
    await user.save({ validateBeforeSave: false });
  } else {
    const rawDigits = cleanPhone.replace(/\D/g, '').slice(-10);
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

  const smsRes = await sendSmsOtp({
    phone: cleanPhone,
    otp,
    purpose: 'Mobile Login',
  });

  if (!smsRes?.success && ENV.NODE_ENV !== 'test') {
    throw new ApiError(
      503,
      smsRes?.configured
        ? 'Failed to deliver SMS OTP right now. Please try again in a moment.'
        : 'Mobile SMS OTP gateway is not configured on the server yet. Please configure TWOFACTOR_API_KEY or FAST2SMS_API_KEY.'
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        phone: maskPhoneNumber(cleanPhone),
        smsSent: Boolean(smsRes?.success),
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
  const { phone, otp, name } = req.body;
  const variants = getPhoneLookupVariants(phone);

  if (variants.length === 0) {
    throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
  }

  const user = await User.findOne({ phone: { $in: variants } })
    .select('+phoneOtp +phoneOtpExpires +otpFailedAttempts +otpLockedUntil');

  if (!user) {
    throw new ApiError(404, 'No account found for this mobile number. Please request a new OTP.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account is deactivated. Please contact support.');
  }

  assertNotOtpLocked(user);

  if (!isOtpMatch(user.phoneOtp, otp)) {
    await recordOtpFailure(user, { phoneOtp: 1, phoneOtpExpires: 1 });
    throw new ApiError(400, 'Invalid OTP code. Please enter the 6-digit code received via SMS.');
  }

  if (!user.phoneOtpExpires || new Date() > user.phoneOtpExpires) {
    throw new ApiError(400, 'OTP code has expired. Please request a new OTP.');
  }

  // Mark phone as verified and clear temporary OTP
  user.isPhoneVerified = true;
  user.phoneOtp = undefined;
  user.phoneOtpExpires = undefined;
  user.otpFailedAttempts = 0;
  user.otpLockedUntil = undefined;
  if (name && name.trim()) {
    user.name = name.trim();
  }
  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } = await generateTokens(user._id);
  res.cookie('crave_refreshToken', refreshToken, getCookieOptions(req, true));

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
  user.otpFailedAttempts = 0;
  user.otpLockedUntil = undefined;
  await user.save({ validateBeforeSave: false });

  logAuthOtp('Email Login OTP', user.email, otp);

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

  const user = await User.findOne({ email })
    .select('+loginOtp +loginOtpExpires +otpFailedAttempts +otpLockedUntil');
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

  assertNotOtpLocked(user);

  if (!isOtpMatch(user.loginOtp, otp)) {
    await recordOtpFailure(user, { loginOtp: 1, loginOtpExpires: 1 });
    throw new ApiError(400, 'Invalid 6-digit email OTP code. Please check your inbox and try again.');
  }

  if (!user.loginOtpExpires || new Date() > user.loginOtpExpires) {
    throw new ApiError(400, 'Email OTP code has expired. Please request a new code.');
  }

  // Email ownership verified; clear temporary login OTP
  user.isEmailVerified = true;
  user.loginOtp = undefined;
  user.loginOtpExpires = undefined;
  user.otpFailedAttempts = 0;
  user.otpLockedUntil = undefined;
  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } = await generateTokens(user._id);
  res.cookie('crave_refreshToken', refreshToken, getCookieOptions(req, true));

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
          avatar: user.avatar,
        },
        accessToken,
      },
      'Logged in successfully via Email OTP'
    )
  );
});
