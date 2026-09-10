import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import PostCard from '../../../components/PostCard';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export default async function PostDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session: any = await getServerSession(authOptions);
  const userId = session?.user?.id || null;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, email: true, image: true },
      },
      category: {
        select: { name: true },
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
  });

  if (!post) {
    notFound();
  }

  const existingBookmark = userId
    ? await prisma.bookmark.findUnique({
        where: {
          postId_userId: {
            postId: post.id,
            userId,
          },
        },
      })
    : null;

  const authorImage = post.author?.image || null;
  const initialLiked = userId && post.likes && post.likes.length > 0;
  const initialBookmarked = Boolean(existingBookmark);

  return (
    <main className="main-container">
      <header style={{ marginBottom: 'var(--space-4)' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          ← Back to all posts
        </Link>
      </header>

      <PostCard
        post={{
          ...post,
          createdAt: post.createdAt.toISOString(),
          isBookmarked: initialBookmarked,
          author: {
            ...post.author,
            image: authorImage
          }
        }}
        initialLiked={!!initialLiked}
        initialBookmarked={initialBookmarked}
        userAuthenticated={!!session}
        currentUser={
          session?.user
            ? {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email || '',
                role: session.user.role || 'READER',
              }
            : null
        }
        isDetailPage={true}
      />
    </main>
  );
}
