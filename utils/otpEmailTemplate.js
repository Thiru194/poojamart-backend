/*
  Responsive, email-client-friendly HTML template for the password-reset OTP.
  Uses table layout + inline styles so it renders consistently across Gmail,
  Outlook, Apple Mail, and mobile clients.
*/
const otpEmailTemplate = (otp, name = '', expiryMinutes = 10) => {
  const digits = String(otp)
    .split('')
    .map(
      (d) =>
        `<td style="padding:0 6px;">
          <div style="width:44px;height:56px;line-height:56px;text-align:center;
            font-size:26px;font-weight:700;color:#4f46e5;background:#f5f3ff;
            border:2px solid #ddd6fe;border-radius:12px;font-family:Arial,Helvetica,sans-serif;">
            ${d}
          </div>
        </td>`
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Password Reset OTP</title>
  </head>
  <body style="margin:0;padding:0;background:#eef2ff;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
            style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;
            box-shadow:0 10px 30px rgba(79,70,229,0.15);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 24px;text-align:center;">
                <div style="font-size:26px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                  🛍 PoojaMart
                </div>
                <div style="font-size:14px;color:#e0e7ff;margin-top:6px;">
                  Password Reset Request
                </div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px 28px;">
                <p style="font-size:16px;color:#111827;margin:0 0 10px;">
                  Hi${name ? ' ' + name : ''},
                </p>
                <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 24px;">
                  We received a request to reset your password. Use the one-time
                  code below to continue. This code is valid for
                  <strong>${expiryMinutes} minutes</strong>.
                </p>

                <!-- OTP boxes -->
                <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 16px;">
                  <tr>${digits}</tr>
                </table>

                <!-- Selectable full code (tap & hold / triple-click to copy) -->
                <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 8px;">
                  <tr>
                    <td style="background:#f5f3ff;border:1px dashed #c4b5fd;border-radius:12px;padding:12px 22px;">
                      <span style="font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:700;
                        letter-spacing:6px;color:#4f46e5;-webkit-user-select:all;user-select:all;">${otp}</span>
                    </td>
                  </tr>
                </table>

                <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0 0 22px;">
                  Tap and hold (or triple-click) the code above to copy it
                </p>

                <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0 0 6px;text-align:center;">
                  Didn't request this? You can safely ignore this email —
                  your password won't change.
                </p>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding:0 28px;">
                <div style="border-top:1px solid #e5e7eb;"></div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 28px 28px;text-align:center;">
                <p style="font-size:12px;color:#9ca3af;margin:0 0 4px;">
                  Need help? Contact us at
                  <a href="mailto:support@shopease.com" style="color:#7c3aed;text-decoration:none;">support@shopease.com</a>
                </p>
                <p style="font-size:12px;color:#9ca3af;margin:0;">
                  © PoojaMart E-Commerce. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
};

module.exports = otpEmailTemplate;
