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
        select: { name: true, email: true },
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

  const [rawAuthor, rawBookmark] = await Promise.all([
    prisma.$queryRaw<any[]>`SELECT image FROM User WHERE id = ${post.authorId}`,
    userId
      ? prisma.$queryRaw<any[]>`SELECT "postId" FROM "Bookmark" WHERE "postId" = ${post.id} AND "userId" = ${userId}`
      : Promise.resolve([]),
  ]);

  const authorImage = rawAuthor?.[0]?.image || (post.author as any)?.image || null;
  const initialLiked = userId && post.likes && post.likes.length > 0;
  const initialBookmarked = Boolean(rawBookmark && rawBookmark.length > 0);

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <header style={{ marginBottom: 'var(--space-4)' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
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
      />
    </main>
  );
}
