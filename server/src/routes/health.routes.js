import { Router } from 'express';
import { getHealthStatus, getAppVersion } from '../controllers/health.controller.js';

const router = Router();

// GET /api/health
router.get('/', getHealthStatus);

// GET /api/health/app-version
router.get('/app-version', getAppVersion);

export default router;

