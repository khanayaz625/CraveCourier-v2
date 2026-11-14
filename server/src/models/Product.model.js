import mongoose from 'mongoose';

const productVariantSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    mrp: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    stock: { type: Number, default: 50, min: 0 },
    sku: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      sparse: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [140, 'Product name cannot exceed 140 characters'],
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1500, 'Description cannot exceed 1500 characters'],
    },
    images: {
      type: [String],
      validate: {
        validator: (val) => Array.isArray(val) && val.length > 0,
        message: 'Product must have at least one image',
      },
    },
    imagePrompt: {
      type: String,
      trim: true,
      default: '',
    },
    mrp: {
      type: Number,
      default: 0,
      min: 0,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      default: 0,
      min: [0, 'Discount price cannot be negative'],
    },
    unit: {
      type: String,
      required: [true, 'Unit/Weight is required (e.g., 500g, 1 plate, 1L)'],
      trim: true,
    },
    variants: [productVariantSchema],
    stock: {
      type: Number,
      default: 50,
      min: [0, 'Stock cannot be negative'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['food', 'grocery'],
      required: [true, 'Product type must be either food or grocery'],
      index: true,
    },
    isVeg: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isBestseller: {
      type: Boolean,
      default: false,
      index: true,
    },
    rating: {
      average: {
        type: Number,
        default: 4.5,
        min: 0,
        max: 5,
        set: (v) => Math.round(v * 10) / 10,
      },
      count: {
        type: Number,
        default: 15,
      },
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    keywords: [{ type: String, trim: true, lowercase: true }],
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

// Compound Indexes for fast catalog browsing & filtering
productSchema.index({ type: 1, category: 1, isActive: 1 });
productSchema.index({ type: 1, isVeg: 1, price: 1 });
productSchema.index({ 'rating.average': -1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

export const Product = mongoose.model('Product', productSchema);
