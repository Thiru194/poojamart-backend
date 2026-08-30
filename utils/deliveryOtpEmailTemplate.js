/*
  Delivery OTP email — sent when an order goes "Out For Delivery". The customer
  shares this code with the delivery partner at the door, who enters it to
  confirm handover. Table layout + inline styles (same conventions as the other
  templates) so it renders across Gmail, Outlook, Apple Mail and mobile.
*/
const deliveryOtpEmailTemplate = (name = '', otp = '', items = []) => {
  const digits = String(otp)
    .split('')
    .map(
      (d) => `
        <span style="display:inline-block;width:44px;height:54px;line-height:54px;
          margin:0 5px;text-align:center;font-size:26px;font-weight:800;color:#3b0764;
          background:#fff7ed;border:2px solid #f59e0b;border-radius:12px;">${d}</span>`
    )
    .join('');

  /* List of products arriving in this delivery. */
  const itemsHtml = (Array.isArray(items) ? items : [])
    .map(
      (item) => `
        <tr>
          <td style="padding:9px 0;border-bottom:1px solid #f3ede1;font-size:14px;color:#3b0764;font-weight:600;">
            🔸 ${item.name}
          </td>
          <td style="padding:9px 0;border-bottom:1px solid #f3ede1;font-size:13px;color:#6b7280;text-align:right;white-space:nowrap;">
            Qty: ${item.quantity}
          </td>
        </tr>`
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Delivery OTP</title>
  </head>
  <body style="margin:0;padding:0;background:#fff7ed;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
            style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;
            box-shadow:0 10px 30px rgba(124,45,18,0.18);">

            <!-- Gold thread -->
            <tr>
              <td style="height:4px;background:linear-gradient(90deg,#fde68a,#f59e0b,#fde68a);font-size:0;line-height:0;">&nbsp;</td>
            </tr>

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#3b0764,#7c2d12 55%,#b45309);padding:30px 24px;text-align:center;">
                <div style="width:60px;height:60px;line-height:60px;margin:0 auto 10px;text-align:center;
                  font-size:28px;background:#fbbf24;border-radius:50%;
                  box-shadow:0 0 0 4px rgba(253,230,138,0.4);">
                  🚚
                </div>
                <div style="font-size:24px;font-weight:800;color:#fbbf24;letter-spacing:0.5px;">
                  PoojaMart
                </div>
                <div style="display:inline-block;margin-top:10px;background:#06b6d4;color:#fff;
                  font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 16px;border-radius:30px;">
                  🛵 OUT FOR DELIVERY
                </div>
              </td>
            </tr>

            <!-- Intro -->
            <tr>
              <td style="padding:28px 28px 6px;text-align:center;">
                <h1 style="font-size:21px;color:#3b0764;margin:0 0 8px;">
                  ${name ? '<strong>' + name + '</strong>, your' : 'Your'} order is on the way! 🎉
                </h1>
                <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0;">
                  Share the code below with the delivery partner to confirm you
                  received your order.
                </p>
              </td>
            </tr>

            <!-- Items arriving -->
            ${
              itemsHtml
                ? `<tr>
              <td style="padding:22px 28px 0;">
                <div style="font-size:12px;font-weight:700;color:#9a3412;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">
                  📦 Arriving in this delivery
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${itemsHtml}
                </table>
              </td>
            </tr>`
                : ''
            }

            <!-- OTP -->
            <tr>
              <td style="padding:22px 20px 6px;text-align:center;">
                <div style="font-size:12px;font-weight:700;color:#9a3412;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">
                  Your Delivery Code
                </div>
                <div>${digits}</div>
              </td>
            </tr>

            <!-- Warning -->
            <tr>
              <td style="padding:18px 28px 6px;">
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 16px;text-align:center;">
                  <p style="font-size:13px;color:#9a3412;margin:0;line-height:1.6;">
                    🔒 <strong>Only share this code when your order is handed to you.</strong>
                    Do not share it earlier — it confirms your delivery.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding:18px 28px 0;">
                <div style="border-top:1px solid #fde68a;"></div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:18px 28px 28px;text-align:center;">
                <p style="font-size:12px;color:#9ca3af;margin:0 0 4px;">
                  Didn't expect this? Contact us at
                  <a href="mailto:support@shopease.com" style="color:#b45309;text-decoration:none;">support@shopease.com</a>
                </p>
                <p style="font-size:12px;color:#9ca3af;margin:0;">
                  © PoojaMart — Divine Essentials. All rights reserved.
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

module.exports = deliveryOtpEmailTemplate;
