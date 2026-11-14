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
];

if (process.env.CLIENT_URL) {
  defaultAllowedOrigins.push(process.env.CLIENT_URL);
}

const parsedAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : defaultAllowedOrigins;

// Unique allowed origins
const ALLOWED_ORIGINS = [...new Set(parsedAllowedOrigins)];

// Production Secrets Audit Check
if (nodeEnv === 'production') {
  const weakKeywords = ['replace_with_', 'crave_default_', 'placeholder', 'secret123', 'admin123'];
  const secretsToCheck = [
    { key: 'JWT_ACCESS_SECRET', val: process.env.JWT_ACCESS_SECRET },
    { key: 'JWT_REFRESH_SECRET', val: process.env.JWT_REFRESH_SECRET },
    { key: 'COOKIE_SECRET', val: process.env.COOKIE_SECRET },
  ];

  for (const { key, val } of secretsToCheck) {
    if (!val || val.length < 32 || weakKeywords.some((k) => val.includes(k))) {
      throw new Error(
        `[CRITICAL SECURITY AUDIT FAILED] ${key} is insecure for production. Must be at least 32 characters long and not contain default placeholder text.`
      );
    }
  }
}

export const ENV = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ALLOWED_ORIGINS,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crave_db',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'crave_default_access_secret_super_secure',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'crave_default_refresh_secret_super_secure',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'crave_default_cookie_secret',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_crave',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder_crave',
  STRIPE_CURRENCY: (process.env.STRIPE_CURRENCY || 'usd').toLowerCase(),
};
