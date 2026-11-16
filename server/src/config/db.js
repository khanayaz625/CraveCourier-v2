import dns from 'dns';
import mongoose from 'mongoose';
import { ENV } from './env.js';

// Resolve DNS SRV lookups reliably across platforms (Atlas mongodb+srv)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    console.info('[MongoDB] Using existing database connection.');
    return;
  }

  try {
    const conn = await mongoose.connect(ENV.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: ENV.NODE_ENV !== 'production',
    });

    isConnected = conn.connections[0].readyState === 1;
    console.info(`[MongoDB] Connected successfully to host: ${conn.connection.host} / database: ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB] Connection error event: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Connection lost. Attempting reconnect...');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.info('[MongoDB] Reconnected successfully.');
      isConnected = true;
    });
  } catch (error) {
    console.error(`[MongoDB] Connection failed: ${error.message}`);
    // In production we may want to exit, but in dev we let the server run so health checks still respond
    if (ENV.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export const getDBStatus = () => {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };
  const stateCode = mongoose.connection.readyState;
  return {
    code: stateCode,
    status: states[stateCode] || 'Unknown',
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};

