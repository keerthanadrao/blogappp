import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

    // Verify OTP record
    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        email: trimmedEmail,
        otp: trimmedOtp,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Invalid or expired OTP. Verification failed." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "OTP verified successfully.",
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
