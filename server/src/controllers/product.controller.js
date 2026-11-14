import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Product } from '../models/Product.model.js';
import { Category } from '../models/Category.model.js';

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-');

/**
 * @desc   Get paginated products with multi-filter, search & sort
 * @route  GET /api/products
 * @access Public
 */
export const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    search,
    category,
    subcategory,
    brand,
    type,
    isVeg,
    isFeatured,
    isBestseller,
    inStock,
    minPrice,
    maxPrice,
    rating,
    hasDiscount,
    sort = 'popular',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  // Build Filter Query
  const filter = { isActive: true };

  // 1. Text search across name, brand, subcategory, tags, keywords, description
  if (search && search.trim()) {
    const cleanSearch = search.trim();
    filter.$or = [
      { name: { $regex: cleanSearch, $options: 'i' } },
      { brand: { $regex: cleanSearch, $options: 'i' } },
      { subcategory: { $regex: cleanSearch, $options: 'i' } },
      { description: { $regex: cleanSearch, $options: 'i' } },
      { tags: { $in: [new RegExp(cleanSearch, 'i')] } },
      { keywords: { $in: [new RegExp(cleanSearch, 'i')] } },
    ];
  }

  // 2. Category filter (by ID or Slug)
  if (category && category !== 'all') {
    if (category.match(/^[0-9a-fA-F]{24}$/)) {
      filter.category = category;
    } else {
      const catDoc = await Category.findOne({ slug: category });
      if (catDoc) filter.category = catDoc._id;
    }
  }

  // 2b. Subcategory filter
  if (subcategory && subcategory !== 'all') {
    filter.subcategory = { $regex: new RegExp(`^${subcategory}$`, 'i') };
  }

  // 2c. Brand filter
  if (brand && brand !== 'all') {
    filter.brand = { $regex: new RegExp(`^${brand}$`, 'i') };
  }

  // 3. Product Type (food vs grocery)
  if (type && ['food', 'grocery'].includes(type)) {
    filter.type = type;
  }

  // 4. Dietary (Vegetarian / Non-Veg)
  if (isVeg !== undefined && isVeg !== '') {
    filter.isVeg = isVeg === 'true' || isVeg === true;
  }

  // 4b. Featured & Bestseller Filters
  if (isFeatured === 'true' || isFeatured === true) {
    filter.isFeatured = true;
  }
  if (isBestseller === 'true' || isBestseller === true) {
    filter.isBestseller = true;
  }
  if (inStock === 'true' || inStock === true) {
    filter.stock = { $gt: 0 };
  }

  // 5. Price Range
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  // 6. Minimum Rating
  if (rating) {
    filter['rating.average'] = { $gte: parseFloat(rating) };
  }

  // 7. Discounted Deals Only
  if (hasDiscount === 'true') {
    filter.discountPrice = { $gt: 0 };
  }

  // Sorting
  let sortCriteria = {};
  switch (sort) {
    case 'price-low':
      sortCriteria = { price: 1 };
      break;
    case 'price-high':
      sortCriteria = { price: -1 };
      break;
    case 'rating':
      sortCriteria = { 'rating.average': -1, 'rating.count': -1 };
      break;
    case 'discount':
      sortCriteria = { discountPrice: 1, price: -1 };
      break;
    case 'bestseller':
      sortCriteria = { isBestseller: -1, 'rating.count': -1 };
      break;
    case 'featured':
      sortCriteria = { isFeatured: -1, 'rating.average': -1 };
      break;
    case 'newest':
      sortCriteria = { createdAt: -1 };
      break;
    case 'popular':
    default:
      sortCriteria = { isBestseller: -1, 'rating.average': -1, 'rating.count': -1, createdAt: -1 };
      break;
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug image type')
      .populate('vendor', 'name avatar')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        pagination: {
          total,
          page: pageNum,
          pages: totalPages,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
      'Products retrieved successfully'
    )
  );
});

/**
 * @desc   Fast search autocomplete suggestions
 * @route  GET /api/products/autocomplete
 * @access Public
 */
