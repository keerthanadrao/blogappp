import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route'; // Ensure correct path or alias

const prisma = new PrismaClient();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in to like posts.' }, { status: 401 });
    }
    
    const { id: postId } = await context.params;
    const sessionUserId = (session.user as any).id;
    const sessionEmail = session.user.email;

    // Verify user exists in database (handles stale cookies/sessions after user cleanups)
    let user = null;
    if (sessionUserId) {
      user = await prisma.user.findUnique({ where: { id: sessionUserId } });
    }
    if (!user && sessionEmail) {
      user = await prisma.user.findUnique({ where: { email: sessionEmail } });
    }

    if (!user) {
      return NextResponse.json({ error: 'User session expired. Please sign in again.' }, { status: 401 });
    }

    const userId = user.id;

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
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
