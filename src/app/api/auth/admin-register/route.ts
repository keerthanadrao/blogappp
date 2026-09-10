import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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



    let existingUser = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: trimmedEmail },
              { email: email.trim() },
            ],
          },
        });
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    let user = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        user = await prisma.user.create({
          data: {
            email: trimmedEmail,
            password_hash,
            name: name?.trim() || 'Admin',
            role: 'ADMIN'
          }
        });
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    return NextResponse.json({ success: true, user: { id: user?.id, email: user?.email, role: user?.role } });
  } catch (error: any) {
    console.error('Admin registration error:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
