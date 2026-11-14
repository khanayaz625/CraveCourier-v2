import { Router } from 'express';
import { Banner } from '../models/Banner.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Public: Get all active banners ordered by displayOrder
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const banners = await Banner.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, banners, 'Banners fetched'));
  })
);

export default router;

