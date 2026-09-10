import { prisma } from '@/lib/prisma';
import BlogFeed from '../components/BlogFeed';
import AuthNav from '../components/AuthNav';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';

// Prevent static rendering since feed should be dynamic
export const dynamic = 'force-dynamic'; 

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = session?.user ? (session.user as any).id : null;

  let posts: any[] = [];
  let categories: any[] = [];
  let userBookmarks: any[] = [];

  try {
    posts = await prisma.post.findMany({
      where: {
        status: { in: ['PUBLISHED', 'published'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true }
        },
        category: {
          select: { id: true, name: true }
        },
        _count: {
          select: { likes: true, comments: true }
        },
        likes: userId ? {
          where: { userId }
        } : false
      }
    });
  } catch (e) {
    console.error('Error fetching posts:', e);
  }

  try {
    categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
  } catch (e) {
    console.error('Error fetching categories:', e);
  }

  if (userId) {
    try {
      userBookmarks = await prisma.bookmark.findMany({
        where: { userId },
        select: { postId: true }
      });
    } catch (e) {
      console.error('Error fetching bookmarks:', e);
    }
  }

  const bookmarkedPostIds = new Set((userBookmarks || []).map((b: any) => b.postId));

  const serializedPosts = posts.map(post => ({
    ...post,
    createdAt: post.createdAt.toISOString(),
    isBookmarked: bookmarkedPostIds.has(post.id),
    author: {
      ...post.author,
      image: post.author?.image || null
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
