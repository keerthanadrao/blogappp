import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, otp, newPassword } = body;

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

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    // Verify active OTP record
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

    // Check expiration
    if (new Date(otpRecord.expiresAt).getTime() <= Date.now()) {
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { used: true },
      });
      return NextResponse.json(
        { error: "Verification code expired. Please request a new code.", expired: true },
        { status: 400 }
      );
    }

    // Check attempts limit
    const currentAttempts = Number(otpRecord.attempts || 0);
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
        },
        { status: 400 }
      );
    }

    // Compare OTP
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

    // Find the user to update
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
        { error: "User account not found." },
        { status: 404 }
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: passwordHash },
    });

    // Mark OTP as used
    await prisma.passwordResetOtp.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Password has been successfully reset. You can now login with your new password.",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while resetting password." },
      { status: 500 }
    );
  }
}
