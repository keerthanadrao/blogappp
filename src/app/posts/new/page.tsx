import React from 'react';
import Link from 'next/link';
import PostForm from '../../../components/PostForm';

export default function NewPostPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link href="/my-posts" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          ← Back to My Posts
        </Link>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginTop: 'var(--space-2)',
          background: 'linear-gradient(to right, var(--primary), #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Create New Post
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          Write and craft your thoughts. Save as draft or publish to the community.
        </p>
      </div>
      <PostForm />
    </div>
  );
}
