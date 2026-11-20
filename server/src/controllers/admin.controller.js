import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import {
  User,
  Order,
  Product,
  Category,
  Coupon,
  DeliveryPartnerProfile,
  Banner,
  AuditLog,
  Payment,
} from '../models/index.js';
import { logAdminAction } from '../utils/auditLogger.js';
import {
  pushOrderStatusNotification,
  pushDirectNotification,
} from '../services/notification.service.js';
import { getIO } from '../config/socket.js';
import { ENV } from '../config/env.js';
import Stripe from 'stripe';

const stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Helper to slugify string
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-');

// Helper to escape CSV strings
const escapeCsv = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

// ==========================================
// 1. DASHBOARD ANALYTICS & RECHARTS METRICS
// ==========================================

/**
 * @desc    Get executive KPIs, trends for Recharts, and top products
 * @route   GET /api/admin/analytics
 * @access  Admin Only
 */
export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // 1. Parallel KPI Aggregations
  const [
    totalOrdersCount,
    ordersTodayCount,
    activePartnersCount,
    pendingKycCount,
    totalProductsCount,
    userCounts,
    revenueAgg,
    revenueTodayAgg,
    sevenDayAgg,
    statusAgg,
    topProductsAgg,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    DeliveryPartnerProfile.countDocuments({ isOnline: true }),
    DeliveryPartnerProfile.countDocuments({ 'documents.status': 'pending' }),
    Product.countDocuments(),
    User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: { $in: ['paid'] } } },
      { $group: { _id: null, total: { $sum: '$totals.grandTotal' } } },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday },
          paymentStatus: { $in: ['paid'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$totals.grandTotal' } } },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totals.grandTotal', 0],
            },
          },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]),
  ]);

  // Format 7-Day Trend map ensuring all 7 days exist
  const trendMap = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    trendMap[key] = { date: key, label: dayLabel, revenue: 0, orders: 0 };
  }

  sevenDayAgg.forEach((item) => {
    if (trendMap[item._id]) {
      trendMap[item._id].revenue = Math.round(item.revenue * 100) / 100;
      trendMap[item._id].orders = item.orders;
    }
  });

  const revenueTrend = Object.values(trendMap);

  // Format User Roles
  const rolesMap = { customer: 0, delivery: 0, vendor: 0, admin: 0 };
  userCounts.forEach((u) => {
    rolesMap[u._id] = u.count;
  });

  // Format Order Status
  const statusColors = {
    placed: '#6366f1',
    confirmed: '#3b82f6',
    preparing: '#f59e0b',
    ready: '#8b5cf6',
    picked_up: '#06b6d4',
    out_for_delivery: '#10b981',
    delivered: '#22c55e',
    cancelled: '#ef4444',
    refunded: '#64748b',
  };

  const statusDistribution = statusAgg.map((s) => ({
    status: s._id,
    count: s.count,
    color: statusColors[s._id] || '#94a3b8',
    label: s._id ? s._id.replace('_', ' ').toUpperCase() : 'UNKNOWN',
  }));

  const totalRevenue = revenueAgg[0]?.total ? Math.round(revenueAgg[0].total * 100) / 100 : 0;
  const revenueToday = revenueTodayAgg[0]?.total ? Math.round(revenueTodayAgg[0].total * 100) / 100 : 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        kpis: {
          totalRevenue,
          revenueToday,
          totalOrders: totalOrdersCount,
          ordersToday: ordersTodayCount,
          activePartners: activePartnersCount,
          pendingKyc: pendingKycCount,
          totalProducts: totalProductsCount,
          users: rolesMap,
        },
        charts: {
          revenueTrend,
          statusDistribution,
          topProducts: topProductsAgg,
        },
      },
      'Dashboard analytics fetched successfully'
    )
  );
});

// ==========================================
// 2. USER MANAGEMENT
// ==========================================

