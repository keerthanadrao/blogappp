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
    redirect('/');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: '250px',
          backgroundColor: 'var(--surface-color)',
          padding: 'var(--space-4)',
          borderRight: '1px solid var(--border-color)',
        }}
      >
        <h2 style={{ marginBottom: 'var(--space-5)' }}>
          Admin Panel
        </h2>

        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <Link
            href="/admin"
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start' }}
          >
            Dashboard
          </Link>

          <Link
            href="/"
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start' }}
          >
            Back to Main Site
          </Link>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 'var(--space-5)' }}>
        {children}
      </main>
    </div>
  );
}