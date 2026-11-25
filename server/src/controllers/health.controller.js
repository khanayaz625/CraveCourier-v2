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

export const getAppVersion = asyncHandler(async (req, res) => {
  const versionData = {
    latestVersion: ENV.APK_LATEST_VERSION,
    versionCode: ENV.APK_VERSION_CODE,
    downloadUrl: ENV.APK_DOWNLOAD_URL,
    releaseNotes: ENV.APK_RELEASE_NOTES,
    forceUpdate: ENV.APK_FORCE_UPDATE,
  };

  return res.status(200).json(new ApiResponse(200, versionData, 'App version fetched successfully'));
});

