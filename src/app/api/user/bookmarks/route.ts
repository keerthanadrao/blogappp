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

    // Fetch all bookmarked posts for the current authenticated user
    const bookmarkedRows = await prisma.$queryRaw<any[]>`
      SELECT "postId", "createdAt" as "bookmarkedAt"
      FROM "Bookmark"
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
    `;

    if (!bookmarkedRows || bookmarkedRows.length === 0) {
      return NextResponse.json({ bookmarks: [] });
    }

    const postIds = bookmarkedRows.map((b) => b.postId);

    const [posts, userImages] = await Promise.all([
      prisma.post.findMany({
        where: {
          id: { in: postIds },
          status: 'PUBLISHED',
        },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
          category: {
            select: { id: true, name: true },
          },
          _count: {
            select: { likes: true, comments: true },
          },
          likes: userId
            ? {
                where: { userId },
              }
            : false,
        },
      }),
      prisma.$queryRaw<any[]>`SELECT id, image FROM User`,
    ]);

    const userImageMap = new Map((userImages || []).map((u: any) => [u.id, u.image]));
    const postMap = new Map(posts.map((p) => [p.id, p]));

    // Maintain the order of bookmarks (most recently bookmarked first)
    const orderedBookmarks = bookmarkedRows
      .map((b) => {
        const post = postMap.get(b.postId);
        if (!post) return null;
        return {
          ...post,
          createdAt: post.createdAt.toISOString(),
          isBookmarked: true,
          bookmarkedAt: b.bookmarkedAt,
          author: {
            ...post.author,
            image: (post.author as any)?.image || userImageMap.get(post.authorId) || null,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({ bookmarks: orderedBookmarks });
  } catch (error: any) {
    console.error('USER BOOKMARKS API ERROR:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
