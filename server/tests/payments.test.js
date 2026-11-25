import request from 'supertest';
import crypto from 'crypto';
import app from '../src/app.js';
import { User } from '../src/models/User.model.js';
import { Product } from '../src/models/Product.model.js';
import { Category } from '../src/models/Category.model.js';
import { Cart } from '../src/models/Cart.model.js';
import { Order } from '../src/models/Order.model.js';
import { Payment } from '../src/models/Payment.model.js';
import { ENV } from '../src/config/env.js';

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

  test('POST /api/payments/razorpay/verify - Verifies signature and creates Order & Payment without Mongoose schema error', async () => {
    const cat = await Category.create({
      name: `PayCat_${Date.now()}`,
      slug: `pay-cat-${Date.now()}`,
      image: 'https://example.com/cat.jpg',
      type: 'food',
    });
    const prod = await Product.create({
      name: 'Mayo-Cheesy Pizza Fries',
      slug: `mayo-fries-${Date.now()}`,
      category: cat._id,
      price: 80,
      unit: '1 Pack',
      stock: 20,
      type: 'food',
      images: ['https://example.com/fries.jpg'],
    });
    const buyer = await User.create({
      name: 'Razorpay Buyer',
      email: `rzp_pay_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'customer',
      isEmailVerified: true,
      addresses: [
        {
          label: 'Home',
          street: 'Thanapura',
          city: 'Chirgaon',
          state: 'Uttar Pradesh',
          pincode: '284301',
          coordinates: { type: 'Point', coordinates: [78.8235, 25.5752] },
          isDefault: true,
        },
      ],
    });
    const buyerToken = buyer.generateAccessToken();
    const addressId = buyer.addresses[0]._id.toString();

    await Cart.create({
      user: buyer._id,
      items: [{ product: prod._id, quantity: 1, priceAtAddition: 80 }],
    });

    const razorpay_order_id = `order_test_${Date.now()}`;
    const razorpay_payment_id = `pay_test_${Date.now()}`;
    const razorpay_signature = crypto
      .createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const res = await request(app)
      .post('/api/payments/razorpay/verify')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        addressId,
        deliverySlot: 'express',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderId).toBeDefined();

    const payment = await Payment.findOne({ transactionId: razorpay_payment_id });
    expect(payment).toBeDefined();
    expect(payment.status).toBe('succeeded');

    await Order.deleteMany({ customer: buyer._id });
    await Payment.deleteMany({ user: buyer._id });
    await Cart.deleteMany({ user: buyer._id });
    await Product.deleteById ? null : Product.deleteOne({ _id: prod._id });
    await Category.deleteOne({ _id: cat._id });
    await User.deleteOne({ _id: buyer._id });
  });
});

