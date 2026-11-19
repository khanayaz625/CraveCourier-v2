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
  brandName = 'Pizza 65 & Crave',
  supportEmail = 'ayaz56465@gmail.com',
}) {
  const isReset = type === 'reset';
  const isLogin = type === 'login';

  const badgeText = isReset
    ? 'PASSWORD RESET REQUEST'
    : isLogin
    ? 'ONE-TIME SIGN IN CODE'
    : 'ACCOUNT VERIFICATION';

  const heading = isReset
    ? 'Reset Your Password'
    : isLogin
    ? 'Your One-Time Login Code'
    : 'Verify Your Email Address';

  const leadText = isReset
    ? `We received a request to reset your password for your <strong>${brandName}</strong> account. Use the one-time code below to proceed with setting a new password.`
    : isLogin
    ? `Welcome back! Use the 6-digit one-time passcode below to securely sign in to your <strong>${brandName}</strong> account.`
    : `Thank you for choosing <strong>${brandName}</strong>! To complete your registration and secure your account, please enter the 6-digit verification code below.`;

  // Format OTP with clean spaced numbers (e.g. 5 2 9 1 0 4)
  const formattedOtp = String(otp).split('').join(' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${heading} - ${brandName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8F9FA;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2D3748;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #F8F9FA;
      padding: 40px 16px;
    }
    .main-table {
      max-width: 560px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid #EDF2F7;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
    }
    .header-banner {
      background: linear-gradient(135deg, #FF541E 0%, #FF7A00 100%);
      padding: 36px 32px 32px;
      text-align: center;
      color: #FFFFFF;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin: 0;
      color: #FFFFFF;
      text-transform: uppercase;
    }
    .brand-subtitle {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      opacity: 0.9;
      margin-top: 4px;
      color: #FFE3D8;
    }
    .content-body {
      padding: 36px 32px;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #FF541E;
      background-color: #FFF2ED;
      padding: 6px 14px;
      border-radius: 20px;
      margin-bottom: 16px;
    }
    .greeting {
      font-size: 22px;
      font-weight: 800;
      color: #1A202C;
      margin: 0 0 14px 0;
      line-height: 1.3;
    }
    .description {
      font-size: 14px;
      line-height: 1.6;
      color: #4A5568;
      margin: 0 0 28px 0;
    }
    .otp-card {
      background: #FFF9F6;
      border: 2px dashed #FFD4C4;
      border-radius: 18px;
      padding: 24px 20px;
      text-align: center;
      margin: 0 0 24px 0;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #8C4329;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'SF Pro Mono', 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 900;
      letter-spacing: 8px;
      color: #FF541E;
      margin: 6px 0;
      user-select: all;
    }
    .otp-expiry {
      font-size: 12px;
      font-weight: 600;
      color: #B25E3B;
      margin-top: 6px;
    }
    .security-notice {
      background-color: #F7FAFC;
      border-left: 4px solid #CBD5E0;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
      color: #718096;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .security-notice strong {
      color: #4A5568;
    }
    .divider {
      border: 0;
      border-top: 1px solid #EDF2F7;
      margin: 28px 0;
    }
    .footer {
      background-color: #FAFAFA;
      padding: 24px 32px;
      text-align: center;
      font-size: 11px;
      color: #A0AEC0;
      line-height: 1.6;
      border-top: 1px solid #EDF2F7;
    }
    .footer a {
      color: #FF541E;
      text-decoration: none;
      font-weight: 600;
    }
    .footer-address {
      margin-top: 8px;
      color: #718096;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main-table" cellpadding="0" cellspacing="0" width="100%">
      <!-- Header Banner -->
      <tr>
        <td class="header-banner">
          <h1 class="brand-title">🍕 ${brandName}</h1>
          <div class="brand-subtitle">Hyperlocal Fast Delivery & Artisan Kitchen</div>
        </td>
      </tr>

      <!-- Body Content -->
      <tr>
        <td class="content-body">
          <div class="badge">${badgeText}</div>
          <h2 class="greeting">Hi ${name},</h2>
          <p class="description">
            ${leadText}
          </p>

          <!-- OTP Box -->
          <div class="otp-card">
            <div class="otp-label">Your One-Time Passcode</div>
            <div class="otp-code">${formattedOtp}</div>
            <div class="otp-expiry">⏱️ Valid for the next <strong>${expiryMinutes} minutes</strong></div>
          </div>

          <!-- Security Tip -->
          <div class="security-notice">
            🔒 <strong>Security Tip:</strong> Never share this code with anyone, including staff or delivery partners. Our team will never ask for your verification code.
          </div>

          <p class="description" style="font-size: 12px; margin-bottom: 0;">
            If you did not initiate this request, you can safely ignore this email. Your account remains protected.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td class="footer">
          <div>Need assistance? Contact our support desk at <a href="mailto:${supportEmail}">${supportEmail}</a></div>
          <div class="footer-address">
            📍 <strong>Pizza 65</strong> &bull; Imli Ke Pass, Main Road, Chirgaon, Jhansi, UP
          </div>
          <div style="margin-top: 10px; font-size: 10px;">
            &copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.
          </div>
        </td>
      </tr>
    </table>
  </div>
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
  const senderName = (ENV.BREVO_SENDER_NAME || 'Pizza 65 & Crave').trim();

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
    brandName: 'Pizza 65 & Crave',
    supportEmail: ENV.BREVO_SENDER_EMAIL || 'ayaz56465@gmail.com',
  });

  return await sendBrevoEmail({
    toEmail,
    toName,
    subject: `Your Verification Code: ${otp} - Pizza 65 & Crave`,
    htmlContent,
    textContent: `Hi ${toName || 'there'},\n\nYour 6-digit verification code for Pizza 65 & Crave is: ${otp}\n\nThis code is valid for ${expiryMinutes} minutes. Please do not share it with anyone.`,
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
    brandName: 'Pizza 65 & Crave',
    supportEmail: ENV.BREVO_SENDER_EMAIL || 'ayaz56465@gmail.com',
  });

  return await sendBrevoEmail({
    toEmail,
    toName,
    subject: `Password Reset Code: ${otp} - Pizza 65 & Crave`,
    htmlContent,
    textContent: `Hi ${toName || 'there'},\n\nWe received a request to reset your password for Pizza 65 & Crave. Your reset code is: ${otp}\n\nThis code is valid for ${expiryMinutes} minutes. If you did not make this request, you can ignore this email.`,
  });
}
