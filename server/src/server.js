import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { initSocket } from './config/socket.js';
import mongoose from 'mongoose';

// Catch uncaught exceptions before anything else
process.on('uncaughtException', (err) => {
  console.error(`[FATAL] Uncaught Exception: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Create HTTP server and mount Socket.io
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  const server = httpServer.listen(ENV.PORT, () => {
    console.info(`=========================================`);
    console.info(`  CRAVE API SERVER RUNNING               `);
    console.info(`  Mode:       ${ENV.NODE_ENV}            `);
    console.info(`  Port:       ${ENV.PORT}                `);
    console.info(`  Health:     http://localhost:${ENV.PORT}/api/health`);
    console.info(`  Client:     ${ENV.CLIENT_URL}          `);
    console.info(`  Real-Time:  Socket.io initialized      `);
    console.info(`=========================================`);
  });

  // Graceful shutdown helper
  const gracefulShutdown = (signal) => {
    console.info(`[SHUTDOWN] Received ${signal}. Closing HTTP server and database connection...`);
    server.close(async () => {
      console.info('[SHUTDOWN] HTTP server closed.');
      try {
        await mongoose.connection.close(false);
        console.info('[SHUTDOWN] MongoDB connection closed.');
      } catch (err) {
        console.error(`[SHUTDOWN] Error closing DB: ${err.message}`);
      }
      process.exit(0);
    });

    // Force close after 10 seconds if hanging
    setTimeout(() => {
      console.error('[SHUTDOWN] Forcefully shutting down due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    console.error(`[ERROR] Unhandled Promise Rejection: ${err.message}`);
    console.error(err.stack);
  });
};

startServer();

