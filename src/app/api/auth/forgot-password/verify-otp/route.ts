import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, otp } = body;

    if (!email || typeof email !== "string" || email.trim() === "") {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== "string" || otp.trim() === "") {
      return NextResponse.json(
        { error: "OTP is required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    if (!/^\d{6}$/.test(trimmedOtp)) {
      return NextResponse.json(
        { error: "OTP must be a 6-digit number." },
        { status: 400 }
      );
    }

    // Find active unused OTP record
    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        OR: [{ email: email.trim() }, { email: trimmedEmail }],
        used: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "No active verification code found. Please request a new code." },
        { status: 400 }
      );
    }

    // Check expiration (10 minutes)
    if (new Date(otpRecord.expiresAt).getTime() <= Date.now()) {
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { used: true },
      });
      return NextResponse.json(
        {
          error: "Verification code expired. Please request a new code.",
          expired: true,
        },
        { status: 400 }
      );
    }

    const currentAttempts = Number(otpRecord.attempts || 0);

    // Check if code has already reached max 5 attempts
    if (currentAttempts >= 5) {
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { used: true },
      });
      return NextResponse.json(
        {
          error:
            "Maximum attempts exceeded. This verification code has been invalidated. Please request a new code.",
          codeInvalidated: true,
          attemptsRemaining: 0,
        },
        { status: 400 }
      );
    }

    // Compare OTP code
    if (otpRecord.otp !== trimmedOtp) {
      const newAttempts = currentAttempts + 1;
      const willInvalidate = newAttempts >= 5;

      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: {
          attempts: newAttempts,
          used: willInvalidate ? true : false,
        },
      });

      if (willInvalidate) {
        return NextResponse.json(
          {
            error:
              "Maximum attempts exceeded. This verification code has been invalidated. Please request a new code.",
            codeInvalidated: true,
            attemptsRemaining: 0,
          },
          { status: 400 }
        );
      }

      const attemptsLeft = 5 - newAttempts;
      return NextResponse.json(
        {
          error: `Invalid verification code. ${attemptsLeft} attempt${
            attemptsLeft === 1 ? "" : "s"
          } remaining.`,
          attemptsRemaining: attemptsLeft,
        },
        { status: 400 }
      );
    }

    // Valid OTP
    return NextResponse.json(
      {
        success: true,
        message: "OTP verified successfully.",
        email: trimmedEmail,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while verifying OTP." },
      { status: 500 }
    );
  }
}
