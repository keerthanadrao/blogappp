"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserPost {
  id: string;
  title: string;
  body: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  category?: {
    id: string;
    name: string;
  };
}

export default function MyPosts() {
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const router = useRouter();

  const fetchMyPosts = async () => {
    try {
      const res = await fetch('/api/user/posts');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
      }
    } catch (error) {
      console.error('Failed to fetch posts', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPosts();
  }, [router]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while deleting the post.');
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'ALL') return true;
    return post.status === filter;
  });

  return (
    <main className="main-container">
      {/* Responsive Header */}
      <div className="header-container">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>← Back to Feed</Link>
          </div>
          <h1 style={{ 
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', 
            background: 'linear-gradient(to right, var(--primary), #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.2
          }}>
            My Posts
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
            Manage your articles, drafts, and published content.
          </p>
        </div>
        <Link href="/posts/new" className="btn btn-primary" style={{ display: 'inline-flex', gap: '6px', whiteSpace: 'nowrap' }}>
          <span>+</span> Write Post
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {(['ALL', 'PUBLISHED', 'DRAFT'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-color)',
              background: filter === tab ? 'var(--primary)' : 'var(--surface-color)',
              color: filter === tab ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.85rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            {tab === 'ALL' ? `All (${posts.length})` : tab === 'PUBLISHED' ? `Published (${posts.filter(p => p.status === 'PUBLISHED').length})` : `Drafts (${posts.filter(p => p.status === 'DRAFT').length})`}
          </button>
        ))}
      </div>

      {/* Post List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading your posts...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            {filter === 'ALL' ? "You haven't created any posts yet." : `No ${filter.toLowerCase()} posts found.`}
          </p>
          <Link href="/posts/new" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
            Start Writing
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredPosts.map((post) => (
            <div 
              key={post.id} 
              className="card" 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: 'var(--space-4)',
                gap: 'var(--space-4)',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <span 
                    className="badge" 
                    style={{
                      backgroundColor: post.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                      color: post.status === 'PUBLISHED' ? 'var(--secondary)' : '#eab308'
                    }}
                  >
                    {post.status}
                  </span>
                  {post.category && (
                    <span className="badge badge-primary">
                      {post.category.name}
                    </span>
                  )}
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: 'clamp(1.1rem, 3vw, 1.25rem)', color: 'var(--text-primary)' }}>
                  {post.title}
                </h3>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <Link 
                  href={`/posts/${post.id}/edit`} 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Edit
                </Link>
                <button 
                  type="button"
                  onClick={() => handleDelete(post.id)}
                  className="btn btn-danger"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
