import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendOtpEmail } from "@/lib/mailer";

const prisma = new PrismaClient();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string" || email.trim() === "") {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address format." },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address. OTP not sent." },
        { status: 404 }
      );
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Invalidate any older unused OTPs for this email
    await prisma.passwordResetOtp.updateMany({
      where: { email: trimmedEmail, used: false },
      data: { used: true },
    });

    // Save new OTP
    await prisma.passwordResetOtp.create({
      data: {
        email: trimmedEmail,
        otp,
        expiresAt,
        used: false,
      },
    });

    console.log(`[AUTH/OTP] Generated OTP for ${trimmedEmail}: ${otp} (expires in 10m)`);

    // Dispatch real email via SMTP and await transmission
    const mailResult = await sendOtpEmail(trimmedEmail, otp);
    console.log(`[AUTH/OTP] Mailer dispatch result for ${trimmedEmail}:`, mailResult);

    return NextResponse.json(
      {
        success: true,
        message: "OTP sent successfully to your registered email.",
        email: trimmedEmail,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while sending OTP." },
      { status: 500 }
    );
  }
}
