import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.model.js';
import { ENV } from '../config/env.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token = null;

  // 1. Check Authorization Bearer header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Fallback to access token cookie if set
  else if (req.cookies && req.cookies.crave_accessToken) {
    token = req.cookies.crave_accessToken;
  }

  if (!token) {
    throw new ApiError(401, 'Authentication required. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded._id).select('-password');
    if (!user) {
      throw new ApiError(401, 'The user belonging to this token no longer exists.');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'Invalid or expired authentication token. Please log in again.');
  }
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'User must be authenticated before authorization.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access denied. Role '${req.user.role}' is not authorized to perform this action.`
        )
      );
    }

    next();
  };
};

