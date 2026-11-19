import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { ENV } from './config/env.js';
import {
  globalRateLimiter,
  authRateLimiter,
  orderRateLimiter,
} from './middlewares/rateLimiter.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import apiRouter from './routes/api.routes.js';

const app = express();

// Trust reverse proxy (Render, Vercel, Cloudflare) for accurate client IP rate limiting
app.set('trust proxy', 1);

// 1. Security HTTP headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Strict CORS Configuration & Origin Whitelist
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps / TWAs / curl / server-to-server)
    if (!origin) return callback(null, true);

    const isExplicitlyAllowed = ENV.ALLOWED_ORIGINS.some(allowed => 
      origin === allowed || origin.startsWith(allowed)
    );
    const isDevelopment = ENV.NODE_ENV === 'development';
    const isAllowedDomain =
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.netlify.app') ||
      origin.includes('cravecourier') ||
      origin.includes('crave-delivery') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1');

    if (isExplicitlyAllowed || isDevelopment || isAllowedDomain) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['set-cookie'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 3. HTTP Request Logger (masked in production)
app.use(morgan(ENV.NODE_ENV === 'development' ? 'dev' : 'combined'));

// 4. Request Body Parsers (with raw body retained for Stripe signature verification)
app.use(
  express.json({
    limit: '64kb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// 5. NoSQL Injection Sanitization (strips keys containing '$' or '.')
app.use(
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`[SECURITY] Stripped potential NoSQL injection key "${key}" from ${req.ip}`);
    },
  })
);

// 6. Cookie Parser for JWT Refresh Tokens and Sessions
app.use(cookieParser(ENV.COOKIE_SECRET));

// 7. Tiered Rate Limiting
app.use('/api', globalRateLimiter);
app.use('/api/auth', authRateLimiter);
app.use('/api/orders', orderRateLimiter);
app.use('/api/payments', orderRateLimiter);

// 8. Root Health & Identification Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'crave-backend' });
});

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Crave API Backend',
    version: '1.0.0',
    documentation: '/api/health',
    status: 'online',
    environment: ENV.NODE_ENV,
  });
});

// 9. Central API Router
app.use('/api', apiRouter);

// 10. 404 & Centralized Error Handlers
app.use(notFound);
app.use(errorHandler);

export default app;