export const getAutocompleteSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(200).json(new ApiResponse(200, [], 'Empty query'));
  }

  const cleanQuery = q.trim();

  // Search matching products & categories in parallel
  const [matchingProducts, matchingCategories] = await Promise.all([
    Product.find({
      isActive: true,
      $or: [
        { name: { $regex: cleanQuery, $options: 'i' } },
        { tags: { $in: [new RegExp(cleanQuery, 'i')] } },
      ],
    })
      .select('name slug images price discountPrice unit type isVeg')
      .limit(6)
      .lean(),
    Category.find({
      isActive: true,
      name: { $regex: cleanQuery, $options: 'i' },
    })
      .select('name slug image type')
      .limit(3)
      .lean(),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products: matchingProducts,
        categories: matchingCategories,
      },
      'Autocomplete suggestions'
    )
  );
});

/**
 * @desc   Get featured catalog sections for Home Page (Deals, Popular, Groceries)
 * @route  GET /api/products/sections/featured
 * @access Public
 */
export const getFeaturedSections = asyncHandler(async (req, res) => {
  const [deals, popular, groceries] = await Promise.all([
    // Deals (Products with active discounts)
    Product.find({ isActive: true, discountPrice: { $gt: 0 } })
      .populate('category', 'name slug')
      .sort({ 'rating.average': -1 })
      .limit(8)
      .lean(),

    // Popular & Top Rated (Across all categories)
    Product.find({ isActive: true, 'rating.average': { $gte: 4.6 } })
      .populate('category', 'name slug')
      .sort({ 'rating.count': -1, 'rating.average': -1 })
      .limit(8)
      .lean(),

    // Fresh Farm Groceries
    Product.find({ isActive: true, type: 'grocery' })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        deals,
        popular,
        groceries,
      },
      'Featured sections retrieved'
    )
  );
});

/**
 * @desc   Get single product by Slug or ObjectId
 * @route  GET /api/products/:identifier
 * @access Public
 */
export const getProductBySlugOrId = asyncHandler(async (req, res) => {
  const { identifier } = req.params;

  const isObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);
  const product = await Product.findOne(
    isObjectId ? { _id: identifier } : { slug: identifier }
  )
    .populate('category', 'name slug image type')
    .populate('vendor', 'name avatar phone');

  if (!product) {
    throw new ApiError(404, `Product '${identifier}' not found`);
  }

  // Fetch 4 related products from the same category
  const relatedProducts = await Product.find({
    category: product.category._id,
    _id: { $ne: product._id },
    isActive: true,
  })
    .limit(4)
    .lean();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        product,
        relatedProducts,
      },
      'Product details retrieved'
    )
  );
});

/**
 * @desc   Create new product
 * @route  POST /api/products
 * @access Admin, Vendor
 */
export const createProduct = asyncHandler(async (req, res) => {
  const productData = req.body;

  // Verify category exists
  const categoryExists = await Category.findById(productData.category);
  if (!categoryExists) {
    throw new ApiError(404, 'Category referenced does not exist');
  }

  if (!productData.slug) {
    productData.slug = slugify(productData.name);
  }

  // Attach creator as vendor if vendor role
  if (req.user.role === 'vendor' && !productData.vendor) {
    productData.vendor = req.user._id;
  }

  const product = await Product.create(productData);

  return res.status(201).json(new ApiResponse(201, product, 'Product created successfully'));
});

/**
 * @desc   Update product
 * @route  PUT /api/products/:id
 * @access Admin, Vendor
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.body.name && !req.body.slug) {
    req.body.slug = slugify(req.body.name);
  }

  const product = await Product.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    throw new ApiError(404, 'Product not found to update');
  }

  return res.status(200).json(new ApiResponse(200, product, 'Product updated successfully'));
});

/**
 * @desc   Delete product
 * @route  DELETE /api/products/:id
 * @access Admin, Vendor
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByIdAndDelete(id);

  if (!product) {
    throw new ApiError(404, 'Product not found to delete');
  }

  return res.status(200).json(new ApiResponse(200, { id }, 'Product deleted successfully'));
});

/**
 * @desc   Export all products as CSV
 * @route  GET /api/products/export/csv
 * @access Public / Admin
 */
