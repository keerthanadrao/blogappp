import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await context.params;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        bio: true,
        createdAt: true,
        posts: {
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { id: true, name: true } },
            _count: { select: { likes: true, comments: true } }
          }
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            post: { select: { id: true, title: true } }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const totalLikesReceived = user.posts.reduce((sum, p) => sum + p._count.likes, 0);

    return NextResponse.json({
      user: {
        ...user,
        stats: {
          postsCount: user.posts.length,
          commentsCount: user.comments.length,
          likesCount: totalLikesReceived
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching user profile by ID:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}
