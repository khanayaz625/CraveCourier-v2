import { Notification } from '../models/Notification.model.js';
import { getIO } from '../config/socket.js';

const STATUS_MESSAGES = {
  placed: {
    title: 'Order Placed 🛍️',
    message: (num) => `Your order #${num} has been received and registered.`,
  },
  confirmed: {
    title: 'Order Confirmed ✅',
    message: (num) => `Payment confirmed! The store has accepted order #${num}.`,
  },
  preparing: {
    title: 'Cooking in Progress 🍳',
    message: (num) => `The kitchen is freshly preparing your items for order #${num}.`,
  },
  ready: {
    title: 'Order Ready for Pickup 📦',
    message: (num) => `Order #${num} is packed and ready for delivery partner collection.`,
  },
  picked_up: {
    title: 'Order Picked Up 🛵',
    message: (num) => `Your courier has picked up order #${num} from the store.`,
  },
  out_for_delivery: {
    title: 'Out for Delivery 🚀',
    message: (num) => `Your delivery partner is en route to your address with order #${num}!`,
  },
  delivered: {
    title: 'Order Delivered 🎉',
    message: (num) => `Order #${num} has been delivered! Enjoy your meal & rate your experience.`,
  },
  cancelled: {
    title: 'Order Cancelled ⚠️',
    message: (num, note) => `Order #${num} was cancelled. ${note || ''}`,
  },
  refunded: {
    title: 'Refund Processed 💳',
    message: (num) => `Full refund for order #${num} has been sent to your original payment method.`,
  },
};

/**
 * Creates a notification in the database and pushes real-time socket notification to the user
 */
export const pushOrderStatusNotification = async (order, status, customNote) => {
  if (!order || !order.customer) return null;

  const config = STATUS_MESSAGES[status] || {
    title: `Order Update: ${status}`,
    message: (num) => `Order #${num} status changed to ${status}.`,
  };

  const title = config.title;
  const message = config.message(order.orderNumber, customNote);

  try {
    // 1. Persist notification in MongoDB
    const notification = await Notification.create({
      user: order.customer._id || order.customer,
      title,
      message,
      type: 'order_update',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status,
        timestamp: new Date().toISOString(),
      },
    });

    // 2. Push real-time event to the specific user's room via Socket.io
    try {
      const io = getIO();
      const customerId = (order.customer._id || order.customer).toString();
      io.to(`user:${customerId}`).emit('notification:new', notification);
    } catch (socketErr) {
      console.warn(`[SOCKET PUSH WARNING] Socket push failed: ${socketErr.message}`);
    }

    return notification;
  } catch (err) {
    console.error(`[NOTIFICATION ERROR] Failed to create notification: ${err.message}`);
    return null;
  }
};

/**
 * Directly sends a targeted notification to any user and emits socket event
 */
export const pushDirectNotification = async (userId, { title, message, type = 'system', data = {} }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      data,
    });

    try {
      const io = getIO();
      io.to(`user:${userId.toString()}`).emit('notification:new', notification);
    } catch (socketErr) {
      console.warn(`[SOCKET PUSH WARNING] Socket push failed: ${socketErr.message}`);
    }

    return notification;
  } catch (err) {
    console.error(`[DIRECT_NOTIFICATION_ERROR] ${err.message}`);
    return null;
  }
};
