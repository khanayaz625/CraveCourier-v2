import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Cart } from '../models/Cart.model.js';
import { Product } from '../models/Product.model.js';
import { Coupon } from '../models/Coupon.model.js';
import { Order } from '../models/Order.model.js';

// Helper to fetch populated cart
const getPopulatedCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  await cart.recalculateTotals();
  await cart.save();

  return await Cart.findById(cart._id)
    .populate('items.product', 'name slug images price discountPrice unit isVeg stock type')
    .populate('couponApplied', 'code discountType discountValue minOrderValue maxDiscount');
};

/**
 * @desc   Get current user's active cart with live verified prices
 * @route  GET /api/cart
 * @access Private
 */
export const getCart = asyncHandler(async (req, res) => {
  const cart = await getPopulatedCart(req.user._id);
  return res.status(200).json(new ApiResponse(200, cart, 'Cart retrieved'));
});

/**
 * @desc   Add an item to cart
 * @route  POST /api/cart/items
 * @access Private
 */
export const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, variant } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found or unavailable');
  }

  if (product.stock < 1) {
    throw new ApiError(400, 'Sorry, this product is currently out of stock');
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  const existingItemIndex = cart.items.findIndex((item) => {
    const sameProduct = item.product.toString() === productId;
    if (variant && variant.size) {
      return sameProduct && item.selectedVariant?.size === variant.size;
    }
    return sameProduct && (!item.selectedVariant || !item.selectedVariant.size);
  });

  let livePrice =
    product.discountPrice && product.discountPrice > 0
      ? product.discountPrice
      : product.price;

  if (variant && variant.size) {
    const foundVar = product.variants?.find((v) => v.size === variant.size);
    if (foundVar) {
      livePrice = foundVar.sellingPrice;
    } else if (variant.sellingPrice > 0) {
      livePrice = variant.sellingPrice;
    }
  }

  if (existingItemIndex > -1) {
    const currentQty = cart.items[existingItemIndex].quantity;
    const requestedQty = currentQty + parseInt(quantity, 10);

    if (requestedQty > product.stock) {
      throw new ApiError(
        400,
        `Cannot add more. Only ${product.stock} units available in stock.`
      );
    }
    cart.items[existingItemIndex].quantity = requestedQty;
    cart.items[existingItemIndex].priceAtAddition = livePrice;
    if (variant) {
      cart.items[existingItemIndex].selectedVariant = variant;
    }
  } else {
    const safeQty = Math.min(parseInt(quantity, 10), product.stock);
    cart.items.push({
      product: productId,
      quantity: safeQty,
      priceAtAddition: livePrice,
      selectedVariant: variant || null,
    });
  }

  await cart.recalculateTotals();
  await cart.save();

  const populatedCart = await getPopulatedCart(req.user._id);
  return res.status(200).json(new ApiResponse(200, populatedCart, 'Item added to cart'));
});

/**
 * @desc   Update item quantity in cart
 * @route  PUT /api/cart/items/:productId
 * @access Private
 */
export const updateItemQuantity = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    throw new ApiError(404, 'Item not found in your cart');
  }

  const targetQty = parseInt(quantity, 10);

  if (targetQty <= 0) {
    // Remove if 0 or negative
    cart.items.splice(itemIndex, 1);
  } else {
    const product = await Product.findById(productId);
    if (!product) {
      cart.items.splice(itemIndex, 1);
    } else {
      if (targetQty > product.stock) {
        throw new ApiError(
          400,
          `Cannot exceed available stock of ${product.stock} items.`
        );
      }
      cart.items[itemIndex].quantity = targetQty;
    }
  }

  await cart.recalculateTotals();
  await cart.save();

  const populatedCart = await getPopulatedCart(req.user._id);
  return res.status(200).json(new ApiResponse(200, populatedCart, 'Cart updated'));
});

/**
 * @desc   Remove single item from cart
 * @route  DELETE /api/cart/items/:productId
 * @access Private
 */
