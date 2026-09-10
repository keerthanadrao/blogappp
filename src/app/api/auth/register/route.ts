import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!trimmedEmail) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    let existingUser = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: trimmedEmail },
              { email: typeof email === 'string' ? email.trim() : '' },
            ]
          }
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
            name: name ? String(name).trim() : null,
            role: 'READER'
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
    console.error('Registration error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