/**
 * @desc    Get paginated users with role and status filters
 * @route   GET /api/admin/users
 * @access  Admin Only
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', role = 'all', status = 'all' } = req.query;

  const filter = {};
  if (role !== 'all') filter.role = role;
  if (status === 'active') filter.isActive = true;
  if (status === 'blocked') filter.isActive = false;

  if (search.trim()) {
    const sRegex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: sRegex }, { email: sRegex }, { phone: sRegex }];
  }

  const p = Math.max(1, parseInt(page, 10));
  const l = Math.max(1, parseInt(limit, 10));

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l),
    User.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        total,
        page: p,
        totalPages: Math.ceil(total / l) || 1,
      },
      'Users retrieved successfully'
    )
  );
});

/**
 * @desc    Toggle user active status (block/unblock) or update role
 * @route   PATCH /api/admin/users/:id
 * @access  Admin Only
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive, role } = req.body;

  // Prevent self-deactivation or self-demotion
  if (req.user._id.toString() === id) {
    if (isActive === false) throw new ApiError(400, 'Super admin cannot deactivate own account');
    if (role && role !== 'admin') throw new ApiError(400, 'Super admin cannot demote own role');
  }

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');

  const updates = {};
  if (typeof isActive === 'boolean') updates.isActive = isActive;
  if (role && ['customer', 'delivery', 'admin', 'vendor'].includes(role)) updates.role = role;

  const updatedUser = await User.findByIdAndUpdate(id, { $set: updates }, { new: true }).select(
    '-password -refreshToken'
  );

  // If role is delivery and profile does not exist, initialize it
  if (role === 'delivery') {
    const existingProfile = await DeliveryPartnerProfile.findOne({ user: id });
    if (!existingProfile) {
      await DeliveryPartnerProfile.create({
        user: id,
        vehicle: { type: 'scooter', plateNumber: 'PENDING', model: 'Standard' },
      });
    }
  }

  // Audit Log
  await logAdminAction({
    adminId: req.user._id,
    action: typeof isActive === 'boolean' ? 'USER_STATUS_CHANGE' : 'USER_ROLE_CHANGE',
    entity: 'User',
    entityId: user._id,
    details: { previous: { isActive: user.isActive, role: user.role }, updated: updates },
    req,
  });

  return res.status(200).json(
    new ApiResponse(200, updatedUser, `User ${updatedUser.name} updated successfully`)
  );
});

// ==========================================
// 3. DELIVERY PARTNERS (KYC & FLEET)
// ==========================================

/**
 * @desc    Get delivery partners with vehicle & KYC status
 * @route   GET /api/admin/delivery-partners
 * @access  Admin Only
 */
export const getDeliveryPartners = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = 'all', online = 'all', search = '' } = req.query;

  const profileFilter = {};
  if (status !== 'all') profileFilter['documents.status'] = status;
  if (online === 'true') profileFilter.isOnline = true;
  if (online === 'false') profileFilter.isOnline = false;

  const p = Math.max(1, parseInt(page, 10));
  const l = Math.max(1, parseInt(limit, 10));

  let userIds = null;
  if (search.trim()) {
    const sRegex = new RegExp(search.trim(), 'i');
    const matchingUsers = await User.find({
      role: 'delivery',
      $or: [{ name: sRegex }, { email: sRegex }, { phone: sRegex }],
    }).select('_id');
    userIds = matchingUsers.map((u) => u._id);
    profileFilter.user = { $in: userIds };
  }

  const [partners, total] = await Promise.all([
    DeliveryPartnerProfile.find(profileFilter)
      .populate('user', 'name email phone avatar isActive createdAt')
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l),
    DeliveryPartnerProfile.countDocuments(profileFilter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        partners,
        total,
        page: p,
        totalPages: Math.ceil(total / l) || 1,
      },
      'Delivery partners retrieved'
    )
  );
});

/**
 * @desc    Approve or reject delivery partner KYC documents
 * @route   PATCH /api/admin/delivery-partners/:id/verify
 * @access  Admin Only
 */
