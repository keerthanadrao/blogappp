import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/mailer";

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

    // Check if user exists (case-tolerant match)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.trim() },
          { email: trimmedEmail },
          { email: email.trim().toUpperCase() },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address. OTP not sent." },
        { status: 404 }
      );
    }

    const targetEmail = user.email;

    // 1. Check 60-second cooldown between requests for this email
    const latestOtp = await prisma.passwordResetOtp.findFirst({
      where: {
        OR: [{ email: targetEmail }, { email: trimmedEmail }],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (latestOtp) {
      const elapsedMs = Date.now() - new Date(latestOtp.createdAt).getTime();
      if (elapsedMs < 60 * 1000) {
        const remainingCooldownSec = Math.ceil((60 * 1000 - elapsedMs) / 1000);
        return NextResponse.json(
          {
            error: "Please wait before requesting another code.",
            cooldownSeconds: remainingCooldownSec,
            resendAvailableAt: new Date(
              new Date(latestOtp.createdAt).getTime() + 60 * 1000
            ).toISOString(),
          },
          { status: 429 }
        );
      }
    }

    // 2. Check maximum 5 verification requests within 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequestsCount = await prisma.passwordResetOtp.count({
      where: {
        OR: [{ email: targetEmail }, { email: trimmedEmail }],
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (recentRequestsCount >= 5) {
      return NextResponse.json(
        {
          error:
            "You have reached the maximum of 5 verification requests per hour. Please try again later.",
          hourlyLimitReached: true,
        },
        { status: 429 }
      );
    }

    // Generate 6-digit numeric verification code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration
    const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60s cooldown

    // Invalidate any older unused OTPs for this email
    await prisma.passwordResetOtp.updateMany({
      where: {
        OR: [{ email: targetEmail }, { email: trimmedEmail }],
        used: false,
      },
      data: { used: true },
    });

    // Save new OTP record in database with attempts = 0
    await prisma.passwordResetOtp.create({
      data: {
        email: targetEmail,
        otp,
        expiresAt,
        used: false,
        attempts: 0,
      },
    });

    console.log(`[AUTH/OTP] Generated 6-digit OTP for ${targetEmail}: ${otp} (expires in 10m)`);

    // Dispatch email via existing Nodemailer implementation with non-blocking race
    Promise.race([
      sendOtpEmail(targetEmail, otp),
      new Promise((resolve) => setTimeout(() => resolve({ sent: true }), 2500))
    ]).catch((err) => {
      console.error(`[AUTH/OTP] Background mail dispatch error for ${targetEmail}:`, err);
    });

    return NextResponse.json(
      {
        success: true,
        message: "OTP sent successfully to your registered email.",
        email: targetEmail,
        expiresAt: expiresAt.toISOString(),
        expiresInSeconds: 600,
        cooldownSeconds: 60,
        resendAvailableAt: resendAvailableAt.toISOString(),
        requestsCountLastHour: recentRequestsCount + 1,
        requestsRemaining: Math.max(0, 5 - (recentRequestsCount + 1)),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred while sending OTP." },
      { status: 500 }
    );
  }
}
