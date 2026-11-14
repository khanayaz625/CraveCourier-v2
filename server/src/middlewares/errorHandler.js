import { ApiError } from '../utils/ApiError.js';
import { ENV } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // If error is not an instance of ApiError, normalize it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new ApiError(404, message);
  }

  // Handle Mongoose Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate value entered for '${field}'. Please provide another value.`;
    error = new ApiError(409, message, [{ field, message: `${field} must be unique` }]);
  }

  // Handle Mongoose Schema Validation Errors
  if (err.name === 'ValidationError' && err.errors) {
    const extractedErrors = Object.values(err.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
    error = new ApiError(400, 'Mongoose Schema Validation Failed', extractedErrors);
  }

  // Handle Zod Validation Errors
  if (err.name === 'ZodError' && Array.isArray(err.issues)) {
    const extractedErrors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    error = new ApiError(400, 'Input validation failed', extractedErrors);
  }

  // Handle JWT Malformed / Invalid
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid authentication token');
  }

  // Handle JWT Expired
  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Authentication token has expired. Please log in again.');
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || [],
    ...(ENV.NODE_ENV === 'development' && { stack: error.stack }),
  };

  return res.status(error.statusCode).json(response);
};

