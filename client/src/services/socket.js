import { io } from 'socket.io-client';

export const LIVE_BACKEND_URL = 'https://cravecourier-v2.onrender.com';

const getSocketUrl = () => {
  // 1. If running inside native Android/iOS Capacitor app, connect to the live cloud backend
  if (
    typeof window !== 'undefined' &&
    (window.Capacitor?.isNativePlatform() ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'ionic:' ||
      (window.location.hostname === 'localhost' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')))
  ) {
    return LIVE_BACKEND_URL;
  }

  let url = (
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).trim();

  // If pointing to outdated host, redirect to live Render deployment
  if (url.includes('cravecourier-api.onrender.com')) {
    return LIVE_BACKEND_URL;
  }

  if (import.meta.env.PROD && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    return LIVE_BACKEND_URL;
  }

  if (url) {
    return url.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  return LIVE_BACKEND_URL;
};

const SOCKET_URL = getSocketUrl();

let socket = null;

/**
 * Get or initialize socket connection
 */
export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[SOCKET] Connected to real-time server with ID:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[SOCKET] Connection warning:', err.message);
    });
  }
  return socket;
};

/**
 * Connect socket with explicit JWT token
 */
export const connectSocket = (token) => {
  if (socket) {
    const prevToken = socket.auth?.token;
    if (token && prevToken !== token) {
      socket.auth = { token };
      if (socket.connected) {
        socket.disconnect();
      }
      socket.connect();
    } else if (!socket.connected) {
      if (token) socket.auth = { token };
      socket.connect();
    }
    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: true,
    withCredentials: true,
    auth: token ? { token } : undefined,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[SOCKET] Connected to real-time server with ID:', socket.id);
  });

  return socket;
};

/**
 * Disconnect socket on user logout
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Join an order tracking room
 */
export const joinOrderRoom = (orderId) => {
  if (!orderId) return;
  const s = getSocket();
  s.emit('order:join', orderId);
};

/**
 * Leave an order tracking room
 */
export const leaveOrderRoom = (orderId) => {
  if (!orderId) return;
  const s = getSocket();
  s.emit('order:leave', orderId);
};

/**
 * Delivery partner streams GPS location update
 */
export const emitRiderLocation = ({ orderId, coordinates, heading, speed }) => {
  if (!orderId || !coordinates) return;
  const s = getSocket();
  s.emit('rider:location_update', { orderId, coordinates, heading, speed });
};

export default {
  getSocket,
  connectSocket,
  disconnectSocket,
  joinOrderRoom,
  leaveOrderRoom,
  emitRiderLocation,
};

