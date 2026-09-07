import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const session: any = await getServerSession(authOptions);
  console.log('GET CATEGORIES SESSION:', JSON.stringify(session));

  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('CATEGORY GET ERROR:', error);

    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    const { name } = await req.json();

    const categoryName = name?.trim();

    if (!categoryName) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: categoryName,
      },
    });

    return NextResponse.json(
      {
        success: true,
        category,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('CATEGORY POST ERROR:', error);

    return NextResponse.json(
      { error: 'Failed to create category or category already exists' },
      { status: 400 }
    );
  }
}

export async function PUT(req: Request) {
  const session: any = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    const { id, name } = await req.json();

    const categoryName = name?.trim();

    if (!id || !categoryName) {
      return NextResponse.json(
        { error: 'ID and Name are required' },
        { status: 400 }
      );
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: categoryName,
      },
    });

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('CATEGORY PUT ERROR:', error);

    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  const session: any = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('CATEGORY DELETE ERROR:', error);

    return NextResponse.json(
      { error: 'Cannot delete category (it may be in use)' },
      { status: 400 }
    );
  }
}