import nodemailer from "nodemailer";

export async function sendOtpEmail(to: string, otp: string): Promise<{ sent: boolean; previewUrl?: string; error?: string }> {
  try {
    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #27272a;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #6366f1; font-size: 26px; margin: 0 0 8px 0; font-weight: 800;">Antigravity Blog</h1>
          <p style="color: #a1a1aa; font-size: 14px; margin: 0;">Password Recovery Request</p>
        </div>
        
        <div style="background-color: #18181b; padding: 24px; border-radius: 8px; border: 1px solid #3f3f46; text-align: center;">
          <p style="color: #e4e4e7; font-size: 15px; margin: 0 0 16px 0;">Use the following One-Time Password (OTP) to reset your account password:</p>
          
          <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 16px 24px; border-radius: 8px; display: inline-block; margin: 12px 0 20px 0;">
            ${otp}
          </div>
          
          <p style="color: #a1a1aa; font-size: 13px; margin: 0;">⏱️ This code is valid for <strong>10 minutes</strong> and can only be used once.</p>
        </div>
        
        <p style="color: #71717a; font-size: 12px; text-align: center; margin-top: 24px;">
          If you did not request a password reset, please ignore this email or secure your account.
        </p>
      </div>
    `;

    if (user && pass) {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // Direct SSL
        auth: {
          user,
          pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      const senderFrom = `"Antigravity Blog" <${user}>`;

      const info = await transporter.sendMail({
        from: senderFrom,
        to,
        subject: `Your Password Reset OTP: ${otp}`,
        text: `Your password recovery OTP is: ${otp}. It will expire in 10 minutes.`,
        html: htmlContent,
      });

      console.log(`[MAILER/SUCCESS] OTP email dispatched via Gmail SMTP to ${to}. MessageId: ${info.messageId}`);
      return { sent: true };
    } else {
      console.log(`\n======================================================`);
      console.log(`[MAILER/DEV] ✉️  SIMULATED EMAIL TO: ${to}`);
      console.log(`[MAILER/DEV] 🔑  OTP CODE: ${otp}`);
      console.log(`[MAILER/DEV] 💡  To send real emails to your inbox, set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local`);
      console.log(`======================================================\n`);
      return { sent: true };
    }
  } catch (error: any) {
    console.error(`[MAILER/ERROR] Failed to send email to ${to}:`, error);
    return { sent: false, error: error.message };
  }
}
