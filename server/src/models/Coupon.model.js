import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      minlength: [3, 'Coupon code must be at least 3 characters'],
      maxlength: [20, 'Coupon code cannot exceed 20 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: [1, 'Discount value must be at least 1'],
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: null, // Cap for percentage discount
    },
    expiryDate: {
      type: Date,
      required: [true, 'Coupon expiration date is required'],
      index: true,
    },
    usageLimit: {
      type: Number,
      default: 1000,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

couponSchema.methods.isValidForOrder = function (orderTotal) {
  if (!this.isActive) return { valid: false, reason: 'Coupon is inactive' };
  if (new Date() > this.expiryDate) return { valid: false, reason: 'Coupon has expired' };
  if (this.usedCount >= this.usageLimit) return { valid: false, reason: 'Coupon usage limit reached' };
  if (orderTotal < this.minOrderValue) {
    return {
      valid: false,
      reason: `Order minimum of $${this.minOrderValue} required for this coupon`,
    };
  }

  let calculatedDiscount = 0;
  if (this.discountType === 'percentage') {
    calculatedDiscount = (orderTotal * this.discountValue) / 100;
    if (this.maxDiscount && calculatedDiscount > this.maxDiscount) {
      calculatedDiscount = this.maxDiscount;
    }
  } else {
    calculatedDiscount = Math.min(this.discountValue, orderTotal);
  }

  return { valid: true, discount: Math.round(calculatedDiscount * 100) / 100 };
};

export const Coupon = mongoose.model('Coupon', couponSchema);
