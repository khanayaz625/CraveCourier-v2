import { io } from 'socket.io-client';

const getSocketUrl = () => {
  let url = (
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).trim();

  // If pointing to the outdated 'cravecourier-api' host, redirect to the live Render deployment
  if (url.includes('cravecourier-api.onrender.com')) {
    url = 'https://cravecourier-v2-1.onrender.com';
  }

  if (url) {
    return url.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  if (
    typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  ) {
    return 'https://cravecourier-v2-1.onrender.com';
  }
  return 'http://localhost:5000';
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
    if (token) {
      socket.auth = { token };
    }
    if (!socket.connected) {
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

