const nodemailer = require('nodemailer');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const userMatch = envContent.match(/GMAIL_USER=([^\r\n]+)/);
const passMatch = envContent.match(/GMAIL_APP_PASSWORD=([^\r\n]+)/);

const user = userMatch ? userMatch[1].trim() : '';
const pass = passMatch ? passMatch[1].trim() : '';

console.log('Testing SMTP with User:', user, 'Pass Length:', pass.length);

async function test() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 15000,
  });

  try {
    const verified = await transporter.verify();
    console.log('Transporter verification SUCCESS:', verified);
    const info = await transporter.sendMail({
      from: `"Antigravity Blog" <${user}>`,
      to: user,
      subject: 'Test Verification OTP',
      text: 'Testing OTP delivery: 123456'
    });
    console.log('Email sent successfully! MessageId:', info.messageId);
  } catch (err) {
    console.error('SMTP Error:', err);
  }
}
test();
