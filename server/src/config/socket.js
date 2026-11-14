import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from './env.js';
import { DeliveryPartnerProfile } from '../models/DeliveryPartnerProfile.model.js';

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
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

    // 3. Join Order Room (Customer, Rider, Store, Admin)
    socket.on('order:join', (orderId) => {
      if (orderId) {
        const room = `order:${orderId}`;
        socket.join(room);
        console.log(`[SOCKET ROOM] ${socket.id} joined room ${room}`);
      }
    });

    // 4. Leave Order Room
    socket.on('order:leave', (orderId) => {
      if (orderId) {
        const room = `order:${orderId}`;
        socket.leave(room);
        console.log(`[SOCKET ROOM] ${socket.id} left room ${room}`);
      }
    });

    // 5. Rider Real-Time GPS Location Stream
    socket.on('rider:location_update', async (data) => {
      const { orderId, coordinates, heading = 0, speed = 0 } = data || {};
      if (!orderId || !coordinates || !Array.isArray(coordinates)) return;

      const locationPayload = {
        orderId,
        coordinates, // [lng, lat]
        heading,
        speed,
        timestamp: new Date().toISOString(),
        riderId: socket.user?._id || null,
        riderName: socket.user?.name || 'Crave Courier',
      };

      // Broadcast moving GPS pin to the order room (Customer live map updates)
      io.to(`order:${orderId}`).emit('order:location_update', locationPayload);

      // Persist rider's last known location to DeliveryPartnerProfile if rider is authenticated
      if (socket.user?._id) {
        try {
          await DeliveryPartnerProfile.findOneAndUpdate(
            { user: socket.user._id },
            {
              currentLocation: {
                type: 'Point',
                coordinates,
              },
              isOnline: true,
            }
          );
        } catch (err) {
          console.warn(`[SOCKET LOCATION] Failed to persist partner location: ${err.message}`);
        }
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