export const removeItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  cart.items = cart.items.filter((item) => item.product.toString() !== productId);

  await cart.recalculateTotals();
  await cart.save();

  const populatedCart = await getPopulatedCart(req.user._id);
  return res.status(200).json(new ApiResponse(200, populatedCart, 'Item removed from cart'));
});

/**
 * @desc   Clear entire cart
 * @route  DELETE /api/cart
 * @access Private
 */
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.items = [];
    cart.couponApplied = null;
    await cart.recalculateTotals();
    await cart.save();
  }

  const populatedCart = await getPopulatedCart(req.user._id);
  return res.status(200).json(new ApiResponse(200, populatedCart, 'Cart cleared'));
});

/**
 * @desc   Apply discount coupon to cart
 * @route  POST /api/cart/coupon
 * @access Private
 */
export const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code || !code.trim()) {
    throw new ApiError(400, 'Please provide a coupon code');
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Cannot apply coupon to an empty cart');
  }

  // Pre-calculate subtotal
  await cart.recalculateTotals();

  const coupon = await Coupon.findOne({
    code: code.trim().toUpperCase(),
    isActive: true,
  });

  if (!coupon) {
    throw new ApiError(404, 'Invalid coupon code or promo expired');
  }

  // First-order coupon restriction (e.g. WELCOME50)
  if (coupon.code === 'WELCOME50') {
    const priorOrdersCount = await Order.countDocuments({
      customer: req.user._id,
      status: { $nin: ['cancelled', 'refunded'] },
    });
    if (priorOrdersCount > 0) {
      throw new ApiError(400, 'WELCOME50 is only valid on your first order.');
    }
  }

  const validation = coupon.isValidForOrder(cart.totals.itemTotal);
  if (!validation.valid) {
    throw new ApiError(400, validation.reason);
  }

  cart.couponApplied = coupon._id;
  await cart.recalculateTotals();
  await cart.save();

  const populatedCart = await getPopulatedCart(req.user._id);
  return res.status(200).json(
    new ApiResponse(
      200,
      populatedCart,
      `Coupon '${coupon.code}' applied! You saved $${validation.discount.toFixed(2)}`
    )
  );
});

/**
 * @desc   Remove applied coupon
 * @route  DELETE /api/cart/coupon
 * @access Private
 */
export const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.couponApplied = null;
    await cart.recalculateTotals();
    await cart.save();
  }

  const populatedCart = await getPopulatedCart(req.user._id);
  return res.status(200).json(new ApiResponse(200, populatedCart, 'Coupon removed'));
});

/**
 * @desc   Merge guest cart items from localStorage on login
 * @route  POST /api/cart/sync
 * @access Private
 */
export const syncGuestCart = asyncHandler(async (req, res) => {
  const { items = [] } = req.body;

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  for (const guestItem of items) {
    const product = await Product.findById(guestItem.productId || guestItem.product);
    if (product && product.isActive && product.stock > 0) {
      const livePrice =
        product.discountPrice && product.discountPrice > 0
          ? product.discountPrice
          : product.price;

      const existingIndex = cart.items.findIndex(
        (it) => it.product.toString() === product._id.toString()
      );

      if (existingIndex > -1) {
        const mergedQty = Math.min(
          cart.items[existingIndex].quantity + (guestItem.quantity || 1),
          product.stock
        );
        cart.items[existingIndex].quantity = mergedQty;
        cart.items[existingIndex].priceAtAddition = livePrice;
      } else {
        const safeQty = Math.min(guestItem.quantity || 1, product.stock);
        cart.items.push({
          product: product._id,
          quantity: safeQty,
          priceAtAddition: livePrice,
        });
      }
    }
  }

  await cart.recalculateTotals();
  await cart.save();

  const populatedCart = await getPopulatedCart(req.user._id);
  return res.status(200).json(new ApiResponse(200, populatedCart, 'Guest cart merged successfully'));
});
