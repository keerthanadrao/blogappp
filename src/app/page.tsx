import { PrismaClient } from '@prisma/client';
import BlogFeed from '../components/BlogFeed';
import AuthNav from '../components/AuthNav';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

// Prevent static rendering since feed should be dynamic
export const dynamic = 'force-dynamic'; 

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = session?.user ? (session.user as any).id : null;

  const [posts, categories] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { name: true, email: true }
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
    })
  ]);

  const serializedPosts = posts.map(post => ({
    ...post,
    createdAt: post.createdAt.toISOString()
  }));

  return (
    <main style={{ maxWidth: '850px', margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* Premium Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 'var(--space-6)',
        paddingBottom: 'var(--space-4)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '3rem', 
            background: 'linear-gradient(to right, var(--primary), #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 'var(--space-1)'
          }}>
            Antigravity Blog
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Discover the latest stories, topics, and insights.</p>
        </div>
        <AuthNav 
          user={session?.user ? {
            id: (session.user as any).id,
            name: session.user.name,
            email: session.user.email,
            role: (session.user as any).role
          } : null} 
        />
      </header>

      {/* Main Feed with Search & Filters */}
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
