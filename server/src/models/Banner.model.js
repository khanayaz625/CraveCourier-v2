import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [200, 'Subtitle cannot exceed 200 characters'],
    },
    imageUrl: {
      type: String,
      required: [true, 'Banner image URL is required'],
      trim: true,
    },
    linkUrl: {
      type: String,
      default: '/products',
      trim: true,
    },
    badge: {
      type: String,
      default: 'PROMO',
      trim: true,
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

bannerSchema.index({ isActive: 1, displayOrder: 1 });

export const Banner = mongoose.model('Banner', bannerSchema);

