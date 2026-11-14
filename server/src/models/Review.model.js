import mongoose from 'mongoose';
import { Product } from './Product.model.js';

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
    images: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

// One review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Static method to recalculate product rating average
reviewSchema.statics.calculateAverageRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        count: { $sum: 1 },
        average: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      rating: {
        average: Math.round(stats[0].average * 10) / 10,
        count: stats[0].count,
      },
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      rating: {
        average: 0,
        count: 0,
      },
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.calculateAverageRating(this.product);
});

reviewSchema.post('findOneAndDelete', function (doc) {
  if (doc) {
    doc.constructor.calculateAverageRating(doc.product);
  }
});

export const Review = mongoose.model('Review', reviewSchema);
