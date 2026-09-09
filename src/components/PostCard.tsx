"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LikeListModal from './LikeListModal';
import CommentSection from './CommentSection';

interface PostCardProps {
  post: {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    author?: { id?: string; name: string | null; email: string; image?: string | null } | null;
    category: { name: string } | null;
    _count: { likes: number; comments: number };
    cover_image_url?: string | null;
    tags?: string | null;
    isBookmarked?: boolean;
  };
  initialLiked: boolean;
  initialBookmarked?: boolean;
  userAuthenticated: boolean;
  currentUser?: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
  } | null;
  onTagClick?: (tag: string) => void;
  onBookmarkToggle?: (postId: string, isBookmarked: boolean) => void;
  featured?: boolean;
  isDetailPage?: boolean;
}

export default function PostCard({
  post,
  initialLiked,
  initialBookmarked = false,
  userAuthenticated,
  currentUser,
  onTagClick,
  onBookmarkToggle,
  featured = false,
  isDetailPage = false,
}: PostCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked ?? initialBookmarked);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [commentCount, setCommentCount] = useState(post._count.comments);
  const [showLikers, setShowLikers] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [authorImageError, setAuthorImageError] = useState(false);

  const handleBookmark = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isBookmarking) return;

    const nextBookmarkedState = !bookmarked;
    setIsBookmarking(true);
    // Optimistic update
    setBookmarked(nextBookmarkedState);
    if (onBookmarkToggle) {
      onBookmarkToggle(post.id, nextBookmarkedState);
    }

    try {
      const res = await fetch(`/api/posts/${post.id}/bookmark`, { method: 'POST' });
      if (res.status === 401) {
        setBookmarked(bookmarked);
        if (onBookmarkToggle) {
          onBookmarkToggle(post.id, bookmarked);
        }
        router.push('/login');
        return;
      }
      const data = await res.json();

      if (res.ok) {
        setBookmarked(data.bookmarked);
        if (onBookmarkToggle) {
          onBookmarkToggle(post.id, data.bookmarked);
        }
      } else {
        // Revert on failure
        setBookmarked(bookmarked);
        if (onBookmarkToggle) {
          onBookmarkToggle(post.id, bookmarked);
        }
        console.error('Failed to toggle bookmark:', data.error);
      }
    } catch (err) {
      // Revert on failure
      setBookmarked(bookmarked);
      if (onBookmarkToggle) {
        onBookmarkToggle(post.id, bookmarked);
      }
      console.error(err);
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleLike = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isLiking) return;

    setIsLiking(true);
    // Optimistic update
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
      if (res.status === 401) {
        setLiked(liked);
        setLikeCount(post._count.likes);
        router.push('/login');
        return;
      }
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

  const handleAuthorImgRef = (node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth === 0) {
      setAuthorImageError(true);
    }
  };

  const handleCoverImgRef = (node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth === 0) {
      setImageError(true);
    }
  };

  const authorName = post.author?.name || post.author?.email || 'Anonymous Author';
  
  // Calculate reading time estimation
  const wordCount = post.body.trim().split(/\s+/).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));

  const tagList = post.tags 
    ? post.tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
    : (post.body.match(/#([a-zA-Z0-9_-]+)/g) || []).map(t => t.replace('#', ''));

  return (
    <>
      <article
        className="card astra-card"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          background: 'var(--surface-color)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          padding: 'var(--space-4)',
          overflow: 'hidden',
          transition: 'transform var(--transition-normal), box-shadow var(--transition-normal), border-color var(--transition-normal)',
        }}
      >
        {/* Cover Image */}
        {post.cover_image_url && !imageError && (
          <div
            className="card-image-wrap"
            style={{
              width: '100%',
              height: featured ? 'clamp(220px, 38vw, 360px)' : 'clamp(190px, 28vw, 240px)',
              overflow: 'hidden',
              borderRadius: 'var(--radius-md)',
              position: 'relative',
            }}
          >
            <Link href={`/posts/${post.id}`} style={{ display: 'block', width: '100%', height: '100%' }}>
              <img
                ref={handleCoverImgRef}
                src={post.cover_image_url}
                alt={post.title}
                onError={() => setImageError(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </Link>

            {/* Category badge overlay on top-right of image */}
            {post.category && (
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#818cf8',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(129, 140, 248, 0.35)',
                  zIndex: 2,
                }}
              >
                {post.category.name}
              </span>
            )}
          </div>
        )}

        {/* Category badge if no cover image */}
        {(!post.cover_image_url || imageError) && post.category && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <span
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#818cf8',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.72rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              {post.category.name}
            </span>
          </div>
        )}

        {/* Title */}
        {isDetailPage ? (
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4.5vw, 2.6rem)',
              fontWeight: 800,
              lineHeight: 1.25,
              margin: '4px 0 2px 0',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {post.title}
          </h1>
        ) : (
          <h2
            style={{
              fontSize: featured ? 'clamp(1.4rem, 4vw, 2.1rem)' : 'clamp(1.2rem, 3vw, 1.55rem)',
              fontWeight: 700,
              lineHeight: 1.3,
              margin: '2px 0 0 0',
            }}
          >
            <Link
              href={`/posts/${post.id}`}
              style={{
                color: 'var(--text-primary)',
                textDecoration: 'none',
                transition: 'color var(--transition-fast)',
              }}
            >
              {post.title}
            </Link>
          </h2>
        )}

        {/* Author Details & Date Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--text-secondary)',
            fontSize: '0.86rem',
            margin: '2px 0',
          }}
        >
          {/* Author Avatar Icon */}
          <div
            className="author-avatar-icon"
            data-testid="author-avatar"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, var(--primary), #818cf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#ffffff',
              flexShrink: 0,
              border: '2px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            {post.author?.image && !authorImageError ? (
              <img
                ref={handleAuthorImgRef}
                src={post.author.image}
                alt={authorName}
                onError={() => setAuthorImageError(true)}
                className="author-avatar-img"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <span className="author-avatar-fallback" style={{ fontSize: '0.85rem' }}>
                {authorName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className="author-name" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {authorName}
            </span>
            <span>•</span>
            <span>
              {new Date(post.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>—</span>
            <span style={{ color: 'var(--text-muted)' }}>{readingTimeMinutes} min read</span>
          </div>
        </div>

        {/* Excerpt / Body */}
        <div
          style={{
            color: isDetailPage ? '#e2e8f0' : 'var(--text-secondary)',
            fontSize: isDetailPage ? '1.05rem' : '0.94rem',
            lineHeight: isDetailPage ? 1.8 : 1.65,
            margin: isDetailPage ? '12px 0 16px 0' : '6px 0',
            whiteSpace: 'pre-wrap',
            ...(isDetailPage
              ? {}
              : {
                  display: '-webkit-box',
                  WebkitLineClamp: featured ? 8 : 6,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }),
          }}
        >
          {post.body}
        </div>

        {/* Tags */}
        {tagList.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '2px 0 4px 0' }}>
            {tagList.map((tag, idx) => (
              <button
                key={idx}
                type="button"
                className="post-tag-chip"
                data-tag={tag.toLowerCase()}
                style={{
                  fontSize: '0.78rem',
                  padding: '2px 9px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#c084fc',
                  border: '1px solid rgba(192, 132, 252, 0.22)',
                  cursor: onTagClick ? 'pointer' : 'default',
                  fontWeight: 500,
                  transition: 'all var(--transition-fast)',
                }}
                onClick={() => onTagClick && onTagClick(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Engagement & Action Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-color)',
            paddingTop: 'var(--space-3)',
            marginTop: 'auto',
            gap: 'var(--space-2)',
            flexWrap: 'wrap',
          }}
        >
          {/* Social Interactions Group (Left) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Like Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  padding: '4px',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'color 0.2s, transform 0.15s ease',
                  transform: liked ? 'scale(1.08)' : 'scale(1)',
                }}
                className="like-btn"
              >
                <svg
                  width="19"
                  height="19"
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
                style={{
                  cursor: likeCount > 0 ? 'pointer' : 'default',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: liked ? 'var(--danger)' : 'var(--text-secondary)',
                }}
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
                gap: '6px',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                color: showComments ? 'var(--primary-light)' : 'var(--text-secondary)',
                fontSize: '0.88rem',
                fontWeight: 600,
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
                transition: 'color 0.2s',
              }}
              title="Toggle comments"
            >
              <svg width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="comment-count">{commentCount}</span>
            </button>

            {/* Bookmark / Save Blog Button */}
            <button
              id={`bookmark-btn-${post.id}`}
              data-testid="bookmark-btn"
              onClick={handleBookmark}
              disabled={isBookmarking}
              className="bookmark-btn"
              title={bookmarked ? 'Remove from Saved Blogs' : 'Save / Bookmark Blog'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: isBookmarking ? 'default' : 'pointer',
                background: 'none',
                border: 'none',
                color: bookmarked ? '#818cf8' : 'var(--text-secondary)',
                fontSize: '0.88rem',
                padding: '4px',
                transition: 'all 0.2s ease',
              }}
            >
              <svg
                width="19"
                height="19"
                fill={bookmarked ? '#818cf8' : 'none'}
                stroke={bookmarked ? '#818cf8' : 'currentColor'}
                strokeWidth="2"
                viewBox="0 0 24 24"
                style={{
                  transition: 'transform 0.15s ease',
                  transform: bookmarked ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <span style={{ fontSize: '0.84rem', fontWeight: bookmarked ? '600' : '400' }}>
                {bookmarked ? 'Saved' : 'Save'}
              </span>
            </button>
          </div>

          {/* Read Article Action (Right) */}
          {!isDetailPage && (
            <Link
              href={`/posts/${post.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--primary-light)',
                fontSize: '0.86rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'gap var(--transition-fast)',
              }}
            >
              Read →
            </Link>
          )}
        </div>

        {/* Expandable Comment Section */}
        {showComments && (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <CommentSection
              postId={post.id}
              currentUser={currentUser || null}
              initialCommentCount={commentCount}
              onCommentCountChange={(newCount) => setCommentCount(newCount)}
            />
          </div>
        )}
      </article>

      {showLikers && <LikeListModal postId={post.id} onClose={() => setShowLikers(false)} />}
    </>
  );
}
