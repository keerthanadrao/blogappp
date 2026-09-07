import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route'; // Ensure correct path or alias

const prisma = new PrismaClient();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id: postId } = await context.params;
    const userId = (session.user as any).id;
    
    if (!userId) {
       return NextResponse.json({ error: 'User ID missing in session' }, { status: 401 });
    }

    // Check if like exists
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });
    } else {
      // Like
      await prisma.like.create({
        data: {
          postId,
          userId,
        },
      });
    }

    // Return the updated like count and status
    const likeCount = await prisma.like.count({
      where: { postId },
    });

    return NextResponse.json({ liked: !existingLike, count: likeCount });
  } catch (error) {
    console.error('LIKE ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await context.params;

    const likes = await prisma.like.findMany({
      where: { postId },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const users = likes.map((like) => ({
      name: like.user.name || like.user.email,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('FETCH LIKES ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
