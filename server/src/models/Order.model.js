import mongoose from 'mongoose';
import crypto from 'crypto';

const orderItemSnapshotSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true },
    image: { type: String },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const statusTimelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        'placed',
        'confirmed',
        'preparing',
        'ready',
        'picked_up',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refunded',
      ],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const orderAddressSchema = new mongoose.Schema(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String },
    phone: { type: String, required: true },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSnapshotSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    deliveryAddress: {
      type: orderAddressSchema,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'placed',
        'confirmed',
        'preparing',
        'ready',
        'picked_up',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refunded',
      ],
      default: 'placed',
      index: true,
    },
    statusTimeline: {
      type: [statusTimelineSchema],
      default: () => [{ status: 'placed', timestamp: new Date(), note: 'Order placed by customer' }],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['stripe', 'razorpay', 'cod'],
      default: 'stripe',
    },
    paymentId: {
      type: String,
      default: null,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    hasReviewed: {
      type: Boolean,
      default: false,
      index: true,
    },
    deliveryOtp: {
      type: String,
      default: () => crypto.randomInt(1000, 10000).toString(),
    },
    totals: {
      itemTotal: { type: Number, required: true, min: 0 },
      tax: { type: Number, required: true, min: 0, default: 0 },
      deliveryFee: { type: Number, required: true, min: 0, default: 0 },
      couponDiscount: { type: Number, default: 0, min: 0 },
      grandTotal: { type: Number, required: true, min: 0 },
    },
    coupon: {
      code: { type: String, default: null },
      discountValue: { type: Number, default: 0 },
    },
    estimatedDeliveryTime: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance query indexes
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ deliveryPartner: 1, status: 1 });

export const Order = mongoose.model('Order', orderSchema);
