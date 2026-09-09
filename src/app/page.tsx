import { PrismaClient } from '@prisma/client';
import BlogFeed from '../components/BlogFeed';
import AuthNav from '../components/AuthNav';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

// Prevent static rendering since feed should be dynamic
export const dynamic = 'force-dynamic'; 

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = session?.user ? (session.user as any).id : null;

  const [posts, categories, userImages, userBookmarks] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        category: {
          select: { id: true, name: true }
        },
        _count: {
          select: { likes: true, comments: true }
        },
        // Check if current user liked the post
        likes: userId ? {
          where: { userId }
        } : false
      }
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' }
    }),
    prisma.$queryRaw<any[]>`SELECT id, image FROM User`,
    userId
      ? prisma.$queryRaw<any[]>`SELECT "postId" FROM "Bookmark" WHERE "userId" = ${userId}`
      : Promise.resolve([])
  ]);

  const userImageMap = new Map((userImages || []).map((u: any) => [u.id, u.image]));
  const bookmarkedPostIds = new Set((userBookmarks || []).map((b: any) => b.postId));

  const serializedPosts = posts.map(post => ({
    ...post,
    createdAt: post.createdAt.toISOString(),
    isBookmarked: bookmarkedPostIds.has(post.id),
    author: {
      ...post.author,
      image: (post.author as any)?.image || userImageMap.get(post.authorId) || null
    }
  }));

  return (
    <main className="main-container">
      {/* 🧭 Astra Clean Editorial Masthead Header */}
      <header className="header-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary) 0%, #818cf8 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              }}
            >
              ✦
            </div>
            <div>
              <h1
                style={{
                  fontSize: 'clamp(1.35rem, 3.2vw, 1.85rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                Antigravity Blog
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, fontWeight: 500 }}>
                Ideas • Design • Technology • Culture
              </p>
            </div>
          </Link>
        </div>

        {/* Right Navigation */}
        <AuthNav 
          user={session?.user ? {
            id: (session.user as any).id,
            name: session.user.name,
            email: session.user.email,
            role: (session.user as any).role
          } : null} 
        />
      </header>

      {/* 📰 Main Feed with Hero, Category Discovery, Featured Post & Grid */}
      <BlogFeed 
        initialPosts={serializedPosts}
        categories={categories}
        userAuthenticated={!!session}
        currentUser={session?.user ? {
          id: (session.user as any).id,
          name: session.user.name,
          email: session.user.email || '',
          role: (session.user as any).role || 'READER'
        } : null}
        userId={userId}
      />
    </main>
  );
}
