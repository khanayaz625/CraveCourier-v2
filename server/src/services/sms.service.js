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
  const cleanPhone = formattedPhone.replace('+91', '').replace('+', '').trim();
  const twoFactorKey = (process.env.TWOFACTOR_API_KEY || process.env['2FACTOR_API_KEY'] || '').trim();
  const templateName = (process.env.TWOFACTOR_TEMPLATE_NAME || '').trim();

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

  // 1. Primary: 2Factor.in SMS Gateway API (High Priority Indian Transactional OTP)
  if (twoFactorKey) {
    try {
      const endpoint = templateName
        ? `https://2factor.in/API/V1/${twoFactorKey}/SMS/${cleanPhone}/${otp}/${encodeURIComponent(templateName)}`
        : `https://2factor.in/API/V1/${twoFactorKey}/SMS/${cleanPhone}/${otp}`;

      console.info(`[2FACTOR.IN] Dispatching SMS OTP to +91${cleanPhone}...`);
      const response = await fetch(endpoint, { method: 'GET' });
      const data = await response.json();
      console.info('[2FACTOR.IN RESPONSE]', data);

      if (data?.Status === 'Success') {
        return {
          success: true,
          messageId: data.Details || `2factor_${Date.now()}`,
          phone: formattedPhone,
          debugOtp: otp,
          gateway: '2factor.in',
        };
      } else {
        console.warn('[2FACTOR.IN WARNING] Gateway replied with:', data);
      }
    } catch (twoFactorError) {
      console.error('[2FACTOR.IN ERROR] Failed to dispatch via 2factor.in:', twoFactorError.message);
    }
  }

  // 2. Secondary Fallback: Fast2SMS API
  if (process.env.FAST2SMS_API_KEY) {
    try {
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
    } catch (smsGatewayError) {
      console.warn('[FAST2SMS WARNING] Delivery issue:', smsGatewayError.message);
    }
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