export const verifyDeliveryPartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body; // status: 'approved' | 'rejected' | 'pending'

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    throw new ApiError(400, 'Invalid KYC status value');
  }

  const profile = await DeliveryPartnerProfile.findById(id).populate('user', 'name email');
  if (!profile) throw new ApiError(404, 'Delivery partner profile not found');

  profile.documents.status = status;
  profile.documents.verified = status === 'approved';
  await profile.save();

  // Send direct in-app notification to the rider
  const partnerName = profile.user?.name || 'Partner';
  const notificationMsg =
    status === 'approved'
      ? `Congratulations ${partnerName}! Your delivery partner KYC documents have been APPROVED. You can now go online and accept delivery orders.`
      : `Your delivery partner KYC verification was marked as ${status.toUpperCase()}. ${reason ? `Reason: ${reason}` : 'Please contact support or re-upload clear documents.'}`;

  await pushDirectNotification(profile.user._id, {
    title: status === 'approved' ? 'KYC Approved 🎉' : 'KYC Verification Update 📋',
    message: notificationMsg,
    type: 'kyc_update',
    data: { status, reason },
  });

  // Audit Log
  await logAdminAction({
    adminId: req.user._id,
    action: 'PARTNER_APPROVAL_CHANGE',
    entity: 'DeliveryPartnerProfile',
    entityId: profile._id,
    details: { status, verified: profile.documents.verified, reason },
    req,
  });

  return res.status(200).json(
    new ApiResponse(200, profile, `Partner KYC marked as ${status}`)
  );
});

// ==========================================
// 4. ORDERS & DISPATCH OPERATIONS
// ==========================================

/**
 * @desc    Get orders with multi-filters and pagination
 * @route   GET /api/admin/orders
 * @access  Admin Only
 */
export const getOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status = 'all',
    paymentStatus = 'all',
    search = '',
  } = req.query;

  const filter = {};
  if (status !== 'all') filter.status = status;
  if (paymentStatus !== 'all') filter.paymentStatus = paymentStatus;

  if (search.trim()) {
    const sRegex = new RegExp(search.trim(), 'i');
    filter.$or = [{ orderNumber: sRegex }];
  }

  const p = Math.max(1, parseInt(page, 10));
  const l = Math.max(1, parseInt(limit, 10));

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('deliveryPartner', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l),
    Order.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        total,
        page: p,
        totalPages: Math.ceil(total / l) || 1,
      },
      'Orders retrieved'
    )
  );
});

/**
 * @desc    Manually assign delivery partner to an order
 * @route   PATCH /api/admin/orders/:id/assign
 * @access  Admin Only
 */
export const assignOrderPartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { partnerId } = req.body;

  const [order, partnerUser] = await Promise.all([
    Order.findById(id).populate('customer', 'name email'),
    User.findOne({ _id: partnerId, role: 'delivery' }),
  ]);

  if (!order) throw new ApiError(404, 'Order not found');
  if (!partnerUser) throw new ApiError(404, 'Delivery partner user not found or invalid role');

  const partnerProfile = await DeliveryPartnerProfile.findOne({ user: partnerId });
  if (!partnerProfile) throw new ApiError(404, 'Partner profile not found');

  order.deliveryPartner = partnerId;
  if (order.status === 'placed') {
    order.status = 'confirmed';
  }

  order.statusTimeline.push({
    status: order.status,
    timestamp: new Date(),
    note: `Courier manually assigned by Admin: ${partnerUser.name}`,
  });

  await order.save();

  // Link active order in partner profile
  partnerProfile.activeOrder = order._id;
  await partnerProfile.save();

  // Push notifications and Socket updates
  const io = getIO();
  io.to(`order:${order._id}`).emit('order:status_changed', {
    orderId: order._id,
    status: order.status,
    deliveryPartner: {
      _id: partnerUser._id,
      name: partnerUser.name,
      phone: partnerUser.phone,
    },
    note: `Courier assigned: ${partnerUser.name}`,
  });

  io.to(`user:${partnerId}`).emit('order:assigned', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    deliveryAddress: order.deliveryAddress,
    totals: order.totals,
  });

  await pushDirectNotification(partnerId, {
    title: 'New Delivery Assigned 🛵',
    message: `Admin assigned order #${order.orderNumber} to you. Tap to accept and start delivery.`,
    type: 'delivery_assignment',
    data: { orderId: order._id, orderNumber: order.orderNumber },
  });

  // Audit Log
  await logAdminAction({
    adminId: req.user._id,
    action: 'ORDER_MANUAL_ASSIGN',
    entity: 'Order',
    entityId: order._id,
    details: { orderNumber: order.orderNumber, partnerId, partnerName: partnerUser.name },
    req,
  });

  return res.status(200).json(
    new ApiResponse(200, order, `Order assigned to ${partnerUser.name}`)
  );
});

