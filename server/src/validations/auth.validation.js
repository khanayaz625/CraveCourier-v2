import { z } from 'zod';

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
    .min(6, 'Password must be at least 6 characters long'),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{7,15}$/, 'Please enter a valid phone number')
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
    .min(1, 'Password cannot be empty'),
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
    .min(1, 'Password cannot be empty'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  otp: z
    .string({ required_error: '6-digit OTP code is required' })
    .trim()
    .length(6, 'OTP must be exactly 6 digits'),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(6, 'Password must be at least 6 characters'),
});

export const verifyEmailSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Please enter a valid email address').optional(),
    phone: z.string().trim().optional(),
    otp: z
      .string({ required_error: '6-digit OTP code is required' })
      .trim()
      .length(6, 'OTP must be exactly 6 digits'),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Either email or mobile phone number is required',
  });

export const resendOtpSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Please enter a valid email address').optional(),
    phone: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Either email or mobile phone number is required',
  });

// 2-Factor Authentication Schemas
export const verify2FASchema = z.object({
  twoFactorTempToken: z
    .string({ required_error: 'Two-factor session token is required' })
    .min(10, 'Invalid two-factor session token'),
  otp: z
    .string({ required_error: '6-digit mobile OTP code is required' })
    .trim()
    .length(6, 'Security code must be exactly 6 digits'),
});

export const resend2FASchema = z.object({
  twoFactorTempToken: z
    .string({ required_error: 'Two-factor session token is required' })
    .min(10, 'Invalid two-factor session token'),
});

export const sendMobileOtpSchema = z.object({
  phone: z
    .string({ required_error: 'Mobile phone number is required' })
    .trim()
    .regex(/^[+0-9\s-]{10,15}$/, 'Please enter a valid 10-digit mobile number'),
  role: z.enum(['customer', 'delivery']).optional().default('customer'),
});

export const verifyMobileOtpSchema = z.object({
  phone: z
    .string({ required_error: 'Mobile phone number is required' })
    .trim()
    .regex(/^[+0-9\s-]{10,15}$/, 'Please enter a valid 10-digit mobile number'),
  otp: z
    .string({ required_error: '6-digit OTP code is required' })
    .trim()
    .length(6, 'OTP must be exactly 6 digits'),
  name: z.string().trim().optional(),
  role: z.enum(['customer', 'delivery']).optional().default('customer'),
});

export const toggle2FASchema = z.object({
  enabled: z.boolean({ required_error: 'Enabled boolean state is required' }),
  phone: z.string().trim().regex(/^[+0-9\s-]{10,15}$/, 'Please enter a valid phone number').optional(),
});

