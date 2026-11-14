import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'usd',
      lowercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ['stripe', 'razorpay', 'cod'],
      required: true,
    },
    paymentGateway: {
      type: String,
      enum: ['stripe', 'razorpay', 'cod'],
      required: true,
    },
    transactionId: {
      type: String,
      index: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['initiated', 'processing', 'succeeded', 'failed', 'refunded'],
      default: 'initiated',
      index: true,
    },
    refundId: {
      type: String,
      default: null,
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ order: 1, status: 1 });
paymentSchema.index({ user: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
