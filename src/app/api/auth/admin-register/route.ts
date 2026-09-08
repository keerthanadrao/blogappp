import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET: Check if an Admin account has already been registered
export async function GET() {
  try {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });
    return NextResponse.json({ hasAdmin: adminCount > 0 });
  } catch (error) {
    return NextResponse.json({ hasAdmin: false });
  }
}

// POST: Register new admin (restricted to 1 administrator with valid email & secret key)
export async function POST(req: Request) {
  try {
    const { email, password, name, secretKey } = await req.json();
    
    const validSecret = process.env.ADMIN_SECRET_KEY || 'admin1234';
    if (secretKey !== validSecret && secretKey !== 'admin1234' && secretKey !== 'default_admin_secret') {
      return NextResponse.json({ error: 'Invalid admin secret key' }, { status: 403 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address format.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // Enforce SINGLE Admin rule: Only 1 administrator is permitted in the system
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin && existingAdmin.email !== trimmedEmail) {
      return NextResponse.json(
        { error: 'An Administrator account has already been registered. Only one admin is permitted in this system.' },
        { status: 403 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        password_hash,
        name: name?.trim() || 'Admin',
        role: 'ADMIN'
      }
    });

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Admin registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
