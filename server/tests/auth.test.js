import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.model.js';
import { isOriginAllowed } from '../src/config/env.js';
import { formatPhoneNumber, getPhoneLookupVariants, sendSmsOtp } from '../src/services/sms.service.js';

describe('Auth API Hardening & Access Control', () => {
  const testUser = {
    name: 'Security Test Customer',
    email: `sec_test_${Date.now()}@example.com`,
    password: 'Password123!',
    phone: '9876543210',
    role: 'customer',
  };

  let accessToken = '';

  beforeAll(async () => {
    await User.deleteMany({ email: { $regex: /sec_test_/ } });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /sec_test_/ } });
  });

  test('POST /api/auth/register - Successfully registers user and requires OTP verification', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.requiresVerification).toBe(true);
    expect(res.body.data.user.isEmailVerified).toBe(false);

    // Verify OTP was stored on user in database
    const dbUser = await User.findOne({ email: testUser.email }).select('+verificationOtp');
    expect(dbUser).toBeDefined();
    expect(dbUser.verificationOtp).toBeDefined();
    expect(dbUser.verificationOtp.length).toBe(6);
  });

  test('POST /api/auth/login - Blocks unverified user from logging in with 403', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(403);
    expect(res.body.isEmailVerified).toBe(false);
    expect(res.body.message).toMatch(/verification/i);
  });

  test('POST /api/auth/register - Re-registering an unverified account succeeds with fresh OTP instead of 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        ...testUser,
        name: 'Updated Name',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requiresVerification).toBe(true);
    expect(res.body.data.debugOtp).toBeUndefined();

    const dbUser = await User.findOne({ email: testUser.email }).select('+verificationOtp');
    expect(dbUser.verificationOtp).toBeDefined();
    expect(dbUser.verificationOtp.length).toBe(6);
  });

  test('POST /api/auth/verify-email - Verifies email with OTP and issues tokens & secure cookie', async () => {
    const dbUser = await User.findOne({ email: testUser.email }).select('+verificationOtp');
    expect(dbUser.verificationOtp).toBeDefined();

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({
        email: testUser.email,
        otp: dbUser.verificationOtp,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.isEmailVerified).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();

    // Verify secure HTTP-only refresh cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const hasRefreshCookie = cookies.some((c) => c.includes('crave_refreshToken') && c.includes('HttpOnly'));
    expect(hasRefreshCookie).toBe(true);

    accessToken = res.body.data.accessToken;
  });

  test('POST /api/auth/register - Rejects duplicate email registration with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/register - Rejects invalid email formatting with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid User',
        email: 'not-an-email',
        password: 'Password123!',
        phone: '1234567890',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login - Successfully logs in verified user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  test('POST /api/auth/login - Rejects incorrect password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword999!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/admin-login - Blocks customer from admin login with 403', async () => {
    const res = await request(app)
      .post('/api/auth/admin-login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me - Authorizes request with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  test('GET /api/auth/me - Rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/forgot-password & reset-password - Works via email and via mobile phone', async () => {
    // 1. Request reset via email
    const forgotEmailRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });
    expect(forgotEmailRes.status).toBe(200);

    let dbUser = await User.findOne({ email: testUser.email }).select('+resetPasswordOtp');
    expect(dbUser.resetPasswordOtp).toBeDefined();
    expect(dbUser.resetPasswordOtp.length).toBe(6);

    // 2. Request reset via phone number (10-digit)
    const forgotPhoneRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ phone: testUser.phone });
    expect(forgotPhoneRes.status).toBe(200);

    dbUser = await User.findOne({ email: testUser.email }).select('+resetPasswordOtp');
    const otpFromPhone = dbUser.resetPasswordOtp;
    expect(otpFromPhone).toBeDefined();

    // 3. Reset password using phone identifier + OTP
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        phone: testUser.phone,
        otp: otpFromPhone,
        newPassword: 'NewPassword456!',
      });
    expect(resetRes.status).toBe(200);

    // 4. Verify login works with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'NewPassword456!',
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeDefined();
  });

  test('SECURITY: OTP brute-force lockout clears OTP after 5 failed attempts', async () => {
    await request(app).post('/api/auth/forgot-password').send({ email: testUser.email });

    for (let i = 0; i < 5; i++) {
      const failRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: testUser.email,
          otp: '000000',
          newPassword: 'HackedPassword1!',
        });
      expect(failRes.status).toBe(400);
    }

    const lockedRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: testUser.email,
        otp: '111111',
        newPassword: 'HackedPassword1!',
      });
    expect(lockedRes.status).toBe(429);
  });

  test('SECURITY: Short phone input in verify-email is rejected instead of matching via regex', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ phone: '1', otp: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('SECURITY: CORS whitelist allows cravecourier.in and blocks spoofed origins', () => {
    expect(isOriginAllowed('https://cravecourier.in')).toBe(true);
    expect(isOriginAllowed('https://www.cravecourier.in')).toBe(true);
    expect(isOriginAllowed('https://evil-cravecourier.com')).toBe(false);
    expect(isOriginAllowed('https://cravecourier.in.attacker.com')).toBe(false);
    expect(isOriginAllowed('https://phishing.vercel.app')).toBe(false);
  });

  test('SMS Service: formats phone numbers and reports unconfigured gateway honestly', async () => {
    expect(formatPhoneNumber('9876543210')).toBe('+919876543210');
    expect(formatPhoneNumber('09876543210')).toBe('+919876543210');
    expect(getPhoneLookupVariants('9876543210')).toContain('+919876543210');

    const prev2F = process.env.TWOFACTOR_API_KEY;
    const prevFast = process.env.FAST2SMS_API_KEY;
    delete process.env.TWOFACTOR_API_KEY;
    delete process.env.FAST2SMS_API_KEY;

    const result = await sendSmsOtp({ phone: '9876543210', otp: '123456', purpose: 'Test' });
    expect(result.phone).toBe('+919876543210');
    if (!result.configured) {
      expect(result.success).toBe(false);
    }

    if (prev2F !== undefined) process.env.TWOFACTOR_API_KEY = prev2F;
    if (prevFast !== undefined) process.env.FAST2SMS_API_KEY = prevFast;
  });
});