export const exportProductsCSV = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true }).populate('category', 'name slug').lean();

  const headers = [
    'Product ID',
    'Product Name',
    'Brand',
    'Category',
    'Subcategory',
    'Description',
    'Unit',
    'MRP (INR)',
    'Selling Price (INR)',
    'Discount %',
    'Stock',
    'Featured',
    'Bestseller',
    'Dietary',
    'Image URL',
    'Variants JSON',
    'Keywords',
  ];

  const rows = products.map((p) => {
    const mrp = p.mrp || p.price || 0;
    const sellingPrice = p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price;
    const discount = mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
    const escapeCsv = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

    return [
      escapeCsv(p.productId || p._id),
      escapeCsv(p.name),
      escapeCsv(p.brand || ''),
      escapeCsv(p.category?.name || ''),
      escapeCsv(p.subcategory || ''),
      escapeCsv(p.description || ''),
      escapeCsv(p.unit || ''),
      mrp,
      sellingPrice,
      discount,
      p.stock || 0,
      p.isFeatured ? 'Yes' : 'No',
      p.isBestseller ? 'Yes' : 'No',
      p.isVeg ? 'Vegetarian' : 'Non-Vegetarian',
      escapeCsv(p.images?.[0] || ''),
      escapeCsv(JSON.stringify(p.variants || [])),
      escapeCsv((p.keywords || p.tags || []).join(', ')),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="cravecourier_grocery_catalogue.csv"');
  return res.status(200).send(csvContent);
});

/**
 * @desc   Import products via JSON / CSV array
 * @route  POST /api/products/import
 * @access Admin
 */
export const importProducts = asyncHandler(async (req, res) => {
  const { products: rawProducts } = req.body;

  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    throw new ApiError(400, 'Array of products is required for bulk import');
  }

  const results = { imported: 0, errors: [] };

  for (const raw of rawProducts) {
    try {
      if (!raw.name || !raw.price) continue;

      let catId = raw.category;
      if (typeof catId === 'string' && !catId.match(/^[0-9a-fA-F]{24}$/)) {
        let cat = await Category.findOne({
          $or: [{ slug: slugify(catId) }, { name: new RegExp(`^${catId}$`, 'i') }],
        });
        if (!cat) {
          cat = await Category.create({
            name: raw.categoryName || catId,
            slug: slugify(catId),
            image: raw.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
            type: 'grocery',
          });
        }
        catId = cat._id;
      }

      await Product.findOneAndUpdate(
        {
          $or: [
            ...(raw.productId ? [{ productId: raw.productId }] : []),
            { name: raw.name },
          ],
        },
        {
          productId: raw.productId || `CC-${Date.now().toString().slice(-6)}`,
          name: raw.name,
          slug: slugify(raw.name),
          brand: raw.brand || '',
          subcategory: raw.subcategory || '',
          description: raw.description || raw.name,
          images: Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : [raw.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'],
          price: parseFloat(raw.price || raw.mrp || 0),
          discountPrice: parseFloat(raw.discountPrice || raw.sellingPrice || raw.price || 0),
          mrp: parseFloat(raw.mrp || raw.price || 0),
          unit: raw.unit || '1 pack',
          stock: parseInt(raw.stock || 50, 10),
          category: catId,
          type: raw.type || 'grocery',
          isVeg: raw.isVeg !== undefined ? raw.isVeg : true,
          isFeatured: Boolean(raw.isFeatured),
          isBestseller: Boolean(raw.isBestseller),
          variants: Array.isArray(raw.variants) ? raw.variants : [],
          keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
        },
        { upsert: true, new: true }
      );
      results.imported++;
    } catch (err) {
      results.errors.push({ name: raw.name, error: err.message });
    }
  }

  return res.status(200).json(
    new ApiResponse(200, results, `Successfully imported ${results.imported} products into catalogue`)
  );
});

