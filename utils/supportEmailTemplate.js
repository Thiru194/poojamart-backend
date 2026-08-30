/*
  Shared branded template for support / transactional emails (tickets,
  refunds). Table layout + inline styles (same conventions as the OTP and
  welcome templates) so it renders consistently across Gmail, Outlook,
  Apple Mail, and mobile clients. Branding matches the site's divine theme.

  Usage:
    supportEmailTemplate({
      heading:  '🎫 Ticket Updated',
      tagline:  'SUPPORT UPDATE',
      name:     'Thiru',
      intro:    'Your support ticket has been updated.',
      rows:     [{ label: 'Ticket ID', value: '...' }, ...],
      status:   'Closed',            // rendered as a coloured chip
      box:      { title: '💬 Admin Reply', text: 'process solved' },
      ctaText:  'View My Tickets',
      ctaUrl:   'http://localhost:3000/my-tickets'
    })
*/

/* Status → chip colours (text / background / border) */
const STATUS_COLORS = {
  open: { c: '#b45309', bg: '#fef3c7', bd: '#fde68a' },
  'in progress': { c: '#1d4ed8', bg: '#dbeafe', bd: '#bfdbfe' },
  closed: { c: '#15803d', bg: '#dcfce7', bd: '#bbf7d0' },
  pending: { c: '#b45309', bg: '#fef3c7', bd: '#fde68a' },
  approved: { c: '#1d4ed8', bg: '#dbeafe', bd: '#bfdbfe' },
  refunded: { c: '#15803d', bg: '#dcfce7', bd: '#bbf7d0' },
  rejected: { c: '#b91c1c', bg: '#fee2e2', bd: '#fecaca' }
};

const statusChip = (status) => {
  if (!status) return '';

  const s =
    STATUS_COLORS[String(status).toLowerCase()] || {
      c: '#374151',
      bg: '#f3f4f6',
      bd: '#e5e7eb'
    };

  return `<span style="display:inline-block;color:${s.c};background:${s.bg};
    border:1px solid ${s.bd};font-size:13px;font-weight:700;
    padding:5px 16px;border-radius:30px;">${status}</span>`;
};

const supportEmailTemplate = ({
  heading = 'PoojaMart Update',
  tagline = 'SUPPORT',
  name = '',
  intro = '',
  rows = [],
  status = '',
  box = null,
  ctaText = '',
  ctaUrl = ''
} = {}) => {
  const detailRows = rows
    .filter((r) => r && r.value !== undefined && r.value !== null && r.value !== '')
    .map(
      (r) => `
      <tr>
        <td style="padding:9px 14px;font-size:13px;color:#6b7280;white-space:nowrap;
          border-bottom:1px solid #f6f1e7;vertical-align:top;">${r.label}</td>
        <td style="padding:9px 14px;font-size:13px;color:#111827;font-weight:600;
          border-bottom:1px solid #f6f1e7;word-break:break-word;">${r.value}</td>
      </tr>`
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${heading}</title>
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
              <td style="background:linear-gradient(135deg,#3b0764,#7c2d12 55%,#b45309);padding:28px 24px;text-align:center;">
                <div style="font-size:24px;font-weight:800;color:#fbbf24;letter-spacing:0.5px;">
                  🕉️ PoojaMart
                </div>
                <div style="font-size:10px;color:#fde68a;letter-spacing:3px;margin-top:4px;">
                  ${tagline}
                </div>
              </td>
            </tr>

            <!-- Heading + intro -->
            <tr>
              <td style="padding:28px 28px 6px;">
                <h1 style="font-size:20px;color:#3b0764;margin:0 0 10px;">${heading}</h1>
                <p style="font-size:15px;color:#111827;margin:0 0 6px;">
                  Hello${name ? ' <strong>' + name + '</strong>' : ''},
                </p>
                ${
                  intro
                    ? `<p style="font-size:14px;color:#4b5563;line-height:1.7;margin:0;">${intro}</p>`
                    : ''
                }
              </td>
            </tr>

            <!-- Status chip -->
            ${
              status
                ? `<tr><td style="padding:14px 28px 2px;" align="center">${statusChip(status)}</td></tr>`
                : ''
            }

            <!-- Details table -->
            ${
              detailRows
                ? `<tr>
                    <td style="padding:16px 28px 4px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                        style="background:#fffbf5;border:1px solid #fde68a;border-radius:14px;overflow:hidden;">
                        ${detailRows}
                      </table>
                    </td>
                  </tr>`
                : ''
            }

            <!-- Message / reply box -->
            ${
              box && box.text
                ? `<tr>
                    <td style="padding:14px 28px 2px;">
                      <div style="font-size:12px;font-weight:700;color:#9a3412;letter-spacing:1.5px;
                        text-transform:uppercase;margin-bottom:6px;">${box.title || 'Message'}</div>
                      <div style="background:#f8fafc;border-left:4px solid #f59e0b;border-radius:0 12px 12px 0;
                        padding:14px 16px;font-size:14px;color:#374151;line-height:1.6;">
                        ${box.text}
                      </div>
                    </td>
                  </tr>`
                : ''
            }

            <!-- CTA -->
            ${
              ctaText && ctaUrl
                ? `<tr>
                    <td style="padding:22px 28px 6px;" align="center">
                      <a href="${ctaUrl}"
                        style="display:inline-block;background:linear-gradient(135deg,#ea580c,#f59e0b);
                        color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;
                        padding:13px 36px;border-radius:50px;
                        box-shadow:0 8px 20px rgba(234,88,12,0.35);">
                        ${ctaText}
                      </a>
                    </td>
                  </tr>`
                : ''
            }

            <!-- Divider -->
            <tr>
              <td style="padding:18px 28px 0;">
                <div style="border-top:1px solid #fde68a;"></div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:18px 28px 26px;text-align:center;">
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

module.exports = supportEmailTemplate;
