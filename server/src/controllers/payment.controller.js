import { stripe, isStripeConfigured } from '../config/stripe.js';
import { ENV } from '../config/env.js';
import { Cart } from '../models/Cart.model.js';
import { Order } from '../models/Order.model.js';
import { Payment } from '../models/Payment.model.js';
import { Product } from '../models/Product.model.js';
import { User } from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pushOrderStatusNotification } from '../services/notification.service.js';

// Store Hub Coordinates [Longitude, Latitude] (Chirgaon, Jhansi, UP)
const STORE_HUB_COORDINATES = [78.8228, 25.5746];

// Haversine distance in KM
const calculateHaversineDistanceKm = (coord1, coord2) => {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// Helper: Calculate delivery fee based on customer address (1km Free, >1km +₹20)
const computeDeliveryFee = (address) => {
  if (address?.coordinates?.coordinates && Array.isArray(address.coordinates.coordinates)) {
    const [lng, lat] = address.coordinates.coordinates;
    if (lng !== 0 || lat !== 0) {
      const dist = calculateHaversineDistanceKm(STORE_HUB_COORDINATES, [lng, lat]);
      return dist <= 1.0 ? 0 : 20;
    }
  }
  return 20; // Default flat delivery charge
};

// Helper: Generate a human-friendly unique order number (e.g. CRV-849201-412)
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `CRV-${timestamp}-${randomSuffix}`;
};

// Helper: Snapshot cart items into order snapshot format
const buildOrderItemsSnapshot = async (cartItems) => {
  const snapshots = [];
  for (const item of cartItems) {
    const product = await Product.findById(item.product);
    if (!product) continue;

    const basePrice =
      product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price;

    const unitPrice =
      item.selectedVariant?.sellingPrice && item.selectedVariant.sellingPrice > 0
        ? item.selectedVariant.sellingPrice
        : basePrice;

    const unitLabel = item.selectedVariant?.size || product.unit;
    const displayName = item.selectedVariant?.size
      ? `${product.name} (${item.selectedVariant.size})`
      : product.name;

    snapshots.push({
      product: product._id,
      name: displayName,
      price: unitPrice,
      quantity: item.quantity,
      unit: unitLabel,
      image: product.images?.[0] || '',
      subtotal: Math.round(unitPrice * item.quantity * 100) / 100,
    });
  }
  return snapshots;
};

// Helper: Decrement inventory stock for an order
const decrementInventory = async (items) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }
};

// Helper: Restore inventory stock for a refunded / cancelled order
const restoreInventory = async (items) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
  }
};

/**
 * @desc    Create Stripe PaymentIntent (Server-side price calculation only)
 * @route   POST /api/payments/create-intent
 * @access  Private (Customer)
 */
export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { addressId, deliverySlot, note } = req.body;

  // 1. Fetch user's cart and recalculate totals with live database prices & stock
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Your cart is empty. Add items before checking out.');
  }

  await cart.recalculateTotals();
  await cart.save();

  if (cart.items.length === 0) {
    throw new ApiError(400, 'All items in your cart are currently out of stock.');
  }

  // 2. Validate selected address
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(addressId) || user.addresses.find((a) => a.isDefault) || user.addresses[0];
  if (!address) {
    throw new ApiError(400, 'Please select or provide a valid delivery address.');
  }

  // Apply distance-based delivery fee (Free <=1km, ₹20 >1km, 0 tax)
  const deliveryFee = computeDeliveryFee(address);
  cart.totals.deliveryFee = deliveryFee;
  cart.totals.tax = 0;
  cart.totals.grandTotal = Math.max(0, Math.round((cart.totals.itemTotal + deliveryFee - (cart.totals.couponDiscount || 0)) * 100) / 100);
  await cart.save();

  // Grand total in cents for Stripe (smallest currency unit)
  const amountInCents = Math.round(cart.totals.grandTotal * 100);

  if (amountInCents <= 0) {
    throw new ApiError(400, 'Invalid order total.');
  }

  // 3. Create Stripe PaymentIntent if real Stripe is configured
  if (isStripeConfigured()) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: ENV.STRIPE_CURRENCY,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId: req.user._id.toString(),
          addressId: address._id.toString(),
          deliverySlot: deliverySlot || 'Standard Delivery (30-45 mins)',
          note: note || '',
          couponId: cart.couponApplied ? cart.couponApplied.toString() : '',
          itemCount: cart.items.length.toString(),
        },
      });

      return res.status(200).json(
        new ApiResponse(200, {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: cart.totals.grandTotal,
          currency: ENV.STRIPE_CURRENCY,
          totals: cart.totals,
          isMock: false,
        }, 'Stripe PaymentIntent created successfully')
      );
    } catch (stripeErr) {
      console.error('[STRIPE ERROR] PaymentIntent creation failed:', stripeErr);
      throw new ApiError(500, `Stripe Error: ${stripeErr.message}`);
    }
  }

  // 4. Mock / Sandbox fallback when developer has not yet inserted live sk_test keys
  const mockIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const mockClientSecret = `${mockIntentId}_secret_${Math.random().toString(36).substring(2, 10)}`;

  return res.status(200).json(
    new ApiResponse(200, {
      clientSecret: mockClientSecret,
      paymentIntentId: mockIntentId,
      amount: cart.totals.grandTotal,
      currency: ENV.STRIPE_CURRENCY,
      totals: cart.totals,
      isMock: true,
      hint: 'Running in sandbox mode with placeholder Stripe keys. Set STRIPE_SECRET_KEY in server/.env for live Stripe processing.',
    }, 'Sandbox Payment Intent prepared')
  );
});

