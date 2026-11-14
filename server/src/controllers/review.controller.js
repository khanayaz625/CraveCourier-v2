import { Review } from '../models/Review.model.js';
import { Order } from '../models/Order.model.js';
import { Product } from '../models/Product.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Submit Review & Rating for an Order
 * @route   POST /api/reviews
 * @access  Private (Customer)
 */
export const createOrderReview = asyncHandler(async (req, res) => {
  const { orderId, rating = 5, comment = '', productReviews = [] } = req.body;

  if (!orderId) {
    throw new ApiError(400, 'orderId is required to submit a review');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Ensure user owns this order
  if (order.customer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only review your own orders');
  }

  // Ensure order is delivered
  if (order.status !== 'delivered') {
    throw new ApiError(400, 'You can only review orders after they have been delivered');
  }

  if (order.hasReviewed) {
    throw new ApiError(400, 'This order has already been reviewed');
  }

  const createdReviews = [];

  // 1. If individual item reviews provided, create them
  if (Array.isArray(productReviews) && productReviews.length > 0) {
    for (const pr of productReviews) {
      if (!pr.productId) continue;
      const rev = await Review.findOneAndUpdate(
        { user: req.user._id, product: pr.productId, order: order._id },
        {
          rating: Math.min(5, Math.max(1, parseInt(pr.rating || rating, 10))),
          comment: pr.comment || comment,
          order: order._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      createdReviews.push(rev);
    }
  } else {
    // 2. Default: review all items in the order with the given rating & comment
    for (const item of order.items) {
      const rev = await Review.findOneAndUpdate(
        { user: req.user._id, product: item.product, order: order._id },
        {
          rating: Math.min(5, Math.max(1, parseInt(rating, 10))),
          comment,
          order: order._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      createdReviews.push(rev);
    }
  }

  // Mark order as reviewed
  order.hasReviewed = true;
  await order.save();

  return res.status(201).json(
    new ApiResponse(201, {
      reviews: createdReviews,
      orderId: order._id,
    }, 'Thank you! Your review and ratings have been submitted.')
  );
});

/**
 * @desc    Get Reviews for a Specific Order
 * @route   GET /api/reviews/order/:orderId
 * @access  Private
 */
export const getOrderReviews = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const reviews = await Review.find({ order: orderId })
    .populate('product', 'name images price unit')
    .populate('user', 'name avatar');

  return res.status(200).json(
    new ApiResponse(200, reviews, 'Order reviews fetched successfully')
  );
});

/**
 * @desc    Get Public Reviews for a Product
 * @route   GET /api/reviews/product/:productId
 * @access  Public
 */
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [reviews, total] = await Promise.all([
    Review.find({ product: productId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'name avatar'),
    Review.countDocuments({ product: productId }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'Product reviews fetched successfully')
  );
});

