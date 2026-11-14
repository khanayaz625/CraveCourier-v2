import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.model.js';

describe('Payments API Security & NoSQL Injection Protection', () => {
  let customerToken = '';
  let adminToken = '';

  beforeAll(async () => {
    const customer = await User.create({
      name: 'Payment Test Customer',
      email: `cust_pay_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'customer',
      isEmailVerified: true,
    });
    customerToken = customer.generateAccessToken();

    const admin = await User.create({
      name: 'Payment Test Admin',
      email: `admin_pay_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'admin',
      isEmailVerified: true,
    });
    adminToken = admin.generateAccessToken();
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /_pay_/ } });
  });

  test('POST /api/payments/create-intent - Rejects unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/payments/create-intent')
      .send({ orderId: '650000000000000000000000' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/payments/create-cod-order - Rejects invalid empty payload with 400', async () => {
    const res = await request(app)
      .post('/api/payments/create-cod-order')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({});

    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/payments/refund/:orderId - Blocks customer from issuing refunds with 403', async () => {
    const res = await request(app)
      .post('/api/payments/refund/650000000000000000000000')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'fraudulent' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('SECURITY: NoSQL injection in JSON body ($gt operator) is safely neutralized', async () => {
    // Attempting standard Mongo NoSQL injection
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: { $gt: '' },
        password: { $gt: '' },
      });

    // Should be rejected by validation or sanitization, never executing $gt as query operator
    expect([400, 401]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

