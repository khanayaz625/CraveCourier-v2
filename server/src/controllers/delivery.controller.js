import { DeliveryPartnerProfile } from '../models/DeliveryPartnerProfile.model.js';
import { Order } from '../models/Order.model.js';
import { User } from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getIO } from '../config/socket.js';
import { pushOrderStatusNotification } from '../services/notification.service.js';

// Downtown Springfield Hub coordinates
const STORE_HUB_COORDINATES = [-89.6504, 39.7817];

/**
 * Helper: Find or auto-initialize Delivery Partner Profile
 */
const getOrCreatePartnerProfile = async (userId) => {
  let profile = await DeliveryPartnerProfile.findOne({ user: userId }).populate({
    path: 'activeOrder',
    populate: { path: 'customer', select: 'name phone avatar' },
  });

  if (!profile) {
    profile = await DeliveryPartnerProfile.create({
      user: userId,
      isOnline: true,
      isAvailable: true,
      currentLocation: {
        type: 'Point',
        coordinates: STORE_HUB_COORDINATES,
      },
      vehicle: {
        type: 'scooter',
        plateNumber: 'CRV-8941',
        model: 'Vespa Elettrica 2024',
      },
      documents: {
        licenseNumber: 'IL-DL-9842104',
        verified: true,
        status: 'approved',
      },
      earnings: {
        today: 48.5,
        thisWeek: 342.0,
        total: 1840.0,
        deliveriesCompleted: 116,
      },
    });
  }

  return profile;
};

/**
 * @desc    Get Current Delivery Partner Profile & Active Dispatch
 * @route   GET /api/delivery/profile
 * @access  Private (Delivery / Admin)
 */
export const getDeliveryProfile = asyncHandler(async (req, res) => {
  const profile = await getOrCreatePartnerProfile(req.user._id);

  // If active order present, populate full snapshot details
  let activeOrder = null;
  if (profile.activeOrder) {
    activeOrder = await Order.findById(profile.activeOrder)
      .populate('customer', 'name phone avatar');
  }

  return res.status(200).json(
    new ApiResponse(200, {
      profile,
      activeOrder,
    }, 'Delivery partner profile loaded')
  );
});

/**
 * @desc    Toggle Online / Offline Duty Status
 * @route   PATCH /api/delivery/status
 * @access  Private (Delivery)
 */
export const toggleDutyStatus = asyncHandler(async (req, res) => {
  const { isOnline } = req.body;

  const profile = await getOrCreatePartnerProfile(req.user._id);
  profile.isOnline = Boolean(isOnline);
  profile.isAvailable = Boolean(isOnline);
  await profile.save();

  return res.status(200).json(
    new ApiResponse(200, profile, `Duty status changed to ${profile.isOnline ? 'Online' : 'Offline'}`)
  );
});

/**
 * @desc    Update Rider Current GPS Location Telemetry
 * @route   PATCH /api/delivery/location
 * @access  Private (Delivery)
 */
export const updateGpsLocation = asyncHandler(async (req, res) => {
  const { coordinates, heading = 0, speed = 0 } = req.body;

  if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new ApiError(400, 'Valid GPS coordinates [longitude, latitude] required');
  }

  const profile = await DeliveryPartnerProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      currentLocation: {
        type: 'Point',
        coordinates,
      },
    },
    { new: true, upsert: true }
  );

  // If rider has an active order, stream telemetry to order room
  if (profile.activeOrder) {
    try {
      const io = getIO();
      io.to(`order:${profile.activeOrder}`).emit('order:location_update', {
        orderId: profile.activeOrder,
        coordinates,
        heading,
        speed,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // socket io non-blocking
    }
  }

  return res.status(200).json(
    new ApiResponse(200, { coordinates }, 'Location updated')
  );
});

/**
 * @desc    Get Available Orders Ready for Pickup (or assigned to this partner)
 * @route   GET /api/delivery/available-orders
 * @access  Private (Delivery)
 */
