import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Category } from '../models/Category.model.js';
import { Product } from '../models/Product.model.js';

// Helper to slugify string
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-');

/**
 * @desc   Get all active categories
 * @route  GET /api/categories
 * @access Public
 */
export const getAllCategories = asyncHandler(async (req, res) => {
  const { type } = req.query;

  const filter = { isActive: true };
  if (type && type !== 'all') {
    filter.$or = [{ type }, { type: 'both' }];
  }

  const categories = await Category.find(filter).sort({ displayOrder: 1, name: 1 });

  return res.status(200).json(
    new ApiResponse(200, categories, `Retrieved ${categories.length} categories`)
  );
});

/**
 * @desc   Get single category by ID or slug
 * @route  GET /api/categories/:identifier
 * @access Public
 */
export const getCategoryByIdOrSlug = asyncHandler(async (req, res) => {
  const { identifier } = req.params;

  const isObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);
  const category = await Category.findOne(
    isObjectId ? { _id: identifier } : { slug: identifier }
  );

  if (!category) {
    throw new ApiError(404, `Category '${identifier}' not found`);
  }

  return res.status(200).json(new ApiResponse(200, category, 'Category retrieved'));
});

/**
 * @desc   Create new category
 * @route  POST /api/categories
 * @access Admin, Vendor
 */
export const createCategory = asyncHandler(async (req, res) => {
  const { name, image, description, type, displayOrder, isActive } = req.body;

  const slug = req.body.slug || slugify(name);
  const existing = await Category.findOne({ $or: [{ name }, { slug }] });
  if (existing) {
    throw new ApiError(409, `A category with name '${name}' or slug '${slug}' already exists`);
  }

  const category = await Category.create({
    name,
    slug,
    image,
    description,
    type: type || 'both',
    displayOrder: displayOrder || 0,
    isActive: isActive !== undefined ? isActive : true,
  });

  return res.status(201).json(new ApiResponse(201, category, 'Category created successfully'));
});

/**
 * @desc   Update category
 * @route  PUT /api/categories/:id
 * @access Admin, Vendor
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.body.name && !req.body.slug) {
    req.body.slug = slugify(req.body.name);
  }

  const category = await Category.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    throw new ApiError(404, 'Category not found to update');
  }

  return res.status(200).json(new ApiResponse(200, category, 'Category updated successfully'));
});

/**
 * @desc   Delete category
 * @route  DELETE /api/categories/:id
 * @access Admin Only
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if any product references this category
  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    throw new ApiError(
      400,
      `Cannot delete category. ${productCount} products are linked to this category.`
    );
  }

  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    throw new ApiError(404, 'Category not found to delete');
  }

  return res.status(200).json(new ApiResponse(200, {}, 'Category deleted successfully'));
});