/**
 * @desc    Direct admin order status transition (e.g. Cancel or Force Complete)
 * @route   PATCH /api/admin/orders/:id/status
 * @access  Admin Only
 */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note = 'Updated by Administrator' } = req.body;

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
    throw new ApiError(400, `Invalid order status '${status}'`);
  }

  const order = await Order.findById(id).populate('customer', 'name email phone');
  if (!order) throw new ApiError(404, 'Order not found');

  const previousStatus = order.status;
  order.status = status;
  order.statusTimeline.push({
    status,
    timestamp: new Date(),
    note,
  });

  if (status === 'delivered') {
    order.deliveredAt = new Date();
    // Clear rider active order
    if (order.deliveryPartner) {
      await DeliveryPartnerProfile.findOneAndUpdate(
        { user: order.deliveryPartner },
        { activeOrder: null, $inc: { 'earnings.deliveriesCompleted': 1, 'earnings.total': 6.5 } }
      );
    }
  }

  await order.save();

  // Push Socket and Notification
  const io = getIO();
  io.to(`order:${order._id}`).emit('order:status_changed', {
    orderId: order._id,
    status,
    note,
  });

  await pushOrderStatusNotification(order, status, note);

  // Audit Log
  await logAdminAction({
    adminId: req.user._id,
    action: 'ORDER_STATUS_UPDATE',
    entity: 'Order',
    entityId: order._id,
    details: { previousStatus, newStatus: status, note },
    req,
  });

  return res.status(200).json(
    new ApiResponse(200, order, `Order status updated to ${status}`)
  );
});

/**
 * @desc    Trigger instant full refund on order
 * @route   POST /api/admin/orders/:id/refund
 * @access  Admin Only
 */
export const refundOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason = 'Refund issued by administrator' } = req.body;

  const order = await Order.findById(id).populate('customer', 'name email');
  if (!order) throw new ApiError(404, 'Order not found');

  if (order.paymentStatus === 'refunded') {
    throw new ApiError(400, 'Order has already been refunded');
  }

  let refundRecord = null;

  // Process Stripe refund if paid online
  if (order.paymentMethod === 'stripe' && order.paymentId) {
    try {
      if (order.paymentId.startsWith('pi_')) {
        refundRecord = await stripe.refunds.create({
          payment_intent: order.paymentId,
          reason: 'requested_by_customer',
        });
      }
    } catch (stripeErr) {
      console.warn(`[STRIPE REFUND WARNING] ${stripeErr.message}`);
    }
  }

  // Restore inventory stock
  if (order.items && order.items.length > 0) {
    for (const item of order.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }
  }

  order.paymentStatus = 'refunded';
  order.status = 'refunded';
  order.statusTimeline.push({
    status: 'refunded',
    timestamp: new Date(),
    note: `Refund completed: ${refundRecord?.id || 'Manual Admin Cancellation'} (${reason})`,
  });

  await order.save();

  // Record Payment model update
  await Payment.findOneAndUpdate(
    { order: order._id },
    {
      status: 'refunded',
      refundId: refundRecord?.id || `MANUAL-${Date.now()}`,
      refundReason: reason,
    }
  );

  // Push socket & notification
  const io = getIO();
  io.to(`order:${order._id}`).emit('order:status_changed', {
    orderId: order._id,
    status: 'refunded',
    note: reason,
  });

  await pushOrderStatusNotification(order, 'refunded', reason);

  // Audit Log
  await logAdminAction({
    adminId: req.user._id,
    action: 'ORDER_REFUND',
    entity: 'Order',
    entityId: order._id,
    details: { refundId: refundRecord?.id || 'MANUAL', amount: order.totals.grandTotal, reason },
    req,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { order, refund: refundRecord },
      'Order refunded and inventory restored successfully'
    )
  );
});