export const getAvailableOrders = asyncHandler(async (req, res) => {
  // Find orders that are ready for pickup and unassigned, or assigned to this rider
  const orders = await Order.find({
    status: { $in: ['ready', 'picked_up', 'out_for_delivery'] },
    $or: [
      { deliveryPartner: req.user._id },
      { deliveryPartner: null },
    ],
  })
    .sort({ createdAt: -1 })
    .populate('customer', 'name phone avatar');

  return res.status(200).json(
    new ApiResponse(200, orders, 'Available dispatches fetched')
  );
});

/**
 * @desc    Accept Incoming Order Request (via 30-sec timer or queue)
 * @route   POST /api/delivery/orders/:id/accept
 * @access  Private (Delivery)
 */
export const acceptOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.deliveryPartner && order.deliveryPartner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, 'Order has already been accepted by another delivery partner');
  }

  // Assign to this partner
  order.deliveryPartner = req.user._id;
  if (order.status === 'placed' || order.status === 'confirmed') {
    order.status = 'ready';
  }
  order.statusTimeline.push({
    status: order.status,
    timestamp: new Date(),
    note: `Delivery request accepted by ${req.user.name}`,
  });
  await order.save();

  // Update partner activeOrder
  const profile = await getOrCreatePartnerProfile(req.user._id);
  profile.activeOrder = order._id;
  await profile.save();

  // Push notification to customer
  await pushOrderStatusNotification(order, 'ready', `Courier ${req.user.name} is heading to the store.`);

  // Emit socket event
  try {
    const io = getIO();
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name phone avatar')
      .populate('deliveryPartner', 'name phone avatar');

    io.to(`order:${order._id}`).emit('order:status_updated', {
      order: populatedOrder,
      status: order.status,
      note: `Delivery partner ${req.user.name} assigned`,
    });
  } catch (err) {
    console.warn(`[SOCKET ERROR] ${err.message}`);
  }

  return res.status(200).json(
    new ApiResponse(200, { order, profile }, 'Order accepted successfully')
  );
});

/**
 * @desc    Decline / Reject Incoming Order Request (Timer expired or manually declined)
 * @route   POST /api/delivery/orders/:id/reject
 * @access  Private (Delivery)
 */
export const rejectOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  if (order && order.deliveryPartner?.toString() === req.user._id.toString()) {
    order.deliveryPartner = null;
    await order.save();
  }

  const profile = await getOrCreatePartnerProfile(req.user._id);
  if (profile.activeOrder?.toString() === id) {
    profile.activeOrder = null;
    await profile.save();
  }

  return res.status(200).json(
    new ApiResponse(200, { rejected: true }, 'Order declined. Searching for next courier.')
  );
});

/**
 * @desc    Mark Order Picked Up from Store
 * @route   PATCH /api/delivery/orders/:id/pickup
 * @access  Private (Delivery)
 */
export const pickupOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (
    req.user.role === 'delivery' &&
    order.deliveryPartner &&
    order.deliveryPartner.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, 'This order is assigned to another delivery partner');
  }
  if (!order.deliveryPartner && req.user.role === 'delivery') {
    order.deliveryPartner = req.user._id;
  }

  order.status = 'picked_up';
  order.statusTimeline.push({
    status: 'picked_up',
    timestamp: new Date(),
    note: `Courier ${req.user.name} collected package from hub`,
  });
  await order.save();

  await pushOrderStatusNotification(order, 'picked_up');

  try {
    const io = getIO();
    const populated = await Order.findById(order._id)
      .populate('customer', 'name phone avatar')
      .populate('deliveryPartner', 'name phone avatar');

    io.to(`order:${order._id}`).emit('order:status_updated', {
      order: populated,
      status: 'picked_up',
    });
  } catch {}

  return res.status(200).json(
    new ApiResponse(200, order, 'Order marked as picked up from store')
  );
});

/**
 * @desc    Mark Order Out for Delivery (Rider en route to customer)
 * @route   PATCH /api/delivery/orders/:id/out-for-delivery
 * @access  Private (Delivery)
 */
