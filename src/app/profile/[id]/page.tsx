import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import AuthNav from '../../../components/AuthNav';
import UserProfileView from '../../../components/UserProfileView';

const prisma = new PrismaClient();

export default async function PublicProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? (session.user as any).id : null;
  const targetUserId = id;

  let user: any = null;
  let image: string | null = null;
  let bio: string | null = null;

  try {
    user = await prisma.user.findUnique({
      where: { id: targetUserId },
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

    if (user) {
      const rawData: any[] = await prisma.$queryRaw`SELECT image, bio FROM User WHERE id = ${targetUserId}`;
      image = rawData?.[0]?.image || null;
      bio = rawData?.[0]?.bio || null;
    }
  } catch (err) {
    console.error('Error fetching user profile:', err);
    user = null;
  }

  return (
    <main className="main-container">
      {/* Responsive Header */}
      <header className="header-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link href="/" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            ← Back to Home
          </Link>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            User Profile
          </span>
        </div>

        <AuthNav
          user={session?.user ? {
            id: currentUserId,
            name: session.user.name,
            email: session.user.email,
            role: (session.user as any).role
          } : null}
        />
      </header>

      {/* If User Not Found */}
      {!user ? (
        <div
          id="user-not-found"
          className="card"
          style={{
            textAlign: 'center',
            padding: 'var(--space-6) var(--space-4)',
            background: 'linear-gradient(145deg, #18181b, #09090b)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            marginTop: 'var(--space-6)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>🔍</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            User not found
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '420px', margin: '0 auto var(--space-5) auto' }}>
            The requested user profile does not exist, has been removed, or the link is invalid.
          </p>
          <Link href="/" className="btn btn-primary" style={{ padding: '10px 24px' }}>
            Return to Feed
          </Link>
        </div>
      ) : (
        <UserProfileView
          user={{
            ...user,
            image,
            bio,
            createdAt: user.createdAt.toISOString(),
            posts: user.posts.map((p: any) => ({
              ...p,
              createdAt: p.createdAt.toISOString(),
            })),
            comments: user.comments.map((c: any) => ({
              ...c,
              createdAt: c.createdAt.toISOString(),
            })),
            stats: {
              postsCount: user.posts.length,
              commentsCount: user.comments.length,
              likesCount: user.posts.reduce((sum: number, p: any) => sum + p._count.likes, 0),
            },
          }}
          isOwnProfile={currentUserId === user.id}
        />
      )}
    </main>
  );
}
