import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env relative to server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnvVars = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`[WARNING] Missing environment variable: ${envVar}. Falling back to default or setup may fail.`);
  }
}

const nodeEnv = process.env.NODE_ENV || 'development';

// Parse allowed origins for CORS whitelist
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://client-six-kappa.vercel.app',
];

if (process.env.CLIENT_URL) {
  defaultAllowedOrigins.push(process.env.CLIENT_URL);
}

const parsedAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : defaultAllowedOrigins;

// Unique allowed origins
const ALLOWED_ORIGINS = [...new Set(parsedAllowedOrigins)];

import crypto from 'crypto';

// Production Secrets Validation & Auto-Generation
let jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
let jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
let cookieSecret = process.env.COOKIE_SECRET;

const weakKeywords = ['replace_with_', 'crave_default_', 'placeholder', 'secret123', 'admin123'];

if (!jwtAccessSecret || jwtAccessSecret.length < 32 || weakKeywords.some((k) => jwtAccessSecret.includes(k))) {
  jwtAccessSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[SECURITY] JWT_ACCESS_SECRET was missing or insecure; auto-generated secure runtime secret.');
}

if (!jwtRefreshSecret || jwtRefreshSecret.length < 32 || weakKeywords.some((k) => jwtRefreshSecret.includes(k))) {
  jwtRefreshSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[SECURITY] JWT_REFRESH_SECRET was missing or insecure; auto-generated secure runtime secret.');
}

if (!cookieSecret || cookieSecret.length < 32 || weakKeywords.some((k) => cookieSecret.includes(k))) {
  cookieSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[SECURITY] COOKIE_SECRET was missing or insecure; auto-generated secure runtime secret.');
}

export const ENV = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ALLOWED_ORIGINS,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crave_db',
  JWT_ACCESS_SECRET: jwtAccessSecret,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  COOKIE_SECRET: cookieSecret,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '600', 10),
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_crave',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder_crave',
  STRIPE_CURRENCY: (process.env.STRIPE_CURRENCY || 'inr').toLowerCase(),
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_U0kEbnHVgIfK1G',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'gAxJ8oYQzJH9ee2z74hGIuOZ',
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || '',
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'Crave Courier',
  TWOFACTOR_API_KEY: (process.env.TWOFACTOR_API_KEY || process.env['2FACTOR_API_KEY'] || '').trim(),
  TWOFACTOR_TEMPLATE_NAME: (process.env.TWOFACTOR_TEMPLATE_NAME || '').trim(),
  APK_LATEST_VERSION: (process.env.APK_LATEST_VERSION || '1.0.1').trim(),
  APK_VERSION_CODE: parseInt(process.env.APK_VERSION_CODE || '2', 10),
  APK_DOWNLOAD_URL: (
    process.env.APK_DOWNLOAD_URL ||
    'https://github.com/khanayaz625/CraveCourier-v2/releases/latest/download/CraveCourier.apk'
  ).trim(),
  APK_RELEASE_NOTES: (process.env.APK_RELEASE_NOTES || 'Bug fixes and performance improvements.').trim(),
  APK_FORCE_UPDATE: process.env.APK_FORCE_UPDATE === 'true',
};