// ==========================================
// 5. CATALOG (PRODUCTS & CATEGORIES)
// ==========================================

export const getAdminProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', category = 'all', type = 'all' } = req.query;

  const filter = {};
  if (category !== 'all') filter.category = category;
  if (type !== 'all') filter.type = type;
  if (search.trim()) {
    const sRegex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: sRegex }, { tags: sRegex }];
  }

  const p = Math.max(1, parseInt(page, 10));
  const l = Math.max(1, parseInt(limit, 10));

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l),
    Product.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, { products, total, page: p, totalPages: Math.ceil(total / l) || 1 }, 'Products retrieved')
  );
});

export const createProduct = asyncHandler(async (req, res) => {
  const { name, price, discountPrice, unit, stock, category, type, isVeg, images, description } = req.body;

  if (!name || !price || !unit || !category || !type) {
    throw new ApiError(400, 'Missing required product fields');
  }

  const product = await Product.create({
    name,
    slug: slugify(name) + '-' + Date.now().toString().slice(-4),
    price: Number(price),
    discountPrice: discountPrice ? Number(discountPrice) : 0,
    unit,
    stock: stock !== undefined ? Number(stock) : 50,
    category,
    type,
    isVeg: isVeg !== undefined ? isVeg : true,
    images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80'],
    description: description || '',
  });

  await logAdminAction({
    adminId: req.user._id,
    action: 'PRODUCT_CREATE',
    entity: 'Product',
    entityId: product._id,
    details: { name: product.name, price: product.price },
    req,
  });

  return res.status(201).json(new ApiResponse(201, product, 'Product created successfully'));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!product) throw new ApiError(404, 'Product not found');

  await logAdminAction({
    adminId: req.user._id,
    action: 'PRODUCT_UPDATE',
    entity: 'Product',
    entityId: product._id,
    details: req.body,
    req,
  });

  return res.status(200).json(new ApiResponse(200, product, 'Product updated successfully'));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByIdAndDelete(id);
  if (!product) throw new ApiError(404, 'Product not found');

  await logAdminAction({
    adminId: req.user._id,
    action: 'PRODUCT_DELETE',
    entity: 'Product',
    entityId: product._id,
    details: { name: product.name },
    req,
  });

  return res.status(200).json(new ApiResponse(200, { id }, 'Product deleted successfully'));
});

// Categories
export const getAdminCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ displayOrder: 1, name: 1 });

  // Count products in each category
  const counts = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countMap = {};
  counts.forEach((c) => {
    countMap[c._id.toString()] = c.count;
  });

  const enriched = categories.map((cat) => ({
    ...cat.toObject(),
    productCount: countMap[cat._id.toString()] || 0,
  }));

  return res.status(200).json(new ApiResponse(200, enriched, 'Categories retrieved'));
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, image, description, type, displayOrder, isActive } = req.body;
  if (!name || !image) throw new ApiError(400, 'Name and image are required');

  const slug = slugify(name);
  const category = await Category.create({
    name,
    slug,
    image,
    description,
    type: type || 'both',
    displayOrder: displayOrder || 0,
    isActive: isActive !== undefined ? isActive : true,
  });

  await logAdminAction({
    adminId: req.user._id,
    action: 'CATEGORY_CREATE',
    entity: 'Category',
    entityId: category._id,
    details: { name: category.name, slug },
    req,
  });

  return res.status(201).json(new ApiResponse(201, category, 'Category created'));
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findByIdAndUpdate(id, req.body, { new: true });
  if (!category) throw new ApiError(404, 'Category not found');

  await logAdminAction({
    adminId: req.user._id,
    action: 'CATEGORY_UPDATE',
    entity: 'Category',
    entityId: category._id,
    details: req.body,
    req,
  });

  return res.status(200).json(new ApiResponse(200, category, 'Category updated'));
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    throw new ApiError(400, `Cannot delete category: ${productCount} products are assigned to it`);
  }

  const category = await Category.findByIdAndDelete(id);
  if (!category) throw new ApiError(404, 'Category not found');

  await logAdminAction({
    adminId: req.user._id,
    action: 'CATEGORY_DELETE',
    entity: 'Category',
    entityId: category._id,
    details: { name: category.name },
    req,
  });

  return res.status(200).json(new ApiResponse(200, { id }, 'Category deleted'));
});

