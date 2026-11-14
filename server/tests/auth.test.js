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

  test('POST /api/auth/register - Successfully registers user with secure cookie and tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
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

  test('POST /api/auth/login - Successfully logs in registered user', async () => {
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

