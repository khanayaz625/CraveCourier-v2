import { Order } from '../models/Order.model.js';
import { Cart } from '../models/Cart.model.js';
import { Product } from '../models/Product.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getIO } from '../config/socket.js';
import { pushOrderStatusNotification } from '../services/notification.service.js';

/**
 * @desc    Get Current Logged-in Customer Orders
 * @route   GET /api/orders/my-orders
 * @access  Private (Customer)
 */
export const getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { customer: req.user._id };
  if (status && status !== 'all') {
    query.status = status;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('deliveryPartner', 'name phone avatar'),
    Order.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'Customer orders fetched successfully')
  );
});

/**
 * @desc    Get Single Order by ID or Order Number
 * @route   GET /api/orders/:id
 * @access  Private (Owner, Admin, or Assigned Delivery Partner)
 */
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find by MongoDB _id or by human-readable orderNumber (e.g. CRV-...)
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  const query = isObjectId ? { _id: id } : { orderNumber: id.toUpperCase() };

  const order = await Order.findOne(query)
    .populate('customer', 'name email phone avatar')
    .populate('deliveryPartner', 'name phone avatar');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Authorization check: customer must own the order, or user is admin or delivery partner
  const isCustomerOwner = order.customer._id.toString() === req.user._id.toString();
  const isAdminOrDelivery = req.user.role === 'admin' || req.user.role === 'delivery';

  if (!isCustomerOwner && !isAdminOrDelivery) {
    throw new ApiError(403, 'You do not have permission to view this order');
  }

  return res.status(200).json(
    new ApiResponse(200, order, 'Order details fetched successfully')
  );
});

/**
 * @desc    Get All Orders Across Platform (Admin Only)
 * @route   GET /api/orders
 * @access  Private (Admin only)
 */
export const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;

  const query = {};
  if (status && status !== 'all') {
    query.status = status;
  }

  if (search) {
    query.orderNumber = { $regex: search.trim(), $options: 'i' };
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('customer', 'name email phone')
      .populate('deliveryPartner', 'name phone'),
    Order.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'Admin orders fetched successfully')
  );
});

/**
 * @desc    Update Order Status (Admin or Delivery Partner)
 * @route   PATCH /api/orders/:id/status
 * @access  Private (Admin / Delivery)
 */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const validStatuses = [
    'placed',
    'confirmed',
    'preparing',
    'ready',
    'picked_up',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'refunded',
  ];

  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid order status. Allowed values: ${validStatuses.join(', ')}`);
  }

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Delivery partner rules: can claim and update status
  if (req.user.role === 'delivery') {
    if (!order.deliveryPartner) {
      order.deliveryPartner = req.user._id;
    }
  }

  order.status = status;
  order.statusTimeline.push({
    status,
    timestamp: new Date(),
    note: note || `Order updated to ${status.replace(/_/g, ' ')} by ${req.user.role}`,
  });

  if (status === 'delivered') {
    order.deliveredAt = new Date();
    if (order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
    }
  }

  await order.save();

  // 1. Send push notification to user in MongoDB and over Socket.io
  await pushOrderStatusNotification(order, status, note);

  // 2. Broadcast live status change to the specific order tracking room
  try {
    const io = getIO();
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone avatar')
      .populate('deliveryPartner', 'name phone avatar');

    io.to(`order:${order._id}`).emit('order:status_updated', {
      order: populatedOrder,
      status,
      note: note || `Order status updated to ${status.replace(/_/g, ' ')}`,
      timestamp: new Date().toISOString(),
    });

    // If order is ready for pickup, alert all active delivery partners
    if (status === 'ready') {
      io.to('riders').emit('order:ready_for_pickup', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        deliveryAddress: order.deliveryAddress,
      });
    }
  } catch (socketErr) {
    console.warn(`[SOCKET BROADCAST ERROR]: ${socketErr.message}`);
  }

  return res.status(200).json(
    new ApiResponse(200, order, `Order status updated to ${status}`)
  );
});

/**
 * @desc    Reorder an existing completed order (adds items to cart)
 * @route   POST /api/orders/:id/reorder
 * @access  Private (Customer)
 */
export const reorderOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Ensure owner
  if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'You do not have permission to reorder this');
  }

  // Fetch or create user's cart
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  let addedCount = 0;

  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (product && product.isActive && product.stock > 0) {
      const livePrice =
        product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price;

      const existingIndex = cart.items.findIndex(
        (ci) => ci.product.toString() === product._id.toString()
      );

      const addQuantity = Math.min(item.quantity, product.stock);

      if (existingIndex > -1) {
        cart.items[existingIndex].quantity = Math.min(
          cart.items[existingIndex].quantity + addQuantity,
          product.stock
        );
        cart.items[existingIndex].priceAtAddition = livePrice;
      } else {
        cart.items.push({
          product: product._id,
          quantity: addQuantity,
          priceAtAddition: livePrice,
        });
      }
      addedCount++;
    }
  }

  if (addedCount === 0) {
    throw new ApiError(400, 'The items from this order are currently out of stock.');
  }

  await cart.recalculateTotals();
  await cart.save();

  const populatedCart = await Cart.findById(cart._id).populate(
    'items.product',
    'name price discountPrice unit images stock isActive'
  );

  return res.status(200).json(
    new ApiResponse(200, populatedCart, `Successfully added ${addedCount} items to your cart`)
  );
});