/**
 * @desc    Confirm Stripe Payment and Generate Order
 * @route   POST /api/payments/confirm
 * @access  Private (Customer)
 */
export const confirmStripePayment = asyncHandler(async (req, res) => {
  const { paymentIntentId, addressId, deliverySlot, note } = req.body;

  if (!paymentIntentId) {
    throw new ApiError(400, 'paymentIntentId is required to confirm payment');
  }

  // Idempotency check: see if order has already been created for this paymentIntentId
  const existingOrder = await Order.findOne({ paymentId: paymentIntentId });
  if (existingOrder) {
    return res.status(200).json(
      new ApiResponse(200, {
        order: existingOrder,
        orderId: existingOrder._id,
        alreadyProcessed: true,
      }, 'Order already confirmed')
    );
  }

  // 1. Verify with Stripe if configured
  if (isStripeConfigured() && !paymentIntentId.startsWith('pi_mock_')) {
    try {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== 'succeeded') {
        throw new ApiError(400, `Payment verification failed. Current status: ${intent.status}`);
      }
    } catch (err) {
      throw new ApiError(400, `Stripe verification failed: ${err.message}`);
    }
  }

  // 2. Fetch User & Delivery Address
  const user = await User.findById(req.user._id);
  const address =
    user.addresses.id(addressId) ||
    user.addresses.find((a) => a.isDefault) ||
    user.addresses[0];

  if (!address) {
    throw new ApiError(400, 'Valid delivery address not found');
  }

  // 3. Fetch cart and recalculate totals
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Cannot create order: Cart is empty');
  }

  await cart.recalculateTotals();

  // Apply distance-based delivery fee (Free <=1km, ₹20 >1km, 0 tax)
  const deliveryFee = computeDeliveryFee(address);
  cart.totals.deliveryFee = deliveryFee;
  cart.totals.tax = 0;
  cart.totals.grandTotal = Math.max(0, Math.round((cart.totals.itemTotal + deliveryFee - (cart.totals.couponDiscount || 0)) * 100) / 100);

  // 4. Create snapshot items
  const snapshotItems = await buildOrderItemsSnapshot(cart.items);
  if (snapshotItems.length === 0) {
    throw new ApiError(400, 'No active items available in cart');
  }

  // 5. Create Order record
  const orderNumber = generateOrderNumber();
  const order = await Order.create({
    orderNumber,
    customer: req.user._id,
    items: snapshotItems,
    deliveryAddress: {
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark || '',
      phone: address.phone || user.phone,
      coordinates: address.coordinates || { type: 'Point', coordinates: [78.8228, 25.5746] },
    },
    status: 'confirmed',
    statusTimeline: [
      { status: 'placed', timestamp: new Date(), note: 'Order placed & payment authorized' },
      { status: 'confirmed', timestamp: new Date(), note: 'Payment verified via Stripe' },
    ],
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    paymentId: paymentIntentId,
    totals: { ...cart.totals },
    coupon: cart.couponApplied ? { code: 'PROMO_APPLIED', discountValue: cart.totals.couponDiscount } : null,
    estimatedDeliveryTime: new Date(Date.now() + 35 * 60 * 1000), // ~35 minutes
  });

  // 6. Record Payment entry
  await Payment.create({
    order: order._id,
    user: req.user._id,
    amount: cart.totals.grandTotal,
    currency: ENV.STRIPE_CURRENCY,
    paymentMethod: 'stripe',
    paymentGateway: 'stripe',
    transactionId: paymentIntentId,
    status: 'succeeded',
    rawResponse: { confirmedVia: 'api/payments/confirm', paymentIntentId },
  });

  // 7. Decrement product inventory
  await decrementInventory(cart.items);

  // 8. Clear user cart
  cart.items = [];
  cart.couponApplied = null;
  await cart.recalculateTotals();
  await cart.save();

  // 9. Push confirmation notification
  await pushOrderStatusNotification(order, 'confirmed');

  return res.status(201).json(
    new ApiResponse(201, {
      order,
      orderId: order._id,
      orderNumber: order.orderNumber,
    }, 'Payment confirmed and order placed successfully')
  );
});

