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

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedEmail },
          { email: typeof email === 'string' ? email.trim() : '' },
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        password_hash,
        name: name ? String(name).trim() : null,
        role: 'READER'
      }
    });

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
