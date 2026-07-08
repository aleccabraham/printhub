const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS
);

if (!smtpConfigured) {
  console.log(
    '[config] SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS not fully set — emails will be logged to the console instead of sent.'
  );
}

const config = {
  port: Number(process.env.PORT) || 4000,
  // TEMPORARY testing value — swap later by changing this env var only, no code change needed.
  adminEmail: process.env.ADMIN_EMAIL || 'alexabrahametc@gmail.com',
  smtp: {
    configured: smtpConfigured,
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  // Path (relative to server/) to the static UPI/GPay QR code image. Placeholder until supplied.
  paymentQrImage: process.env.PAYMENT_QR_IMAGE || 'uploads/payment-qr.png',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
};

module.exports = config;
