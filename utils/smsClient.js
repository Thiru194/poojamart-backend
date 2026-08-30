/*
  Sends a plain SMS via Twilio's REST API using the built-in fetch (no SDK
  dependency). Configure in .env:

    TWILIO_ACCOUNT_SID   = ACxxxxxxxx
    TWILIO_AUTH_TOKEN    = your auth token
    TWILIO_SMS_FROM      = +1234567890   (your Twilio phone number)
    DEFAULT_COUNTRY_CODE = 91   (optional, used for local numbers without a +)

  If credentials are missing, it logs the message to the console instead of
  sending (dev-friendly fallback) so the delivery flow never breaks. Drop in the
  real credentials and it starts sending — no other code changes.
*/

/* Normalise a stored phone (e.g. "8838974963") to E.164 ("+918838974963"). */
const formatPhone = (phone) => {
  if (!phone) {
    return '';
  }

  let p = String(phone).replace(/[^\d+]/g, '');

  if (!p) {
    return '';
  }

  if (!p.startsWith('+')) {
    const cc = process.env.DEFAULT_COUNTRY_CODE || '91';

    /* A 10-digit local number → prefix the default country code. */
    p = p.length === 10 ? `+${cc}${p}` : `+${p}`;
  }

  return p;
};

const sendSms = async (toPhone, body) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;

  const to = formatPhone(toPhone);

  /* No credentials (or no valid destination) — log and no-op. */
  if (!sid || !token || !from || !to) {
    console.log(`[SMS stub] → ${to || toPhone}: ${body.replace(/\n/g, ' ')}`);

    return { stubbed: true };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const params = new URLSearchParams({ From: from, To: to, Body: body });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(`Twilio ${response.status}: ${text}`);
  }

  return response.json();
};

module.exports = sendSms;
