/*
  Responsive, email-client-friendly welcome email sent right after signup.
  Table layout + inline styles (same conventions as otpEmailTemplate) so it
  renders consistently across Gmail, Outlook, Apple Mail, and mobile clients.
  Branding matches the site's divine theme (purple → maroon → saffron).
*/
const welcomeEmailTemplate = (name = '', siteUrl = 'http://localhost:3000') => {
  const features = [
    {
      icon: '🕉️',
      title: 'Sacred Collection',
      text: 'Idols & statues, japa malas, incense & dhoop, puja essentials and more.'
    },
    {
      icon: '🧞',
      title: 'ShopGenie AI Assistant',
      text: 'Ask our AI to compare products or suggest the perfect pick for you.'
    },
    {
      icon: '🎟️',
      title: 'Coupons & Offers',
      text: 'Grab active coupon codes on product pages and save on every order.'
    },
    {
      icon: '🚚',
      title: 'Free & Fast Delivery',
      text: 'Free delivery on all orders, with live order tracking till your door.'
    },
    {
      icon: '🔒',
      title: 'Secure Payments',
      text: '100% protected checkout with easy 7-day returns on every item.'
    }
  ]
    .map(
      (f) => `
      <tr>
        <td style="padding:10px 0;vertical-align:top;width:44px;">
          <div style="width:38px;height:38px;line-height:38px;text-align:center;font-size:19px;
            background:#fff7ed;border:1px solid #fde68a;border-radius:10px;">
            ${f.icon}
          </div>
        </td>
        <td style="padding:10px 0 10px 12px;vertical-align:top;">
          <div style="font-size:14px;font-weight:700;color:#3b0764;">${f.title}</div>
          <div style="font-size:13px;color:#6b7280;line-height:1.5;margin-top:2px;">${f.text}</div>
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
    <title>Welcome to PoojaMart</title>
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
              <td style="background:linear-gradient(135deg,#3b0764,#7c2d12 55%,#b45309);padding:36px 24px;text-align:center;">
                <div style="width:64px;height:64px;line-height:64px;margin:0 auto 12px;text-align:center;
                  font-size:30px;background:#fbbf24;border-radius:50%;
                  box-shadow:0 0 0 4px rgba(253,230,138,0.4);">
                  🕉️
                </div>
                <div style="font-size:28px;font-weight:800;color:#fbbf24;letter-spacing:0.5px;">
                  PoojaMart
                </div>
                <div style="font-size:11px;color:#fde68a;letter-spacing:3px;margin-top:4px;">
                  DIVINE ESSENTIALS
                </div>
              </td>
            </tr>

            <!-- Welcome -->
            <tr>
              <td style="padding:32px 28px 8px;">
                <h1 style="font-size:22px;color:#3b0764;margin:0 0 12px;">
                  🙏 Welcome${name ? ', ' + name : ''}!
                </h1>
                <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 8px;">
                  Your account has been created successfully. We're delighted to have
                  you in the <strong>PoojaMart</strong> family — your one-stop store for
                  divine and spiritual essentials that bring
                  <strong style="color:#b45309;">peace, positivity and blessings</strong> to your home.
                </p>
              </td>
            </tr>

            <!-- Features -->
            <tr>
              <td style="padding:8px 28px 4px;">
                <div style="font-size:13px;font-weight:700;color:#9a3412;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px;">
                  What awaits you
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${features}
                </table>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding:20px 28px 8px;" align="center">
                <a href="${siteUrl}/products"
                  style="display:inline-block;background:linear-gradient(135deg,#ea580c,#f59e0b);
                  color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;
                  padding:14px 40px;border-radius:50px;
                  box-shadow:0 8px 20px rgba(234,88,12,0.35);">
                  🛍️ Start Shopping
                </a>
                <p style="font-size:12px;color:#9ca3af;margin:14px 0 0;">
                  Tip: try our AI assistant ShopGenie for personalised suggestions ✨
                </p>
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
              <td style="padding:20px 28px 28px;text-align:center;">
                <p style="font-size:12px;color:#9ca3af;margin:0 0 4px;">
                  Need help? Our support team is available 24/7 at
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

module.exports = welcomeEmailTemplate;
