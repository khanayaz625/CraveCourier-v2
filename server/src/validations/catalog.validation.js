import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  slug: z.string().trim().toLowerCase().optional(),
  image: z
    .string({ required_error: 'Category image URL is required' })
    .url('Image must be a valid URL'),
  description: z.string().trim().max(300).optional(),
  type: z.enum(['food', 'grocery', 'both']).default('both'),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name cannot exceed 120 characters'),
  slug: z.string().trim().toLowerCase().optional(),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional(),
  images: z
    .array(z.string().url('Each image must be a valid URL'))
    .min(1, 'Product must contain at least one image'),
  price: z.coerce
    .number({ required_error: 'Price is required' })
    .positive('Price must be greater than zero'),
  discountPrice: z.coerce.number().min(0).default(0),
  unit: z
    .string({ required_error: 'Unit is required (e.g. 500g, 1 plate)' })
    .trim(),
  stock: z.coerce.number().int().min(0).default(50),
  category: z.string({ required_error: 'Category ID is required' }),
  type: z.enum(['food', 'grocery'], {
    errorMap: () => ({ message: "Type must be either 'food' or 'grocery'" }),
  }),
  isVeg: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

