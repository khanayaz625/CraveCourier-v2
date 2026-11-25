import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.model.js';

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
});
