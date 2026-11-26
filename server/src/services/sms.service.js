/**
 * CraveCourier Mobile SMS & OTP Service
 * Dispatches 6-digit one-time passcodes via configured SMS gateways
 * (2Factor.in, Fast2SMS, MSG91, Twilio) with honest delivery reporting.
 */

import { ENV } from '../config/env.js';

/**
 * Standardize Indian / International phone numbers to E.164 format
 * @param {string} phone
 * @returns {string} E.164 formatted phone number
 */
export function formatPhoneNumber(phone = '') {
  const raw = String(phone).replace(/[^\d+]/g, '').trim();
  if (!raw) return '';

  // Remove any '+' that isn't at index 0
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\+/g, '');
  if (!digits) return '';

  if (hasPlus) {
    // Handle +0XXXXXXXXXX edge case
    if (digits.startsWith('910') && digits.length === 13 && /^910[6-9]\d{9}$/.test(digits)) {
      return `+91${digits.slice(3)}`;
    }
    return `+${digits}`;
  }

  // 11-digit Indian number starting with 0 (e.g., 09876543210)
  if (digits.length === 11 && /^0[6-9]\d{9}$/.test(digits)) {
    return `+91${digits.slice(1)}`;
  }

  // 10-digit Indian number (starts with 6, 7, 8, or 9)
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }

  // 12-digit Indian number starting with 91
  if (digits.length === 12 && /^91[6-9]\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return `+${digits}`;
}

/**
 * Return safe exact-match database lookup variants for a phone input.
 * Avoids unanchored $regex queries that could match unrelated users.
 * @param {string} phone
 * @returns {string[]}
 */
export function getPhoneLookupVariants(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 10) return [];

  const last10 = digits.slice(-10);
  const formatted = formatPhoneNumber(phone);
  return [...new Set([formatted, `+91${last10}`, `91${last10}`, `0${last10}`, last10].filter(Boolean))];
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
 * Dispatch 6-digit Mobile SMS OTP for Verification, Login, 2FA, or Password Reset
 * @param {Object} options
 * @param {string} options.phone - Recipient mobile phone number
 * @param {string} options.otp - 6-digit numeric OTP
 * @param {string} [options.purpose='Verification'] - Reason for OTP
 * @returns {Promise<{success: boolean, configured: boolean, gateway?: string, messageId?: string, phone: string, error?: string}>}
 */
