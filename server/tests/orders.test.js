import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.model.js';

describe('Orders API Role Checks & Authorization', () => {
  let customerToken = '';
  let adminToken = '';

  beforeAll(async () => {
    // 1. Create and authenticate a regular customer
    const customer = await User.create({
      name: 'Order Test Customer',
      email: `cust_order_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'customer',
      isEmailVerified: true,
    });
    customerToken = customer.generateAccessToken();

    // 2. Create and authenticate an admin
    const admin = await User.create({
      name: 'Order Test Admin',
      email: `admin_order_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'admin',
      isEmailVerified: true,
    });
    adminToken = admin.generateAccessToken();
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /_order_/ } });
  });

  test('GET /api/orders/my-orders - Rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/orders/my-orders');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/orders/my-orders - Returns customer orders list when authenticated', async () => {
    const res = await request(app)
      .get('/api/orders/my-orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.orders)).toBe(true);
  });

  test('GET /api/orders - Blocks regular customer from viewing all platform orders with 403', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/orders - Allows admin to view all platform orders with 200', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.orders)).toBe(true);
  });

  test('PATCH /api/orders/fake-id/status - Customer cannot mutate order status directly (403)', async () => {
    const res = await request(app)
      .patch('/api/orders/650000000000000000000000/status')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'Delivered' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

