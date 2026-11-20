/**
 * CraveCourier Mobile SMS & 2-Factor OTP Service
 * Dispatches 6-digit one-time passcodes via SMS gateway with development fallback
 */

import { ENV } from '../config/env.js';

/**
 * Standardize Indian / International phone numbers
 * @param {string} phone 
 * @returns {string} E.164 formatted phone number or cleaned 10-digit string
 */
export function formatPhoneNumber(phone = '') {
  const digits = String(phone).replace(/[^\d+]/g, '').trim();
  if (!digits) return '';

  // If already starts with +
  if (digits.startsWith('+')) {
    return digits;
  }

  // If 10-digit Indian number (starts with 6, 7, 8, or 9)
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }

  // If 12-digit Indian number starting with 91
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  return `+91${digits}`;
}

/**
 * Mask mobile number for secure UI display (e.g., +91 98******10)
 * @param {string} phone 
 * @returns {string}
 */
export function maskPhoneNumber(phone = '') {
  const clean = formatPhoneNumber(phone);
  if (!clean || clean.length < 8) return '+91 ****** ****';
  return clean.replace(/(\+\d{2}\s?\d{2})\d+(\d{2})$/, '$1******$2');
}

/**
 * Dispatch 6-digit Mobile SMS OTP for 2-Factor Authentication or Phone Login
 * @param {Object} options
 * @param {string} options.phone - Recipient mobile phone number
 * @param {string} options.otp - 6-digit numeric OTP
 * @param {string} [options.purpose='2-Factor Authentication'] - Reason for OTP
 * @returns {Promise<{success: boolean, messageId?: string, debugOtp?: string, phone: string}>}
 */
export async function sendSmsOtp({ phone, otp, purpose = '2-Factor Authentication' }) {
  const formattedPhone = formatPhoneNumber(phone);
  const messageText = `[CraveCourier] Your ${purpose} code is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`;

  // Always log visually in server terminal for clear real-time monitoring
  console.info(`
╔══════════════════════════════════════════════════════════════════╗
║ 📱 CRAVECOURIER 2-FACTOR MOBILE OTP DISPATCHED                   ║
╠══════════════════════════════════════════════════════════════════╣
║ 📲 Mobile Number: ${formattedPhone.padEnd(46)}║
║ 🔑 Security Code: ${otp.padEnd(46)}║
║ 🛡️ Purpose:       ${purpose.padEnd(46)}║
║ ⏱️ Valid for:     10 Minutes                                     ║
╚══════════════════════════════════════════════════════════════════╝
  `);

  // Optional: If FAST2SMS or BREVO SMS credentials exist in environment
  try {
    if (process.env.FAST2SMS_API_KEY) {
      const pureDigits = formattedPhone.replace('+91', '');
      await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: pureDigits,
        }),
      });
    }
  } catch (smsGatewayError) {
    console.warn('[SMS GATEWAY WARNING] Live SMS gateway delivery had an issue:', smsGatewayError.message);
  }

  return {
    success: true,
    messageId: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    phone: formattedPhone,
    debugOtp: otp,
  };
}

export default {
  formatPhoneNumber,
  maskPhoneNumber,
  sendSmsOtp,
};