/**
 * @desc    Place Cash on Delivery (COD) Order
 * @route   POST /api/payments/create-cod-order
 * @access  Private (Customer)
 */
export const createCodOrder = asyncHandler(async (req, res) => {
  const { addressId, deliverySlot, note } = req.body;

  // 1. Fetch user's cart and recalculate totals
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Your cart is empty');
  }

  await cart.recalculateTotals();

  // 2. Fetch User & Delivery Address
  const user = await User.findById(req.user._id);
  const address =
    user.addresses.id(addressId) ||
    user.addresses.find((a) => a.isDefault) ||
    user.addresses[0];

  if (!address) {
    throw new ApiError(400, 'Please select or add a valid delivery address');
  }

  // Apply distance-based delivery fee (Free <=1km, ₹20 >1km, 0 tax)
  const deliveryFee = computeDeliveryFee(address);
  cart.totals.deliveryFee = deliveryFee;
  cart.totals.tax = 0;
  cart.totals.grandTotal = Math.max(0, Math.round((cart.totals.itemTotal + deliveryFee - (cart.totals.couponDiscount || 0)) * 100) / 100);

  // 3. Build snapshot of items
  const snapshotItems = await buildOrderItemsSnapshot(cart.items);
  if (snapshotItems.length === 0) {
    throw new ApiError(400, 'No active items available in cart');
  }

  // 4. Create Order with COD status
  const orderNumber = generateOrderNumber();
  const order = await Order.create({
    orderNumber,
    customer: req.user._id,
    items: snapshotItems,
    deliveryAddress: {
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark || '',
      phone: address.phone || user.phone,
      coordinates: address.coordinates || { type: 'Point', coordinates: [78.8228, 25.5746] },
    },
    status: 'placed',
    statusTimeline: [
      { status: 'placed', timestamp: new Date(), note: `COD Order placed (${deliverySlot || 'Standard Delivery'})` },
    ],
    paymentStatus: 'pending', // Cash will be collected by rider upon delivery
    paymentMethod: 'cod',
    paymentId: `COD-${orderNumber}`,
    totals: { ...cart.totals },
    coupon: cart.couponApplied ? { code: 'PROMO_APPLIED', discountValue: cart.totals.couponDiscount } : null,
    estimatedDeliveryTime: new Date(Date.now() + 40 * 60 * 1000), // ~40 minutes
  });

  // 5. Record Payment entry for COD
  await Payment.create({
    order: order._id,
    user: req.user._id,
    amount: cart.totals.grandTotal,
    currency: ENV.STRIPE_CURRENCY,
    paymentMethod: 'cod',
    paymentGateway: 'cod',
    transactionId: `COD-${orderNumber}`,
    status: 'initiated',
    rawResponse: { note: note || 'Cash on Delivery - payment pending handoff' },
  });

  // 6. Decrement inventory
  await decrementInventory(cart.items);

  // 7. Clear user cart
  cart.items = [];
  cart.couponApplied = null;
  await cart.recalculateTotals();
  await cart.save();

  // 8. Push order placed notification
  await pushOrderStatusNotification(order, 'placed');

  return res.status(201).json(
    new ApiResponse(201, {
      order,
      orderId: order._id,
      orderNumber: order.orderNumber,
    }, 'Cash on Delivery order placed successfully')
  );
});

/**
 * @desc    Stripe Signed Webhook Listener
 * @route   POST /api/payments/webhook
 * @access  Public (Verified by Stripe-Signature HMAC)
 */
