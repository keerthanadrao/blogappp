import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

const prisma = new PrismaClient();

// Prevent static rendering since feed should be dynamic
export const dynamic = 'force-dynamic'; 

export default async function Home() {
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
      }
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
        <nav style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Link href="/login" className="btn btn-secondary">Login</Link>
          <Link href="/signup" className="btn btn-primary">Sign Up</Link>
        </nav>
      </header>

      {/* Main Feed */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {posts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>No posts published yet.</p>
            <p style={{ marginTop: 'var(--space-2)' }}>Check back later for new content!</p>
          </div>
        ) : (
          posts.map(post => (
            <article key={post.id} className="card" style={{ 
              position: 'relative', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)'
            }}>
              
              {/* Category Badge */}
              {post.category && (
                <div style={{
                  position: 'absolute',
                  top: 'var(--space-4)',
                  right: 'var(--space-4)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: 'var(--primary)',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {post.category.name}
                </div>
              )}

              <h2 style={{ fontSize: '2rem', paddingRight: '100px' }}>{post.title}</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: 'var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)'
                }}>
                  {(post.author.name || post.author.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{post.author.name || post.author.email}</span>
                  <span style={{ margin: '0 8px' }}>•</span>
                  <span>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              
              <div style={{ 
                margin: 'var(--space-2) 0', 
                lineHeight: '1.8', 
                color: '#d4d4d8',
                fontSize: '1.05rem',
                whiteSpace: 'pre-wrap'
              }}>
                {post.body}
              </div>
              
              {/* Engagement Footer */}
              <div style={{ 
                display: 'flex', 
                gap: 'var(--space-4)', 
                color: 'var(--text-secondary)', 
                fontSize: '0.95rem',
                borderTop: '1px solid var(--border-color)',
                paddingTop: 'var(--space-3)',
                marginTop: 'var(--space-2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'color 0.2s' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>{post._count.likes}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'color 0.2s' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>{post._count.comments}</span>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
