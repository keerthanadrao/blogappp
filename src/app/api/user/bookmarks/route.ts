import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to view saved blogs.' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session.' },
        { status: 401 }
      );
    }

    // Fetch all bookmarked posts for the current authenticated user using native Prisma relations
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true },
            },
            category: {
              select: { id: true, name: true },
            },
            _count: {
              select: { likes: true, comments: true },
            },
            likes: {
              where: { userId },
            },
          },
        },
      },
    });

    const orderedBookmarks = bookmarks
      .filter((b) => b.post && b.post.status === 'PUBLISHED')
      .map((b) => ({
        ...b.post,
        createdAt: b.post.createdAt.toISOString(),
        isBookmarked: true,
        bookmarkedAt: b.createdAt.toISOString(),
        author: {
          ...b.post.author,
          image: b.post.author?.image || null,
        },
      }));

    return NextResponse.json({ bookmarks: orderedBookmarks });
  } catch (error: any) {
    console.error('USER BOOKMARKS API ERROR:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
