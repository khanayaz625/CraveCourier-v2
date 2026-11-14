import mongoose from 'mongoose';
import { Product } from './Product.model.js';
import { Coupon } from './Coupon.model.js';

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    priceAtAddition: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    selectedVariant: {
      size: { type: String, default: '' },
      unit: { type: String, default: '' },
      mrp: { type: Number, default: 0 },
      sellingPrice: { type: Number, default: 0 },
      sku: { type: String, default: '' },
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: [cartItemSchema],
    couponApplied: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null,
    },
    totals: {
      itemTotal: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      deliveryFee: { type: Number, default: 0 },
      couponDiscount: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Method: Recalculate cart totals against real-time database prices & stock
cartSchema.methods.recalculateTotals = async function () {
  let itemTotal = 0;
  const verifiedItems = [];

  for (const item of this.items) {
    const productDoc = await Product.findById(item.product);
    if (productDoc && productDoc.isActive && productDoc.stock > 0) {
      // Use current live price or variant price
      let livePrice =
        productDoc.discountPrice && productDoc.discountPrice > 0
          ? productDoc.discountPrice
          : productDoc.price;

      if (item.selectedVariant && item.selectedVariant.size) {
        const foundVar = productDoc.variants?.find((v) => v.size === item.selectedVariant.size);
        if (foundVar) {
          livePrice = foundVar.sellingPrice;
          item.selectedVariant.sellingPrice = foundVar.sellingPrice;
          item.selectedVariant.mrp = foundVar.mrp;
        } else if (item.selectedVariant.sellingPrice > 0) {
          livePrice = item.selectedVariant.sellingPrice;
        }
      }

      const safeQuantity = Math.min(item.quantity, productDoc.stock);
      item.priceAtAddition = livePrice;
      item.quantity = safeQuantity;

      itemTotal += livePrice * safeQuantity;
      verifiedItems.push(item);
    }
  }

  this.items = verifiedItems;
  itemTotal = Math.round(itemTotal * 100) / 100;

  // Coupon Discount Calculation
  let couponDiscount = 0;
  if (this.couponApplied) {
    const couponDoc = await Coupon.findById(this.couponApplied);
    if (couponDoc) {
      const validation = couponDoc.isValidForOrder(itemTotal);
      if (validation.valid) {
        couponDiscount = validation.discount;
      } else {
        this.couponApplied = null; // Auto-invalidate if subtotal dropped below minOrderValue
      }
    } else {
      this.couponApplied = null;
    }
  }

  // Delivery Fee Calculation (Default ₹20, Free ₹0 if within 1km or empty)
  const deliveryFee = itemTotal === 0 ? 0 : 20;

  // Tax calculation (0% - No tax or extra charges)
  const tax = 0;

  // Grand Total
  const grandTotal = Math.max(0, Math.round((itemTotal + tax + deliveryFee - couponDiscount) * 100) / 100);

  this.totals = {
    itemTotal,
    tax,
    deliveryFee,
    couponDiscount,
    grandTotal,
  };

  return this.totals;
};

export const Cart = mongoose.model('Cart', cartSchema);