export const startOutForDelivery = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (
    req.user.role === 'delivery' &&
    order.deliveryPartner?.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, 'Only the assigned delivery partner can start delivery for this order');
  }

  order.status = 'out_for_delivery';
  order.statusTimeline.push({
    status: 'out_for_delivery',
    timestamp: new Date(),
    note: `Courier ${req.user.name} is on the way to delivery address`,
  });
  await order.save();

  await pushOrderStatusNotification(order, 'out_for_delivery');

  try {
    const io = getIO();
    const populated = await Order.findById(order._id)
      .populate('customer', 'name phone avatar')
      .populate('deliveryPartner', 'name phone avatar');

    io.to(`order:${order._id}`).emit('order:status_updated', {
      order: populated,
      status: 'out_for_delivery',
    });
  } catch {}

  return res.status(200).json(
    new ApiResponse(200, order, 'Order is now out for delivery')
  );
});

/**
 * @desc    Complete Delivery with Customer OTP Verification
 * @route   POST /api/delivery/orders/:id/complete
 * @access  Private (Delivery)
 */
export const completeDeliveryWithOtp = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { otp } = req.body;

  if (!otp) {
    throw new ApiError(400, 'Customer 4-digit OTP code is required to complete delivery');
  }

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (
    req.user.role === 'delivery' &&
    order.deliveryPartner?.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, 'Only the assigned delivery partner can complete this delivery');
  }

  if (!order.deliveryOtp) {
    throw new ApiError(400, 'Delivery OTP is not configured for this order');
  }

  // Verify OTP matches
  if (otp.toString().trim() !== order.deliveryOtp.toString().trim()) {
    throw new ApiError(
      400,
      `Invalid Delivery PIN. Please ask the customer to confirm the 4-digit OTP shown on their Crave screen.`
    );
  }

  // Mark delivered
  order.status = 'delivered';
  order.deliveredAt = new Date();
  if (order.paymentMethod === 'cod') {
    order.paymentStatus = 'paid';
  }
  order.statusTimeline.push({
    status: 'delivered',
    timestamp: new Date(),
    note: `Delivery confirmed and verified via customer OTP (${otp})`,
  });
  await order.save();

  // Credit delivery partner earnings (Standard payout: $5.50 base + $1.00 distance bonus = $6.50)
  const tripPayout = 6.5;
  const profile = await getOrCreatePartnerProfile(req.user._id);
  profile.earnings.today = Math.round((profile.earnings.today + tripPayout) * 100) / 100;
  profile.earnings.thisWeek = Math.round((profile.earnings.thisWeek + tripPayout) * 100) / 100;
  profile.earnings.total = Math.round((profile.earnings.total + tripPayout) * 100) / 100;
  profile.earnings.deliveriesCompleted += 1;
  profile.activeOrder = null;
  await profile.save();

  // Notify customer
  await pushOrderStatusNotification(order, 'delivered');

  try {
    const io = getIO();
    const populated = await Order.findById(order._id)
      .populate('customer', 'name phone avatar')
      .populate('deliveryPartner', 'name phone avatar');

    io.to(`order:${order._id}`).emit('order:status_updated', {
      order: populated,
      status: 'delivered',
    });
    io.to(`order:${order._id}`).emit('order:delivered', { orderId: order._id });
  } catch {}

  return res.status(200).json(
    new ApiResponse(200, {
      order,
      earningsEarned: tripPayout,
      profile,
    }, 'Delivery successfully verified and completed! Payout credited.')
  );
});

/**
 * @desc    Auto-Assign Nearest Online Partner via MongoDB Geospatial ($near)
 * @route   POST /api/delivery/auto-assign/:orderId
 * @access  Private (Admin / Internal)
 */
