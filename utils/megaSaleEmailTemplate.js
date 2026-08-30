/*
  "Mega Sale started" email — sent to every customer when the admin makes a
  product the new hero (mega sale) product. Table layout + inline styles (same
  conventions as welcomeEmailTemplate) so it renders across Gmail, Outlook,
  Apple Mail and mobile. The CTA button links straight to the product in the app.
*/
const megaSaleEmailTemplate = (
  product,
  siteUrl = 'http://localhost:3000',
  name = '',
  imageSrc = ''
) => {
  const price = Number(product.price) || 0;
  /* Hero banner advertises 50% OFF, so mirror that here. */
  const oldPrice = Math.round(price * 2);
  const productUrl = `${siteUrl}/product/${product._id}`;

  const shortDesc = product.shortDescription || product.description || '';

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mega Sale Started</title>
  </head>
  <body style="margin:0;padding:0;background:#fff7ed;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
            style="max-width:540px;background:#ffffff;border-radius:20px;overflow:hidden;
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
                  🕉️
                </div>
                <div style="font-size:26px;font-weight:800;color:#fbbf24;letter-spacing:0.5px;">
                  PoojaMart
                </div>
                <div style="display:inline-block;margin-top:10px;background:#dc2626;color:#fff;
                  font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 16px;border-radius:30px;">
                  🔥 MEGA SALE IS LIVE
                </div>
              </td>
            </tr>

            <!-- Intro -->
            <tr>
              <td style="padding:28px 28px 6px;text-align:center;">
                <h1 style="font-size:23px;color:#b91c1c;margin:0 0 8px;">
                  The Mega Sale has started! 🎉
                </h1>
                <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0;">
                  ${name ? 'Hi <strong>' + name + '</strong>, a' : 'A'} new deal just went live —
                  don't miss this limited-time offer.
                </p>
              </td>
            </tr>

            <!-- Product card -->
            <tr>
              <td style="padding:18px 28px 4px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                  style="border:1px solid #fde68a;border-radius:16px;overflow:hidden;background:#fffdf8;">
                  ${
                    imageSrc
                      ? `<tr>
                    <td style="padding:0;">
                      <img src="${imageSrc}" alt="${product.name}" width="540"
                        style="width:100%;max-height:260px;object-fit:cover;display:block;" />
                    </td>
                  </tr>`
                      : ''
                  }
                  <tr>
                    <td style="padding:18px 20px 20px;">
                      <div style="display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);
                        color:#fff;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;margin-bottom:10px;">
                        50% OFF · Limited Time
                      </div>
                      <div style="font-size:19px;font-weight:800;color:#3b0764;margin-bottom:6px;">
                        ${product.name}
                      </div>
                      ${
                        shortDesc
                          ? `<div style="font-size:13px;color:#6b7280;line-height:1.5;margin-bottom:12px;">${shortDesc}</div>`
                          : ''
                      }
                      <div>
                        <span style="font-size:24px;font-weight:800;color:#16a34a;">₹${price}</span>
                        <span style="font-size:15px;color:#9ca3af;text-decoration:line-through;margin-left:8px;">₹${oldPrice}</span>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding:22px 28px 6px;" align="center">
                <a href="${productUrl}"
                  style="display:inline-block;background:linear-gradient(135deg,#ea580c,#f59e0b);
                  color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;
                  padding:15px 44px;border-radius:50px;
                  box-shadow:0 8px 20px rgba(234,88,12,0.35);">
                  🛒 Shop This Deal Now →
                </a>
                <p style="font-size:12px;color:#9ca3af;margin:14px 0 0;">
                  Hurry — mega sale prices won't last long! ⏳
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
              <td style="padding:18px 28px 28px;text-align:center;">
                <p style="font-size:12px;color:#9ca3af;margin:0 0 4px;">
                  You're receiving this because you have a PoojaMart account.
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

module.exports = megaSaleEmailTemplate;