// ==========================================
// 6. COUPONS MANAGEMENT
// ==========================================

export const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, coupons, 'Coupons retrieved'));
});

export const createCoupon = asyncHandler(async (req, res) => {
  const { code, description, discountType, discountValue, minOrderValue, maxDiscount, expiryDate, usageLimit, isActive } =
    req.body;

  if (!code || !discountType || !discountValue || !expiryDate) {
    throw new ApiError(400, 'Code, discountType, discountValue, and expiryDate are required');
  }

  const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (existing) throw new ApiError(409, `Coupon with code '${code}' already exists`);

  const coupon = await Coupon.create({
    code: code.toUpperCase().trim(),
    description,
    discountType,
    discountValue: Number(discountValue),
    minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
    maxDiscount: maxDiscount ? Number(maxDiscount) : null,
    expiryDate: new Date(expiryDate),
    usageLimit: usageLimit ? Number(usageLimit) : 1000,
    isActive: isActive !== undefined ? isActive : true,
  });

  await logAdminAction({
    adminId: req.user._id,
    action: 'COUPON_CREATE',
    entity: 'Coupon',
    entityId: coupon._id,
    details: { code: coupon.code, discountValue: coupon.discountValue },
    req,
  });

  return res.status(201).json(new ApiResponse(201, coupon, 'Coupon created successfully'));
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const coupon = await Coupon.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!coupon) throw new ApiError(404, 'Coupon not found');

  await logAdminAction({
    adminId: req.user._id,
    action: 'COUPON_UPDATE',
    entity: 'Coupon',
    entityId: coupon._id,
    details: req.body,
    req,
  });

  return res.status(200).json(new ApiResponse(200, coupon, 'Coupon updated'));
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');

  await logAdminAction({
    adminId: req.user._id,
    action: 'COUPON_DELETE',
    entity: 'Coupon',
    entityId: coupon._id,
    details: { code: coupon.code },
    req,
  });

  return res.status(200).json(new ApiResponse(200, { id }, 'Coupon deleted'));
});

// ==========================================
// 7. BANNERS MANAGEMENT
// ==========================================

export const getBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, banners, 'Banners retrieved'));
});

export const createBanner = asyncHandler(async (req, res) => {
  const { title, subtitle, imageUrl, linkUrl, badge, displayOrder, isActive } = req.body;
  if (!title || !imageUrl) throw new ApiError(400, 'Banner title and image URL are required');

  const banner = await Banner.create({
    title,
    subtitle,
    imageUrl,
    linkUrl: linkUrl || '/products',
    badge: badge || 'PROMO',
    displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
    isActive: isActive !== undefined ? isActive : true,
  });

  await logAdminAction({
    adminId: req.user._id,
    action: 'BANNER_CREATE',
    entity: 'Banner',
    entityId: banner._id,
    details: { title: banner.title },
    req,
  });

  return res.status(201).json(new ApiResponse(201, banner, 'Banner created'));
});

