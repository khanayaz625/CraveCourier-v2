import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    image: {
      type: String,
      required: [true, 'Category thumbnail image is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    subcategories: [{ type: String, trim: true }],
    type: {
      type: String,
      enum: ['food', 'grocery', 'both'],
      default: 'both',
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
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

categorySchema.index({ type: 1, isActive: 1, displayOrder: 1 });

export const Category = mongoose.model('Category', categorySchema);
