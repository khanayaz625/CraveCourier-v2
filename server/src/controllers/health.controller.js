import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getDBStatus } from '../config/db.js';
import { ENV } from '../config/env.js';

export const getHealthStatus = asyncHandler(async (req, res) => {
  const dbStatus = getDBStatus();
  const uptimeSeconds = Math.floor(process.uptime());
  const memoryUsage = process.memoryUsage();

  const healthData = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptimeSeconds / 60)}m ${uptimeSeconds % 60}s`,
    environment: ENV.NODE_ENV,
    database: dbStatus,
    memory: {
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    },
    version: '1.0.0',
  };

  const httpStatus = dbStatus.code === 1 ? 200 : 503;
  return res.status(httpStatus).json(new ApiResponse(httpStatus, healthData, 'Crave Health Check: Operational'));
});