export const updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const banner = await Banner.findByIdAndUpdate(id, req.body, { new: true });
  if (!banner) throw new ApiError(404, 'Banner not found');

  await logAdminAction({
    adminId: req.user._id,
    action: 'BANNER_UPDATE',
    entity: 'Banner',
    entityId: banner._id,
    details: req.body,
    req,
  });

  return res.status(200).json(new ApiResponse(200, banner, 'Banner updated'));
});

export const deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const banner = await Banner.findByIdAndDelete(id);
  if (!banner) throw new ApiError(404, 'Banner not found');

  await logAdminAction({
    adminId: req.user._id,
    action: 'BANNER_DELETE',
    entity: 'Banner',
    entityId: banner._id,
    details: { title: banner.title },
    req,
  });

  return res.status(200).json(new ApiResponse(200, { id }, 'Banner deleted'));
});

// ==========================================
// 8. AUDIT LOGS
// ==========================================

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, entity = 'all', action = 'all' } = req.query;

  const filter = {};
  if (entity !== 'all') filter.entity = entity;
  if (action !== 'all') filter.action = action;

  const p = Math.max(1, parseInt(page, 10));
  const l = Math.max(1, parseInt(limit, 10));

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('admin', 'name email role')
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l),
    AuditLog.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        logs,
        total,
        page: p,
        totalPages: Math.ceil(total / l) || 1,
      },
      'Audit logs fetched'
    )
  );
});

// ==========================================
// 9. EXPORT REPORTS TO CSV
// ==========================================

/**
 * @desc    Export dynamic CSV data reports
 * @route   GET /api/admin/export/csv
 * @access  Admin Only
 */
