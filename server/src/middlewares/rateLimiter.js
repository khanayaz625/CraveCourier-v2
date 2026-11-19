import rateLimit from 'express-rate-limit';
import { ENV } from '../config/env.js';

const isProduction = ENV.NODE_ENV === 'production';

/**
 * Standard global API rate limiter
 * Allows general browsing and catalog queries
 */
export const globalRateLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS,
  max: isProduction ? ENV.RATE_LIMIT_MAX : 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
    errors: [],
  },
});

/**
 * Strict rate limiter for sensitive authentication endpoints
 * Protects login, registration, OTP verification, and password resets against brute-force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 60 : 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many authentication attempts. For your security, this IP has been temporarily throttled. Please try again in 15 minutes.',
    errors: [],
  },
});

/**
 * Strict rate limiter for checkout and payment operations
 * Prevents automated card testing and checkout flood attacks
 */
export const orderRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 60 : 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many order or payment operations from this IP. Please wait a few moments before trying again.',
    errors: [],
  },
});
