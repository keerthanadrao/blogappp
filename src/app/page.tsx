import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import PostCard from '../components/PostCard';
import AuthNav from '../components/AuthNav';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

// Prevent static rendering since feed should be dynamic
export const dynamic = 'force-dynamic'; 

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = session?.user ? (session.user as any).id : null;

  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: { name: true, email: true }
      },
      category: {
        select: { name: true }
      },
      _count: {
        select: { likes: true, comments: true }
      },
      // Check if current user liked the post
      likes: userId ? {
        where: { userId }
      } : false
    }
  });

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
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
          <p style={{ color: 'var(--text-secondary)' }}>Discover the latest stories and insights.</p>
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

      {/* Main Feed */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {posts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>No posts published yet.</p>
            <p style={{ marginTop: 'var(--space-2)' }}>Check back later for new content!</p>
          </div>
        ) : (
          posts.map(post => {
            const initialLiked = userId && post.likes && post.likes.length > 0;
            return (
              <PostCard 
                key={post.id} 
                post={{
                  ...post,
                  createdAt: post.createdAt.toISOString() // pass as string for client component
                }} 
                initialLiked={!!initialLiked}
                userAuthenticated={!!session}
                currentUser={session?.user ? {
                  id: (session.user as any).id,
                  name: session.user.name,
                  email: session.user.email || '',
                  role: (session.user as any).role || 'READER'
                } : null}
              />
            );
          })
        )}
      </section>
    </main>
  );
}