export async function sendSmsOtp({ phone, otp, purpose = 'Verification' }) {
  const formattedPhone = formatPhoneNumber(phone);
  const digitsOnly = formattedPhone.replace(/\D/g, '');
  const tenDigitPhone = digitsOnly.slice(-10);

  if (!formattedPhone || tenDigitPhone.length < 10) {
    return {
      success: false,
      configured: false,
      phone: formattedPhone,
      error: 'Invalid recipient phone number',
    };
  }

  const isTestDryRun = process.env.NODE_ENV === 'test' && process.env.ALLOW_LIVE_SMS_IN_TEST !== 'true';
  const twoFactorKey = isTestDryRun ? '' : (process.env.TWOFACTOR_API_KEY || ENV.TWOFACTOR_API_KEY || '').trim();
  const templateName = (process.env.TWOFACTOR_TEMPLATE_NAME || ENV.TWOFACTOR_TEMPLATE_NAME || '').trim();
  const fast2SmsKey = isTestDryRun ? '' : (process.env.FAST2SMS_API_KEY || ENV.FAST2SMS_API_KEY || '').trim();
  const fast2SmsSenderId = (process.env.FAST2SMS_SENDER_ID || ENV.FAST2SMS_SENDER_ID || '').trim();
  const fast2SmsTemplateId = (process.env.FAST2SMS_TEMPLATE_ID || ENV.FAST2SMS_TEMPLATE_ID || '').trim();
  const msg91Key = isTestDryRun ? '' : (process.env.MSG91_AUTH_KEY || ENV.MSG91_AUTH_KEY || '').trim();
  const msg91TemplateId = (process.env.MSG91_TEMPLATE_ID || ENV.MSG91_TEMPLATE_ID || '').trim();
  const twilioSid = isTestDryRun ? '' : (process.env.TWILIO_ACCOUNT_SID || ENV.TWILIO_ACCOUNT_SID || '').trim();
  const twilioToken = (process.env.TWILIO_AUTH_TOKEN || ENV.TWILIO_AUTH_TOKEN || '').trim();
  const twilioFrom = (process.env.TWILIO_PHONE_NUMBER || ENV.TWILIO_PHONE_NUMBER || '').trim();

  // Never print raw OTPs in production logs
  const displayOtp = ENV.NODE_ENV === 'production' ? '******' : String(otp);
  console.info(
    `[SMS OTP] Dispatching to ${maskPhoneNumber(formattedPhone)} | Purpose: ${purpose} | Code: ${displayOtp}`
  );

  let attemptedAnyGateway = false;
  let lastError = null;

  // 1. Primary: 2Factor.in SMS Gateway API (High Priority Indian Transactional OTP)
  if (twoFactorKey) {
    attemptedAnyGateway = true;
    try {
      const encodedOtp = encodeURIComponent(String(otp));
      const recipient = formattedPhone.startsWith('+91') ? `+91${tenDigitPhone}` : tenDigitPhone;
      const endpoint = templateName
        ? `https://2factor.in/API/V1/${twoFactorKey}/SMS/${encodeURIComponent(recipient)}/${encodedOtp}/${encodeURIComponent(templateName)}`
        : `https://2factor.in/API/V1/${twoFactorKey}/SMS/${encodeURIComponent(recipient)}/${encodedOtp}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.Status === 'Success') {
        console.info(`[2FACTOR.IN] SMS OTP dispatched to ${maskPhoneNumber(formattedPhone)}`);
        return {
          success: true,
          configured: true,
          gateway: '2factor.in',
          messageId: data.Details || `2factor_${Date.now()}`,
          phone: formattedPhone,
        };
      }

      lastError = data?.Details || `2Factor.in returned HTTP ${response.status}`;
      console.warn('[2FACTOR.IN WARNING]', lastError);
    } catch (twoFactorError) {
      lastError = twoFactorError.message;
      console.error('[2FACTOR.IN ERROR] Failed to dispatch via 2factor.in:', twoFactorError.message);
    }
  }

  // 2. Secondary Fallback: Fast2SMS API
  if (fast2SmsKey) {
    attemptedAnyGateway = true;
    try {
      const bodyPayload =
        fast2SmsSenderId && fast2SmsTemplateId
          ? {
              route: 'dlt',
              sender_id: fast2SmsSenderId,
              message: fast2SmsTemplateId,
              variables_values: String(otp),
              numbers: tenDigitPhone,
            }
          : {
              route: 'otp',
              variables_values: String(otp),
              numbers: tenDigitPhone,
              flash: 0,
            };

      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2SmsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.return === true) {
        console.info(`[FAST2SMS] SMS OTP dispatched to ${maskPhoneNumber(formattedPhone)}`);
        return {
          success: true,
          configured: true,
          gateway: 'fast2sms',
          messageId: data.request_id || `fast2sms_${Date.now()}`,
          phone: formattedPhone,
        };
      }

      lastError = Array.isArray(data?.message)
        ? data.message.join(', ')
        : data?.message || `Fast2SMS returned HTTP ${response.status}`;
      console.warn('[FAST2SMS WARNING]', lastError);
    } catch (smsGatewayError) {
      lastError = smsGatewayError.message;
      console.warn('[FAST2SMS WARNING] Delivery issue:', smsGatewayError.message);
    }
  }

  // 3. Tertiary Fallback: MSG91 OTP API
  if (msg91Key && msg91TemplateId) {
    attemptedAnyGateway = true;
    try {
      const mobileParam = formattedPhone.startsWith('+') ? formattedPhone.slice(1) : `91${tenDigitPhone}`;
      const endpoint = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(
        msg91TemplateId
      )}&mobile=${encodeURIComponent(mobileParam)}&otp=${encodeURIComponent(String(otp))}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          authkey: msg91Key,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.type === 'success') {
        console.info(`[MSG91] SMS OTP dispatched to ${maskPhoneNumber(formattedPhone)}`);
        return {
          success: true,
          configured: true,
          gateway: 'msg91',
          messageId: data.request_id || `msg91_${Date.now()}`,
          phone: formattedPhone,
        };
      }

      lastError = data?.message || `MSG91 returned HTTP ${response.status}`;
      console.warn('[MSG91 WARNING]', lastError);
    } catch (msg91Error) {
      lastError = msg91Error.message;
      console.warn('[MSG91 ERROR]', msg91Error.message);
    }
  }

  // 4. Quaternary Fallback: Twilio REST API
  if (twilioSid && twilioToken && twilioFrom) {
    attemptedAnyGateway = true;
    try {
      const authHeader = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const formBody = new URLSearchParams({
        To: formattedPhone,
        From: twilioFrom,
        Body: `Your Crave Courier ${purpose} code is ${otp}. Valid for 10 minutes. Do not share this code.`,
      });

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.sid) {
        console.info(`[TWILIO] SMS OTP dispatched to ${maskPhoneNumber(formattedPhone)}`);
        return {
          success: true,
          configured: true,
          gateway: 'twilio',
          messageId: data.sid,
          phone: formattedPhone,
        };
      }

      lastError = data?.message || `Twilio returned HTTP ${response.status}`;
      console.warn('[TWILIO WARNING]', lastError);
    } catch (twilioError) {
      lastError = twilioError.message;
      console.warn('[TWILIO ERROR]', twilioError.message);
    }
  }

  if (!attemptedAnyGateway) {
    console.warn(
      '[SMS SERVICE] Skipping live SMS dispatch: No SMS gateway credentials configured (set TWOFACTOR_API_KEY, FAST2SMS_API_KEY, MSG91_AUTH_KEY, or TWILIO_ACCOUNT_SID).'
    );
    return {
      success: false,
      configured: false,
      phone: formattedPhone,
      error: 'SMS gateway is not configured on the server',
    };
  }

  return {
    success: false,
    configured: true,
    phone: formattedPhone,
    error: lastError || 'SMS delivery failed across configured gateways',
  };
}

export default {
  formatPhoneNumber,
  getPhoneLookupVariants,
  maskPhoneNumber,
  sendSmsOtp,
};
