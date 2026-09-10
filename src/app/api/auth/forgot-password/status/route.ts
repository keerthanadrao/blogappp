import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email || email.trim() === "") {
      return NextResponse.json(
        { error: "Email query parameter is required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Query active unused OTP
    const activeOtp = await prisma.passwordResetOtp.findFirst({
      where: {
        OR: [{ email: email.trim() }, { email: trimmedEmail }],
        used: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Query latest OTP for cooldown
    const latestOtp = await prisma.passwordResetOtp.findFirst({
      where: {
        OR: [{ email: email.trim() }, { email: trimmedEmail }],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Check 1-hour request limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const requestsCountLastHour = await prisma.passwordResetOtp.count({
      where: {
        OR: [{ email: email.trim() }, { email: trimmedEmail }],
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    let cooldownSeconds = 0;
    let resendAvailableAt: string | null = null;

    if (latestOtp) {
      const elapsedMs = Date.now() - new Date(latestOtp.createdAt).getTime();
      if (elapsedMs < 60 * 1000) {
        cooldownSeconds = Math.ceil((60 * 1000 - elapsedMs) / 1000);
        resendAvailableAt = new Date(
          new Date(latestOtp.createdAt).getTime() + 60 * 1000
        ).toISOString();
      }
    }

    let hasActiveCode = false;
    let expiresAt: string | null = null;
    let expiresInSeconds = 0;
    let isExpired = false;
    let attemptsRemaining = 5;
    let codeInvalidated = false;

    if (activeOtp) {
      hasActiveCode = true;
      expiresAt = new Date(activeOtp.expiresAt).toISOString();
      const remainingMs = new Date(activeOtp.expiresAt).getTime() - Date.now();
      expiresInSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      isExpired = remainingMs <= 0;
      const currentAttempts = Number(activeOtp.attempts || 0);
      attemptsRemaining = Math.max(0, 5 - currentAttempts);
      codeInvalidated = currentAttempts >= 5 || isExpired;
    }

    return NextResponse.json({
      email: trimmedEmail,
      hasActiveCode,
      expiresAt,
      expiresInSeconds,
      isExpired,
      attemptsRemaining,
      codeInvalidated,
      cooldownSeconds,
      resendAvailableAt,
      canResend: cooldownSeconds === 0 && requestsCountLastHour < 5,
      requestsCountLastHour,
      hourlyLimitReached: requestsCountLastHour >= 5,
    });
  } catch (error: any) {
    console.error("Error checking OTP status:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while checking status." },
      { status: 500 }
    );
  }
}
