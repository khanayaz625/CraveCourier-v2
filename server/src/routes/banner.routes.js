import { Router } from 'express';
import { Banner } from '../models/Banner.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// In-memory cache for public banners (5-minute TTL)
let cachedBanners = null;
let bannersCacheTime = 0;
const BANNERS_CACHE_TTL = 5 * 60 * 1000;

// Public: Get all active banners ordered by displayOrder
router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (cachedBanners && Date.now() - bannersCacheTime < BANNERS_CACHE_TTL) {
      return res.status(200).json(new ApiResponse(200, cachedBanners, 'Banners fetched (cached)'));
    }
    const banners = await Banner.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 }).lean();
    cachedBanners = banners;
    bannersCacheTime = Date.now();
    return res.status(200).json(new ApiResponse(200, banners, 'Banners fetched'));
  })
);

export default router;

