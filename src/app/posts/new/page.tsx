import React from 'react';
import Link from 'next/link';
import PostForm from '../../../components/PostForm';

export default function NewPostPage() {
  return (
    <main className="main-container">
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link href="/my-posts" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          ← Back to My Posts
        </Link>
        <h1 style={{ 
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', 
          marginTop: 'var(--space-2)',
          background: 'linear-gradient(to right, var(--primary), #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.2
        }}>
          Create New Post
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
          Write and craft your thoughts. Save as draft or publish to the community.
        </p>
      </div>
      <PostForm />
    </main>
  );
}
