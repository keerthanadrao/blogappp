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
    <div className="admin-container">
      {/* Sleek Admin Sidebar (Responsive) */}
      <aside className="admin-sidebar">
        <div>
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: '1.5rem' }}>🛡️</span>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
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
              style={{ justifyContent: 'flex-start', padding: '8px 12px', fontSize: '0.9rem' }}
            >
              📊 Moderation
            </Link>

            <Link
              href="/posts/new"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '8px 12px', fontSize: '0.9rem' }}
            >
              ✍️ Write Post
            </Link>

            <Link
              href="/my-posts"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '8px 12px', fontSize: '0.9rem' }}
            >
              📁 My Posts
            </Link>

            <Link
              href="/"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '8px 12px', fontSize: '0.9rem' }}
            >
              🌐 Main Feed
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
          gap: 'var(--space-2)',
          marginTop: 'var(--space-4)'
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
              {session.user?.name || 'Administrator'}
            </p>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
              {session.user?.email}
            </p>
          </div>
          <Link
            href="/"
            style={{ fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none' }}
          >
            ← Exit to Blog
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}