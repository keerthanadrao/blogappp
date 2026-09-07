"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import LikeListModal from './LikeListModal';
import CommentSection from './CommentSection';

interface PostCardProps {
  post: {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    author: { name: string | null; email: string };
    category: { name: string } | null;
    _count: { likes: number; comments: number };
  };
  initialLiked: boolean;
  userAuthenticated: boolean;
  currentUser?: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
  } | null;
}

export default function PostCard({ post, initialLiked, userAuthenticated, currentUser }: PostCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [commentCount, setCommentCount] = useState(post._count.comments);
  const [showLikers, setShowLikers] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (!userAuthenticated) {
      router.push('/login');
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    // Optimistic update
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(data.count);
      } else {
        // Revert on failure
        setLiked(liked);
        setLikeCount(post._count.likes);
        console.error('Failed to toggle like:', data.error);
      }
    } catch (err) {
      // Revert on failure
      setLiked(liked);
      setLikeCount(post._count.likes);
      console.error(err);
    } finally {
      setIsLiking(false);
    }
  };

  const authorName = post.author.name || post.author.email;

  return (
    <>
      <article
        className="card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}
      >
        {/* Category Badge */}
        {post.category && (
          <div
            style={{
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
              letterSpacing: '0.05em',
            }}
          >
            {post.category.name}
          </div>
        )}

        <h2 style={{ fontSize: '2rem', paddingRight: '100px' }}>{post.title}</h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: 'var(--text-primary)',
            }}
          >
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{authorName}</span>
            <span style={{ margin: '0 8px' }}>•</span>
            <span>
              {new Date(post.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        <div
          style={{
            margin: 'var(--space-2) 0',
            lineHeight: '1.8',
            color: '#d4d4d8',
            fontSize: '1.05rem',
            whiteSpace: 'pre-wrap',
          }}
        >
          {post.body}
        </div>

        {/* Engagement Footer */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
            borderTop: '1px solid var(--border-color)',
            paddingTop: 'var(--space-3)',
            marginTop: 'var(--space-2)',
          }}
        >
          {/* Like Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleLike}
              disabled={isLiking}
              title={liked ? 'Unlike' : 'Like'}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: isLiking ? 'default' : 'pointer',
                color: liked ? 'var(--danger)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
                transition: 'color 0.2s, transform 0.1s',
              }}
              className="like-btn"
            >
              <svg
                width="20"
                height="20"
                fill={liked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
            <span
              onClick={() => likeCount > 0 && setShowLikers(true)}
              style={{ cursor: likeCount > 0 ? 'pointer' : 'default' }}
              className="like-count"
            >
              {likeCount}
            </span>
          </div>

          {/* Comment Toggle Button */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="comment-toggle-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              color: showComments ? 'var(--primary)' : 'var(--text-secondary)',
              fontSize: '0.95rem',
              padding: 0,
              transition: 'color 0.2s',
            }}
            title="Toggle comments"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="comment-count">{commentCount}</span>
          </button>
        </div>

        {/* Expandable Comment Section */}
        {showComments && (
          <CommentSection
            postId={post.id}
            currentUser={currentUser || null}
            initialCommentCount={commentCount}
            onCommentCountChange={(newCount) => setCommentCount(newCount)}
          />
        )}
      </article>

      {showLikers && <LikeListModal postId={post.id} onClose={() => setShowLikers(false)} />}
    </>
  );
}
