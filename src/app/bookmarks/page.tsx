import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import AuthNav from '../../components/AuthNav';
import BookmarksView from '../../components/BookmarksView';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export default async function BookmarksPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  const userId = (session.user as any).id;

  // Fetch user's bookmarked posts from SQLite
  const bookmarkedRows = await prisma.$queryRaw<any[]>`
    SELECT "postId", "createdAt" as "bookmarkedAt"
    FROM "Bookmark"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
  `;

  const postIds = (bookmarkedRows || []).map((b) => b.postId);

  let serializedBookmarks: any[] = [];

  if (postIds.length > 0) {
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

    serializedBookmarks = bookmarkedRows
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
  }

  return (
    <main style={{ maxWidth: '850px', margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-6)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <h1
            id="bookmarks-page-title"
            style={{
              fontSize: '2.5rem',
              background: 'linear-gradient(to right, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 'var(--space-1)',
            }}
          >
            🔖 Saved Blogs
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Your personal library of bookmarked stories, tutorials, and articles.
          </p>
        </div>
        <AuthNav
          user={{
            id: userId,
            name: session.user.name,
            email: session.user.email,
            role: (session.user as any).role,
          }}
        />
      </header>

      {/* Bookmarks Interactive View */}
      <BookmarksView
        initialBookmarks={serializedBookmarks}
        currentUser={{
          id: userId,
          name: session.user.name,
          email: session.user.email || '',
          role: (session.user as any).role || 'READER',
        }}
      />
    </main>
  );
}
