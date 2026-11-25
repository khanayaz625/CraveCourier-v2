import { ENV } from '../config/env.js';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Generate a modern, responsive, and customizable HTML email template for OTP delivery
 *
 * @param {Object} options
 * @param {string} options.name - Recipient user's name
 * @param {string} options.otp - 6-digit one-time password
 * @param {string} [options.type='verification'] - 'verification' | 'reset' | 'login'
 * @param {number} [options.expiryMinutes=15] - Expiration period in minutes
 * @param {string} [options.brandName='Pizza 65 & Crave'] - Brand display name
 * @param {string} [options.supportEmail='ayaz56465@gmail.com'] - Support contact email
 * @returns {string} - Clean, mobile-responsive HTML string
 */
export function generateOtpEmailHtml({
  name = 'Valued Customer',
  otp = '000000',
  type = 'verification',
  expiryMinutes = 15,
  brandName = 'Crave Courier',
  supportEmail = 'ayaz56465@gmail.com',
}) {
  const isReset = type === 'reset';
  const isLogin = type === 'login';

  const heading = isReset
    ? 'Password reset code'
    : isLogin
    ? 'Sign-in verification code'
    : 'Verify your email address';

  const leadText = isReset
    ? `We received a request to reset the password for your ${brandName} account. Enter the code below to set a new password.`
    : isLogin
    ? `Use the 6-digit one-time code below to sign in to your ${brandName} account.`
    : `Thanks for signing up with ${brandName}. Please enter the 6-digit code below to verify your email address.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:24px auto;padding:0 16px;">
    <tr>
      <td style="padding:24px;border:1px solid #e5e7eb;border-radius:12px;background-color:#ffffff;">
        <p style="margin:0 0 16px 0;font-size:15px;font-weight:700;color:#ea580c;">${brandName}</p>
        <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#111827;">${heading}</h1>
        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#4b5563;">Hi ${name},</p>
        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#4b5563;">${leadText}</p>
        <div style="margin:0 0 20px 0;padding:16px;background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;text-align:center;">
          <span style="font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:700;letter-spacing:6px;color:#c2410c;">${otp}</span>
        </div>
        <p style="margin:0 0 12px 0;font-size:13px;color:#6b7280;">This code expires in ${expiryMinutes} minutes. Do not share it with anyone.</p>
        <p style="margin:0;font-size:12px;color:#9ca3af;">If you did not request this, you can safely ignore this email. Questions? Reply to <a href="mailto:${supportEmail}" style="color:#ea580c;text-decoration:none;">${supportEmail}</a>.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Dispatch an email via Brevo REST API
 *
 * @param {Object} payload
 * @param {string} payload.toEmail - Recipient email address
 * @param {string} payload.toName - Recipient display name
 * @param {string} payload.subject - Email subject line
 * @param {string} payload.htmlContent - Formatted HTML body
 * @param {string} [payload.textContent] - Optional plain text alternative
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendBrevoEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  const apiKey = (ENV.BREVO_API_KEY || '').trim();
  const senderEmail = (ENV.BREVO_SENDER_EMAIL || '').trim();
  const senderName = (ENV.BREVO_SENDER_NAME || 'Crave Courier').trim();

  if (!apiKey || !senderEmail) {
    console.warn(
      '[BREVO EMAIL] Skipping live email dispatch: BREVO_API_KEY or BREVO_SENDER_EMAIL is not configured in environment.'
    );
    return { success: false, error: 'Brevo credentials not configured' };
  }

  try {
    const payload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: toEmail,
          name: toName || toEmail.split('@')[0],
        },
      ],
      replyTo: {
        name: senderName,
        email: senderEmail,
      },
      subject,
      htmlContent,
      ...(textContent && { textContent }),
    };

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[BREVO EMAIL ERROR]', response.status, data);
      return {
        success: false,
        error: data.message || `Brevo API returned status ${response.status}`,
      };
    }

    console.info(`[BREVO EMAIL SENT] Successfully sent to ${toEmail}. Message ID: ${data.messageId}`);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('[BREVO EMAIL EXCEPTION]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Account Verification OTP Email
 */
export async function sendVerificationOtpEmail({ toEmail, toName, otp, expiryMinutes = 15 }) {
  const htmlContent = generateOtpEmailHtml({
    name: toName || 'Foodie',
    otp,
    type: 'verification',
    expiryMinutes,
    brandName: 'Crave Courier',
    supportEmail: ENV.BREVO_SENDER_EMAIL || 'ayaz56465@gmail.com',
  });

  return await sendBrevoEmail({
    toEmail,
    toName,
    subject: `${otp} is your Crave Courier verification code`,
    htmlContent,
    textContent: `Hi ${toName || 'there'},\n\nYour 6-digit verification code for Crave Courier is: ${otp}\n\nThis code is valid for ${expiryMinutes} minutes. Please do not share it with anyone.`,
  });
}

/**
 * Send One-Time Login OTP Email
 */
export async function sendLoginOtpEmail({ toEmail, toName, otp, expiryMinutes = 15 }) {
  const htmlContent = generateOtpEmailHtml({
    name: toName || 'Customer',
    otp,
    type: 'login',
    expiryMinutes,
    brandName: 'Crave Courier',
    supportEmail: ENV.BREVO_SENDER_EMAIL || 'ayaz56465@gmail.com',
  });

  return await sendBrevoEmail({
    toEmail,
    toName,
    subject: `${otp} is your Crave Courier sign-in code`,
    htmlContent,
    textContent: `Hi ${toName || 'there'},\n\nYour 6-digit one-time sign-in code for Crave Courier is: ${otp}\n\nThis code is valid for ${expiryMinutes} minutes. Please do not share it with anyone.`,
  });
}

/**
 * Send Password Reset OTP Email
 */
export async function sendPasswordResetOtpEmail({ toEmail, toName, otp, expiryMinutes = 15 }) {
  const htmlContent = generateOtpEmailHtml({
    name: toName || 'Customer',
    otp,
    type: 'reset',
    expiryMinutes,
    brandName: 'Crave Courier',
    supportEmail: ENV.BREVO_SENDER_EMAIL || 'ayaz56465@gmail.com',
  });

  return await sendBrevoEmail({
    toEmail,
    toName,
    subject: `${otp} is your Crave Courier password reset code`,
    htmlContent,
    textContent: `Hi ${toName || 'there'},\n\nWe received a request to reset your password for Crave Courier. Your reset code is: ${otp}\n\nThis code is valid for ${expiryMinutes} minutes. If you did not make this request, you can ignore this email.`,
  });
}
