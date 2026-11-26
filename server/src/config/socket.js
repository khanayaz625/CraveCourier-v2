import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV, isOriginAllowed } from './env.js';
import { DeliveryPartnerProfile } from '../models/DeliveryPartnerProfile.model.js';
import { Order } from '../models/Order.model.js';

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    let token = null;

    // 1. From handshake auth object
    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    }
    // 2. From authorization header
    else if (socket.handshake.headers.authorization) {
      const parts = socket.handshake.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }
    // 3. From cookies
    else if (socket.handshake.headers.cookie) {
      const match = socket.handshake.headers.cookie.match(/crave_accessToken=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET);
        socket.user = decoded;
      } catch (err) {
        console.warn(`[SOCKET AUTH] Token invalid or expired: ${err.message}`);
        socket.user = null;
      }
    } else {
      socket.user = null;
    }

    // Allow connection (unauthenticated sockets can still join public tracking rooms)
    next();
  });

  io.on('connection', (socket) => {
    const userRole = socket.user?.role || 'guest';
    const userId = socket.user?._id || 'anonymous';
    console.log(`[SOCKET CONNECTED] Socket ID: ${socket.id} | User: ${userId} (${userRole})`);

    // 1. Auto-join user room for direct push notifications
    if (socket.user?._id) {
      socket.join(`user:${socket.user._id}`);
    }

    // 2. Auto-join role-specific broadcast rooms
    if (socket.user?.role === 'delivery') {
      socket.join('riders');
    }
    if (socket.user?.role === 'admin') {
      socket.join('admins');
    }

    // 3. Join Order Room (Authorized Customer owner, Assigned Rider, or Admin)
    socket.on('order:join', async (orderId) => {
      if (!orderId || !socket.user?._id) return;
      try {
        const order = await Order.findById(orderId).select('customer deliveryPartner status');
        if (!order) return;

        const userIdStr = String(socket.user._id);
        const isOwner = order.customer?.toString() === userIdStr;
        const isAssignedRider = order.deliveryPartner?.toString() === userIdStr;
        const isAdmin = socket.user.role === 'admin';
        const isOpenDelivery = socket.user.role === 'delivery' && order.status === 'ready' && !order.deliveryPartner;

        if (!isOwner && !isAssignedRider && !isAdmin && !isOpenDelivery) {
          return;
        }

        const room = `order:${orderId}`;
        socket.join(room);
        console.info(`[SOCKET ROOM] ${socket.id} joined room ${room}`);
      } catch (err) {
        console.warn(`[SOCKET ROOM] Failed to verify order room access: ${err.message}`);
      }
    });

    // 4. Leave Order Room
    socket.on('order:leave', (orderId) => {
      if (orderId) {
        const room = `order:${orderId}`;
        socket.leave(room);
        console.info(`[SOCKET ROOM] ${socket.id} left room ${room}`);
      }
    });

    // 5. Rider Real-Time GPS Location Stream (Authenticated Delivery Partner / Admin only)
    socket.on('rider:location_update', async (data) => {
      if (!socket.user?._id || !['delivery', 'admin'].includes(socket.user.role)) {
        return;
      }

      const { orderId, coordinates, heading = 0, speed = 0 } = data || {};
      if (
        !orderId ||
        !Array.isArray(coordinates) ||
        coordinates.length !== 2 ||
        !Number.isFinite(Number(coordinates[0])) ||
        !Number.isFinite(Number(coordinates[1]))
      ) {
        return;
      }

      if (socket.user.role === 'delivery') {
        const order = await Order.findById(orderId).select('deliveryPartner');
        if (!order || order.deliveryPartner?.toString() !== String(socket.user._id)) {
          return;
        }
      }

      const cleanCoords = [Number(coordinates[0]), Number(coordinates[1])];

      const locationPayload = {
        orderId,
        coordinates: cleanCoords, // [lng, lat]
        heading,
        speed,
        timestamp: new Date().toISOString(),
        riderId: socket.user._id,
        riderName: socket.user.name || 'Crave Courier',
      };

      // Broadcast moving GPS pin to the order room (Customer live map updates)
      io.to(`order:${orderId}`).emit('order:location_update', locationPayload);

      // Persist rider's last known location to DeliveryPartnerProfile
      try {
        await DeliveryPartnerProfile.findOneAndUpdate(
          { user: socket.user._id },
          {
            currentLocation: {
              type: 'Point',
              coordinates: cleanCoords,
            },
            isOnline: true,
          }
        );
      } catch (err) {
        console.warn(`[SOCKET LOCATION] Failed to persist partner location: ${err.message}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET DISCONNECTED] Socket ID: ${socket.id} (${reason})`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocket(httpServer) first.');
  }
  return io;
};