export const exportCsvReport = asyncHandler(async (req, res) => {
  const { type = 'orders' } = req.query; // 'orders' | 'revenue' | 'users' | 'partners'

  let csvContent = '';
  const nowStr = new Date().toISOString().replace(/[:.]/g, '-');
  let filename = `crave-${type}-${nowStr}.csv`;

  if (type === 'orders') {
    const orders = await Order.find()
      .populate('customer', 'name email phone')
      .populate('deliveryPartner', 'name phone')
      .sort({ createdAt: -1 });

    const headers = [
      'Order Number',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Items Count',
      'Subtotal',
      'Tax',
      'Delivery Fee',
      'Discount',
      'Grand Total',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Courier Name',
      'Date Placed',
    ];

    const rows = orders.map((o) => [
      escapeCsv(o.orderNumber),
      escapeCsv(o.customer?.name || 'Guest'),
      escapeCsv(o.customer?.email || ''),
      escapeCsv(o.customer?.phone || ''),
      escapeCsv(o.items?.length || 0),
      escapeCsv(o.totals?.itemTotal?.toFixed(2) || '0.00'),
      escapeCsv(o.totals?.tax?.toFixed(2) || '0.00'),
      escapeCsv(o.totals?.deliveryFee?.toFixed(2) || '0.00'),
      escapeCsv(o.totals?.couponDiscount?.toFixed(2) || '0.00'),
      escapeCsv(o.totals?.grandTotal?.toFixed(2) || '0.00'),
      escapeCsv(o.paymentMethod),
      escapeCsv(o.paymentStatus),
      escapeCsv(o.status),
      escapeCsv(o.deliveryPartner?.name || 'Unassigned'),
      escapeCsv(new Date(o.createdAt).toLocaleString()),
    ]);

    csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  } else if (type === 'users') {
    const users = await User.find().select('-password -refreshToken').sort({ createdAt: -1 });
    const headers = ['User ID', 'Name', 'Email', 'Phone', 'Role', 'Active', 'Email Verified', 'Created At'];
    const rows = users.map((u) => [
      escapeCsv(u._id),
      escapeCsv(u.name),
      escapeCsv(u.email),
      escapeCsv(u.phone || 'N/A'),
      escapeCsv(u.role),
      escapeCsv(u.isActive ? 'Active' : 'Blocked'),
      escapeCsv(u.isEmailVerified ? 'Yes' : 'No'),
      escapeCsv(new Date(u.createdAt).toLocaleString()),
    ]);
    csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  } else if (type === 'partners') {
    const partners = await DeliveryPartnerProfile.find()
      .populate('user', 'name email phone isActive')
      .sort({ createdAt: -1 });

    const headers = [
      'Partner Name',
      'Email',
      'Phone',
      'Vehicle Type',
      'Vehicle Plate',
      'Vehicle Model',
      'Online Status',
      'KYC Status',
      'KYC Verified',
      'Deliveries Completed',
      'Total Earnings',
      'Rating',
    ];

    const rows = partners.map((p) => [
      escapeCsv(p.user?.name || 'N/A'),
      escapeCsv(p.user?.email || 'N/A'),
      escapeCsv(p.user?.phone || 'N/A'),
      escapeCsv(p.vehicle?.type || 'bike'),
      escapeCsv(p.vehicle?.plateNumber || 'N/A'),
      escapeCsv(p.vehicle?.model || 'N/A'),
      escapeCsv(p.isOnline ? 'Online' : 'Offline'),
      escapeCsv(p.documents?.status || 'pending'),
      escapeCsv(p.documents?.verified ? 'Verified' : 'Unverified'),
      escapeCsv(p.earnings?.deliveriesCompleted || 0),
      escapeCsv((p.earnings?.total || 0).toFixed(2)),
      escapeCsv((p.rating?.average || 5.0).toFixed(1)),
    ]);

    csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  } else if (type === 'revenue') {
    const orders = await Order.find({ paymentStatus: 'paid' }).sort({ createdAt: -1 });
    const headers = [
      'Order Number',
      'Item Subtotal',
      'Tax Collected',
      'Delivery Fee',
      'Discount Subsidized',
      'Net Revenue',
      'Payment Method',
      'Payment ID',
      'Timestamp',
    ];

    const rows = orders.map((o) => [
      escapeCsv(o.orderNumber),
      escapeCsv(o.totals?.itemTotal?.toFixed(2) || '0.00'),
      escapeCsv(o.totals?.tax?.toFixed(2) || '0.00'),
      escapeCsv(o.totals?.deliveryFee?.toFixed(2) || '0.00'),
      escapeCsv(o.totals?.couponDiscount?.toFixed(2) || '0.00'),
      escapeCsv(o.totals?.grandTotal?.toFixed(2) || '0.00'),
      escapeCsv(o.paymentMethod),
      escapeCsv(o.paymentId || 'N/A'),
      escapeCsv(new Date(o.createdAt).toLocaleString()),
    ]);

    csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  } else {
    throw new ApiError(400, `Unknown export type '${type}'`);
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csvContent);
});

/**
 * @desc    Purge all orders, payments, reviews, and reset delivery fleet to 0
 * @route   DELETE /api/admin/orders/purge-all
 * @access  Admin Only
 */
export const purgeOrdersAndDeliveryData = asyncHandler(async (req, res) => {
  await Promise.all([
    Order.deleteMany({}),
    Payment.deleteMany({}),
    Review.deleteMany({}),
    Notification.deleteMany({}),
    Cart.deleteMany({}),
    AuditLog.deleteMany({ entity: 'Order' }),
  ]);

  await DeliveryPartnerProfile.updateMany(
    {},
    {
      $set: {
        activeOrder: null,
        isAvailable: true,
        'earnings.today': 0,
        'earnings.thisWeek': 0,
        'earnings.total': 0,
        'earnings.deliveriesCompleted': 0,
        'rating.average': 5.0,
        'rating.count': 0,
      },
    }
  );

  await logAdminAction({
    adminId: req.user._id,
    action: 'PURGE_ORDERS_AND_DELIVERIES',
    entity: 'Order',
    entityId: req.user._id,
    details: { message: 'All orders, payments, and delivery partner stats wiped clean.' },
    req,
  });

  return res.status(200).json(
    new ApiResponse(200, { success: true }, 'All order and delivery data purged. Admin is now clean from scratch.')
  );
});
