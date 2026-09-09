import React from 'react';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api/auth/[...nextauth]/route';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import PostForm from '../../../../components/PostForm';

const prisma = new PrismaClient();

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/login');
  }

  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id }
  });

  if (!post) {
    notFound();
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  if (post.authorId !== userId && role !== 'ADMIN') {
    redirect('/'); // Forbidden
  }

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
          Edit Post
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
          Update your post details, change categories, or publish your draft.
        </p>
      </div>
      <PostForm 
        isEditing 
        initialData={{
          id: post.id,
          title: post.title,
          body: post.body,
          categoryId: post.categoryId,
          status: post.status as 'PUBLISHED' | 'DRAFT',
          cover_image_url: post.cover_image_url,
        }} 
      />
    </main>
  );
}
