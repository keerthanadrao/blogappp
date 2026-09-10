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

  // Fetch user's bookmarked posts using native Prisma relations
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

  const serializedBookmarks = bookmarks
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

  return (
    <main className="main-container">
      {/* Responsive Header */}
      <header className="header-container">
        <div>
          <h1
            id="bookmarks-page-title"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              background: 'linear-gradient(to right, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 'var(--space-1)',
              lineHeight: 1.2
            }}
          >
            🔖 Saved Blogs
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
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
