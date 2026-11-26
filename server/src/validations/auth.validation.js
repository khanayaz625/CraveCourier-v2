import { z } from 'zod';

const phoneRegex = /^[+0-9\s-]{10,16}$/;
const emailSchema = z.string().trim().toLowerCase().email('Please enter a valid email address');
const phoneSchema = z
  .string()
  .trim()
  .regex(phoneRegex, 'Please enter a valid 10-digit mobile number')
  .refine((val) => val.replace(/\D/g, '').length >= 10, 'Please enter a valid 10-digit mobile number');

const identifierSchema = z
  .string()
  .trim()
  .min(5, 'Please enter a valid email address or mobile number')
  .refine((val) => {
    if (val.includes('@')) {
      return emailSchema.safeParse(val).success;
    }
    return phoneSchema.safeParse(val).success;
  }, 'Please enter a valid email address or 10-digit mobile number');

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name cannot exceed 60 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters long')
    .max(128, 'Password cannot exceed 128 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{10,16}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  role: z
    .enum(['customer', 'delivery'], {
      errorMap: () => ({ message: "Role must be either 'customer' or 'delivery'" }),
    })
    .default('customer'),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
    .max(128, 'Password cannot exceed 128 characters'),
  role: z.enum(['customer', 'delivery']).optional(),
});

export const adminLoginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
    .max(128, 'Password cannot exceed 128 characters'),
});

export const forgotPasswordSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    identifier: identifierSchema.optional(),
  })
  .refine((data) => Boolean(data.email || data.phone || data.identifier), {
    message: 'Please provide your registered email address or mobile number',
  });

export const resetPasswordSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    identifier: identifierSchema.optional(),
    otp: z
      .string({ required_error: '6-digit OTP code is required' })
      .trim()
      .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password cannot exceed 128 characters'),
  })
  .refine((data) => Boolean(data.email || data.phone || data.identifier), {
    message: 'Please provide your registered email address or mobile number',
  });

export const verifyEmailSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    otp: z
      .string({ required_error: '6-digit OTP code is required' })
      .trim()
      .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Either email or mobile phone number is required',
  });

export const resendOtpSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Either email or mobile phone number is required',
  });

export const sendMobileOtpSchema = z.object({
  phone: phoneSchema,
  role: z.enum(['customer', 'delivery']).optional().default('customer'),
});

export const verifyMobileOtpSchema = z.object({
  phone: phoneSchema,
  otp: z
    .string({ required_error: '6-digit OTP code is required' })
    .trim()
    .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  name: z.string().trim().max(60).optional(),
  role: z.enum(['customer', 'delivery']).optional().default('customer'),
});

// Email OTP Login Schemas
export const sendEmailOtpSchema = z.object({
  email: emailSchema,
  role: z.enum(['customer', 'delivery']).optional().default('customer'),
});

export const verifyEmailOtpSchema = z.object({
  email: emailSchema,
  otp: z
    .string({ required_error: '6-digit OTP code is required' })
    .trim()
    .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  role: z.enum(['customer', 'delivery']).optional().default('customer'),
});
