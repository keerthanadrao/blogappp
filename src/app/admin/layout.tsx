import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session: any = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/login?role=admin');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)' }}>
      {/* Sleek Admin Sidebar */}
      <aside
        style={{
          width: '260px',
          backgroundColor: 'var(--surface-color)',
          padding: 'var(--space-5) var(--space-4)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: '1.5rem' }}>🛡️</span>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                  Admin Portal
                </h2>
                <span 
                  className="badge" 
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.7rem', marginTop: '2px' }}
                >
                  ADMIN PRIVILEGES
                </span>
              </div>
            </div>
          </div>

          <nav
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <Link
              href="/admin"
              className="btn btn-primary"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            >
              📊 Overview & Moderation
            </Link>

            <Link
              href="/posts/new"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            >
              ✍️ Write New Post
            </Link>

            <Link
              href="/my-posts"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            >
              📁 My Posts
            </Link>

            <Link
              href="/"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            >
              🌐 View Main Feed
            </Link>
          </nav>
        </div>

        {/* User Card at bottom of Sidebar */}
        <div style={{
          padding: 'var(--space-3)',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)'
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {session.user?.name || 'Administrator'}
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {session.user?.email}
            </p>
          </div>
          <Link
            href="/"
            style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}
          >
            ← Exit to Blog
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: 'var(--space-6)', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}