export const autoAssignNearestPartner = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // MongoDB Geospatial $near query on 2dsphere index
  const nearestPartner = await DeliveryPartnerProfile.findOne({
    isOnline: true,
    activeOrder: null,
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: STORE_HUB_COORDINATES,
        },
        $maxDistance: 15000, // 15 km perimeter
      },
    },
  }).populate('user', 'name phone avatar');

  if (!nearestPartner) {
    return res.status(200).json(
      new ApiResponse(200, { assigned: false }, 'No available delivery partners within 15km')
    );
  }

  // Send incoming 30-second accept request to the partner via Socket.io
  try {
    const io = getIO();
    io.to(`user:${nearestPartner.user._id}`).emit('order:incoming_request', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      itemCount: order.items.length,
      estimatedPayout: 6.5,
      pickup: {
        name: 'Springfield Downtown Hub',
        address: '100 Main Street, Springfield, IL',
        coordinates: STORE_HUB_COORDINATES,
      },
      drop: {
        address: `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`,
        coordinates: order.deliveryAddress.coordinates?.coordinates || [-89.6385, 39.7925],
      },
      countdownSeconds: 30,
    });
  } catch {}

  return res.status(200).json(
    new ApiResponse(200, {
      assigned: true,
      partner: nearestPartner.user.name,
      partnerId: nearestPartner.user._id,
    }, `Dispatched incoming request to nearest partner: ${nearestPartner.user.name}`)
  );
});

/**
 * @desc    Get Detailed Earnings Breakdown & Delivery History
 * @route   GET /api/delivery/earnings
 * @access  Private (Delivery)
 */
export const getEarningsHistory = asyncHandler(async (req, res) => {
  const profile = await getOrCreatePartnerProfile(req.user._id);

  // Fetch completed orders delivered by this partner
  const completedOrders = await Order.find({
    deliveryPartner: req.user._id,
    status: 'delivered',
  })
    .sort({ deliveredAt: -1 })
    .limit(30)
    .select('orderNumber deliveredAt totals deliveryAddress');

  const formattedTrips = completedOrders.map((o) => ({
    orderId: o._id,
    orderNumber: o.orderNumber,
    deliveredAt: o.deliveredAt,
    payout: 6.5, // Standard trip payout
    tip: 1.5,
    city: o.deliveryAddress?.city || 'Springfield',
    street: o.deliveryAddress?.street || 'Delivery Address',
  }));

  // Weekly daily breakdown (Mon -> Sun)
  const weeklyBreakdown = [
    { day: 'Mon', trips: 4, earnings: 26.0 },
    { day: 'Tue', trips: 6, earnings: 42.0 },
    { day: 'Wed', trips: 5, earnings: 35.5 },
    { day: 'Thu', trips: 7, earnings: 49.0 },
    { day: 'Fri', trips: 8, earnings: 62.0 },
    { day: 'Sat', trips: 10, earnings: 78.5 },
    { day: 'Sun (Today)', trips: Math.floor(profile.earnings.today / 6.5), earnings: profile.earnings.today },
  ];

  return res.status(200).json(
    new ApiResponse(200, {
      earnings: profile.earnings,
      weeklyBreakdown,
      recentTrips: formattedTrips,
    }, 'Earnings history retrieved')
  );
});

/**
 * @desc    Update Vehicle & KYC Information
 * @route   PATCH /api/delivery/kyc
 * @access  Private (Delivery)
 */
export const updateKycProfile = asyncHandler(async (req, res) => {
  const { vehicleType, model, plateNumber, licenseNumber, licenseUrl, idCardUrl } = req.body;

  const profile = await getOrCreatePartnerProfile(req.user._id);

  if (vehicleType) profile.vehicle.type = vehicleType;
  if (model) profile.vehicle.model = model;
  if (plateNumber) profile.vehicle.plateNumber = plateNumber;

  if (licenseNumber) profile.documents.licenseNumber = licenseNumber;
  if (licenseUrl) profile.documents.licenseUrl = licenseUrl;
  if (idCardUrl) profile.documents.idCardUrl = idCardUrl;

  await profile.save();

  return res.status(200).json(
    new ApiResponse(200, profile, 'Vehicle and KYC details updated successfully')
  );
});

