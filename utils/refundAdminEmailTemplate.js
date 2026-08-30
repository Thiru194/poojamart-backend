/*
  Admin notification email — sent to the store inbox when a customer submits a
  refund request. Includes the request details and any evidence photos the
  customer attached (embedded via CID so they render reliably in Gmail, unlike
  localhost image URLs). Table layout + inline styles, matching the other
  templates.
*/
const refundAdminEmailTemplate = (refund = {}, imageCids = []) => {
  const rows = [
    { label: '🧾 Order', value: refund.orderNumber || 'N/A' },
    { label: '📦 Product', value: refund.productName || 'N/A' },
    { label: '👤 Customer', value: refund.userName || 'N/A' },
    { label: '✉️ Email', value: refund.email || 'N/A' },
    { label: '📝 Reason', value: refund.reason || 'N/A' },
    { label: '🗒️ Description', value: refund.description || '—' }
  ]
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#6b7280;width:130px;vertical-align:top;">${r.label}</td>
        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${r.value}</td>
      </tr>`
    )
    .join('');

  const imagesHtml = (imageCids || [])
    .map(
      (cid) => `
      <img src="cid:${cid}" width="120"
        style="width:120px;height:120px;object-fit:cover;border-radius:10px;
        border:1px solid #e5e7eb;margin:4px;" />`
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Refund Request</title>
  </head>
  <body style="margin:0;padding:0;background:#fff7ed;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
            style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;
            box-shadow:0 10px 30px rgba(124,45,18,0.18);">

            <tr>
              <td style="height:4px;background:linear-gradient(90deg,#fde68a,#f59e0b,#fde68a);font-size:0;line-height:0;">&nbsp;</td>
            </tr>

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#3b0764,#7c2d12 55%,#b45309);padding:26px 24px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#fbbf24;">PoojaMart Admin</div>
                <div style="display:inline-block;margin-top:10px;background:#dc2626;color:#fff;
                  font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 16px;border-radius:30px;">
                  🔔 NEW REFUND REQUEST
                </div>
              </td>
            </tr>

            <!-- Details -->
            <tr>
              <td style="padding:24px 28px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${rows}
                </table>
              </td>
            </tr>

            <!-- Photos -->
            ${
              imagesHtml
                ? `<tr>
              <td style="padding:12px 28px 4px;">
                <div style="font-size:12px;font-weight:700;color:#9a3412;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">
                  📷 Evidence Photos
                </div>
                <div>${imagesHtml}</div>
              </td>
            </tr>`
                : ''
            }

            <!-- CTA -->
            <tr>
              <td style="padding:20px 28px 8px;" align="center">
                <a href="http://localhost:3000/admin/refunds"
                  style="display:inline-block;background:linear-gradient(135deg,#ea580c,#f59e0b);
                  color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;
                  padding:13px 36px;border-radius:50px;box-shadow:0 8px 20px rgba(234,88,12,0.35);">
                  Review Refund →
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 28px 26px;text-align:center;">
                <p style="font-size:12px;color:#9ca3af;margin:0;">
                  © PoojaMart — Divine Essentials. Internal notification.
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

module.exports = refundAdminEmailTemplate;