export const handleStripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, ENV.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`[STRIPE WEBHOOK ERROR] Signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle Stripe Webhook Events
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log(`[STRIPE WEBHOOK] PaymentIntent succeeded: ${paymentIntent.id}`);

      // Check if order already created
      let order = await Order.findOne({ paymentId: paymentIntent.id });

      if (order) {
        order.paymentStatus = 'paid';
        if (order.status === 'placed') {
          order.status = 'confirmed';
          order.statusTimeline.push({
            status: 'confirmed',
            timestamp: new Date(),
            note: 'Confirmed via Stripe Webhook',
          });
        }
        await order.save();
      } else {
        // Create order directly from webhook metadata if client disconnected early
        const { userId, addressId, couponId } = paymentIntent.metadata || {};
        if (userId) {
          const user = await User.findById(userId);
          const address = user?.addresses?.id(addressId) || user?.addresses?.[0];
          const cart = await Cart.findOne({ user: userId });

          if (cart && cart.items.length > 0 && address) {
            await cart.recalculateTotals();
            const snapshotItems = await buildOrderItemsSnapshot(cart.items);
            const orderNumber = generateOrderNumber();

            order = await Order.create({
              orderNumber,
              customer: userId,
              items: snapshotItems,
              deliveryAddress: {
                street: address.street,
                city: address.city,
                state: address.state,
                pincode: address.pincode,
                landmark: address.landmark || '',
                phone: address.phone || user.phone,
                coordinates: address.coordinates || { type: 'Point', coordinates: [-89.6504, 39.7817] },
              },
              status: 'confirmed',
              statusTimeline: [
                { status: 'placed', timestamp: new Date(), note: 'Payment processed' },
                { status: 'confirmed', timestamp: new Date(), note: 'Confirmed via Stripe Webhook' },
              ],
              paymentStatus: 'paid',
              paymentMethod: 'stripe',
              paymentId: paymentIntent.id,
              totals: { ...cart.totals },
              coupon: couponId ? { code: 'PROMO_APPLIED', discountValue: cart.totals.couponDiscount } : null,
              estimatedDeliveryTime: new Date(Date.now() + 35 * 60 * 1000),
            });

            await Payment.create({
              order: order._id,
              user: userId,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              paymentMethod: 'stripe',
              paymentGateway: 'stripe',
              transactionId: paymentIntent.id,
              status: 'succeeded',
              rawResponse: paymentIntent,
            });

            await decrementInventory(cart.items);
            cart.items = [];
            cart.couponApplied = null;
            await cart.recalculateTotals();
            await cart.save();
          }
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.warn(`[STRIPE WEBHOOK] PaymentIntent failed: ${paymentIntent.id}`, paymentIntent.last_payment_error?.message);

      await Payment.findOneAndUpdate(
        { transactionId: paymentIntent.id },
        {
          status: 'failed',
          rawResponse: paymentIntent.last_payment_error || {},
        },
        { upsert: false }
      );
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object;
      console.log(`[STRIPE WEBHOOK] Charge refunded: ${charge.id} for intent: ${charge.payment_intent}`);

      const refundId = charge.refunds?.data?.[0]?.id || null;

      await Payment.findOneAndUpdate(
        { transactionId: charge.payment_intent },
        { status: 'refunded', refundId }
      );

      const order = await Order.findOne({ paymentId: charge.payment_intent });
      if (order && order.paymentStatus !== 'refunded') {
        order.paymentStatus = 'refunded';
        order.status = 'cancelled';
        order.statusTimeline.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: `Webhook verified refund: ${refundId || charge.id}`,
        });
        await order.save();
        await restoreInventory(order.items);
      }
      break;
    }

    default:
      console.log(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
});

/**
 * @desc    Admin-triggered Order Refund
 * @route   POST /api/payments/refund/:orderId
 * @access  Private (Admin only)
 */
export const refundOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason = 'Refund requested by administrator' } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.paymentStatus === 'refunded') {
    throw new ApiError(400, 'Order has already been refunded');
  }

  let refundRecord = null;

  // If paid via Stripe, invoke Stripe Refund API
  if (order.paymentMethod === 'stripe' && order.paymentId) {
    if (isStripeConfigured() && !order.paymentId.startsWith('pi_mock_')) {
      try {
        refundRecord = await stripe.refunds.create({
          payment_intent: order.paymentId,
          reason: 'requested_by_customer',
        });
      } catch (stripeErr) {
        throw new ApiError(500, `Stripe Refund API error: ${stripeErr.message}`);
      }
    } else {
      // Mock refund response
      refundRecord = {
        id: `re_mock_${Date.now()}`,
        status: 'succeeded',
        amount: Math.round(order.totals.grandTotal * 100),
      };
    }
  }

  // Update order status
  order.paymentStatus = 'refunded';
  order.status = 'cancelled';
  order.cancellationReason = reason;
  order.statusTimeline.push({
    status: 'cancelled',
    timestamp: new Date(),
    note: `Refund completed: ${refundRecord?.id || 'Manual Admin Cancellation'} (${reason})`,
  });
  await order.save();

  // Update payment record
  await Payment.findOneAndUpdate(
    { order: order._id },
    {
      status: 'refunded',
      refundId: refundRecord?.id || `MANUAL-${Date.now()}`,
    }
  );

  // Restore inventory items
  await restoreInventory(order.items);

  // Push refund notification
  await pushOrderStatusNotification(order, 'refunded', reason);

  return res.status(200).json(
    new ApiResponse(200, {
      order,
      refund: refundRecord,
    }, 'Order refunded and inventory restored successfully')
  );
});

