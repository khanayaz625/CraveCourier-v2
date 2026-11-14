import { Notification } from '../models/Notification.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Get Current User's Notifications
 * @route   GET /api/notifications
 * @access  Private
 */
export const getMyNotifications = asyncHandler(async (req, res) => {
  const { limit = 25 } = req.query;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10)),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      notifications,
      unreadCount,
    }, 'Notifications fetched successfully')
  );
});

/**
 * @desc    Mark Single Notification as Read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
export const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { read: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return res.status(200).json(
    new ApiResponse(200, notification, 'Notification marked as read')
  );
});

/**
 * @desc    Mark All User Notifications as Read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true } }
  );

  return res.status(200).json(
    new ApiResponse(200, { success: true }, 'All notifications marked as read')
  );
});

/**
 * @desc    Delete Single Notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findOneAndDelete({
    _id: id,
    user: req.user._id,
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return res.status(200).json(
    new ApiResponse(200, { id }, 'Notification deleted successfully')
  );
});

/**
 * @desc    Register Device FCM / Web Push Token
 * @route   POST /api/notifications/fcm-token
 * @access  Private
 */
export const registerFcmToken = asyncHandler(async (req, res) => {
  const { token, device = 'Web Browser PWA' } = req.body;

  if (!token) {
    throw new ApiError(400, 'Push notification token is required');
  }

  const user = req.user;
  const existingIndex = user.fcmTokens.findIndex((t) => t.token === token);

  if (existingIndex > -1) {
    user.fcmTokens[existingIndex].device = device;
    user.fcmTokens[existingIndex].createdAt = new Date();
  } else {
    user.fcmTokens.push({ token, device });
  }

  await user.save();

  return res.status(200).json(
    new ApiResponse(200, { registered: true, totalDevices: user.fcmTokens.length }, 'Push token registered successfully')
  );
});

/**
 * @desc    Unregister Device FCM Token
 * @route   DELETE /api/notifications/fcm-token
 * @access  Private
 */
export const unregisterFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ApiError(400, 'Push notification token is required');
  }

  req.user.fcmTokens = req.user.fcmTokens.filter((t) => t.token !== token);
  await req.user.save();

  return res.status(200).json(
    new ApiResponse(200, { unregistered: true }, 'Push token removed successfully')
  );
});

/**
 * @desc    Send Simulated Order Push Notification
 * @route   POST /api/notifications/test-push
 * @access  Private
 */
export const sendTestPushNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.create({
    user: req.user._id,
    title: 'Order Status: Out for Delivery 🚀',
    message: 'Your Crave order #CRV-894101 is on its way with live GPS rider tracking!',
    type: 'order_update',
    data: {
      orderId: 'CRV-894101',
      status: 'out_for_delivery',
      timestamp: new Date().toISOString(),
    },
  });

  return res.status(200).json(
    new ApiResponse(200, notification, 'Test push notification dispatched successfully')
  );
});

