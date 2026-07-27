const nodemailer = require('nodemailer');
require('dotenv').config({ path: './backend/.env' });

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL;
const INQUIRY_TO_EMAIL = process.env.INQUIRY_TO_EMAIL;

console.log('Testing SMTP Configuration:');
console.log('Host:', SMTP_HOST);
console.log('Port:', SMTP_PORT);
console.log('Secure:', SMTP_SECURE);
console.log('User:', SMTP_USER);
console.log('From:', SMTP_FROM_EMAIL);
console.log('To:', INQUIRY_TO_EMAIL);
console.log('\nAttempting to send test email...\n');

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

transporter.sendMail({
  from: SMTP_FROM_EMAIL,
  to: INQUIRY_TO_EMAIL,
  subject: 'Test Email from Arkan Arabia',
  text: 'This is a test email to verify SMTP configuration.',
  html: '<p>This is a test email to verify SMTP configuration.</p>'
})
.then(() => {
  console.log('✅ Email sent successfully!');
  process.exit(0);
})
.catch((err) => {
  console.error('❌ Failed to send email:');
  console.error(err.message);
  console.error('\nFull error:', err);
  process.exit(1);
});
