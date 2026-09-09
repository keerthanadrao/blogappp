import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to bookmark posts.' },
        { status: 401 }
      );
    }

    const { id: postId } = await context.params;
    const userId = (session.user as any).id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID missing from session.' },
        { status: 401 }
      );
    }

    // Verify post exists and is PUBLISHED
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true },
    });

    if (!post || post.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Post not found or is no longer available.' },
        { status: 404 }
      );
    }

    // Check if bookmark already exists
    const existingBookmark = await prisma.$queryRaw<any[]>`
      SELECT "postId", "userId" FROM "Bookmark" WHERE "postId" = ${postId} AND "userId" = ${userId}
    `;

    if (existingBookmark && existingBookmark.length > 0) {
      // Remove bookmark (unbookmark)
      await prisma.$executeRaw`
        DELETE FROM "Bookmark" WHERE "postId" = ${postId} AND "userId" = ${userId}
      `;
      return NextResponse.json({
        bookmarked: false,
        message: 'Blog removed from bookmarks.',
      });
    } else {
      // Create bookmark
      await prisma.$executeRaw`
        INSERT INTO "Bookmark" ("postId", "userId", "createdAt") VALUES (${postId}, ${userId}, CURRENT_TIMESTAMP)
      `;
      return NextResponse.json({
        bookmarked: true,
        message: 'Blog saved to bookmarks successfully.',
      });
    }
  } catch (error: any) {
    console.error('BOOKMARK API ERROR:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: postId } = await context.params;

    if (!session || !session.user) {
      return NextResponse.json({ bookmarked: false });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ bookmarked: false });
    }

    const bookmark = await prisma.$queryRaw<any[]>`
      SELECT "postId" FROM "Bookmark" WHERE "postId" = ${postId} AND "userId" = ${userId}
    `;

    return NextResponse.json({
      bookmarked: Boolean(bookmark && bookmark.length > 0),
    });
  } catch (error) {
    console.error('FETCH BOOKMARK STATUS ERROR:', error);
    return NextResponse.json({ bookmarked: false });
  }
}
