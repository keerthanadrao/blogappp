import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import AuthNav from '../../components/AuthNav';
import UserProfileView from '../../components/UserProfileView';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login?callbackUrl=/profile');
  }

  const userId = (session.user as any).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
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
    redirect('/login');
  }

  // Safely fetch additional dynamic columns from SQLite
  const rawData: any[] = await prisma.$queryRaw`SELECT image, bio FROM User WHERE id = ${userId}`;
  const image = rawData?.[0]?.image || null;
  const bio = rawData?.[0]?.bio || null;

  const totalLikesReceived = user.posts.reduce((sum, p) => sum + p._count.likes, 0);

  const serializedUser = {
    ...user,
    image,
    bio,
    createdAt: user.createdAt.toISOString(),
    posts: user.posts.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString()
    })),
    comments: user.comments.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString()
    })),
    stats: {
      postsCount: user.posts.length,
      commentsCount: user.comments.length,
      likesCount: totalLikesReceived
    }
  };

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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link href="/" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            ← Back to Home
          </Link>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            My Profile
          </span>
        </div>

        <AuthNav
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }}
        />
      </header>

      {/* User Profile View */}
      <UserProfileView user={serializedUser} isOwnProfile={true} />
    </main>
  );
}
