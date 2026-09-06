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
      _count: {
        select: { likes: true, comments: true }
      }
    }
  });

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1>Blog Application</h1>
        <nav>
          <Link href="/login" style={{ marginRight: '15px' }}>Login</Link>
          <Link href="/signup">Sign Up</Link>
        </nav>
      </header>

      <section>
        {posts.length === 0 ? (
          <p>No posts published yet.</p>
        ) : (
          posts.map(post => (
            <article key={post.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <h2>{post.title}</h2>
              <p style={{ color: '#555', fontSize: '0.9em' }}>
                By {post.author.name || post.author.email} on {post.createdAt.toLocaleDateString()}
              </p>
              
              <div style={{ margin: '20px 0', lineHeight: '1.6' }}>
                {post.body}
              </div>
              
              <div style={{ display: 'flex', gap: '15px', color: '#666', fontSize: '0.9em' }}>
                <span>❤️ {post._count.likes} Likes</span>
                <span>💬 {post._count.comments} Comments</span>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
