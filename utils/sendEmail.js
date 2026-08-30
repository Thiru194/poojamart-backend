const nodemailer = require('nodemailer');

/*
  Create the transporter ONCE and reuse it for every email.

  `pool: true` keeps a set of SMTP connections open and alive, so we don't pay
  the TLS handshake + Gmail auth cost on every send (that was the main cause of
  the 10–20s delay). Subsequent emails reuse an already-authenticated socket.
*/
const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* Warm the pool up front so the first real email isn't the slow one. */
transporter.verify().catch((err) => {
  console.log('Email transporter verify failed:', err.message);
});

const sendEmail = async (email, subject, html, attachments = []) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html,
    attachments
  });
};

module.exports = sendEmail;
