"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import PostCard from './PostCard';

interface BookmarksViewProps {
  initialBookmarks: any[];
  currentUser: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
  };
}

export default function BookmarksView({ initialBookmarks, currentUser }: BookmarksViewProps) {
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [searchQuery, setSearchQuery] = useState('');

  const handleBookmarkToggle = (postId: string, isBookmarked: boolean) => {
    if (!isBookmarked) {
      // Remove unbookmarked post from saved list
      setBookmarks((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  const filteredBookmarks = useMemo(() => {
    if (!searchQuery.trim()) return bookmarks;
    const query = searchQuery.toLowerCase().trim();
    return bookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(query) ||
        b.body.toLowerCase().includes(query) ||
        (b.author?.name && b.author.name.toLowerCase().includes(query)) ||
        (b.category?.name && b.category.name.toLowerCase().includes(query))
    );
  }, [bookmarks, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Search & Stats Bar */}
      {bookmarks.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Saved Stories:
            </span>
            <span
              id="saved-count-badge"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: 'var(--radius-pill)',
                background: 'rgba(129, 140, 248, 0.15)',
                color: '#818cf8',
                border: '1px solid rgba(129, 140, 248, 0.3)',
              }}
            >
              {bookmarks.length} {bookmarks.length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          <div style={{ flex: '1', minWidth: '220px', maxWidth: '360px' }}>
            <input
              id="bookmarks-search-input"
              type="text"
              placeholder="Search your saved blogs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ padding: '8px 14px', fontSize: '0.9rem' }}
            />
          </div>
        </div>
      )}

      {/* Content Section */}
      {filteredBookmarks.length === 0 ? (
        <div
          id="bookmarks-empty-state"
          className="card"
          style={{
            textAlign: 'center',
            padding: 'var(--space-8) var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(180deg, rgba(24, 24, 27, 0.6) 0%, rgba(18, 18, 20, 0.9) 100%)',
            border: '1px dashed var(--border-color)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(129, 140, 248, 0.1)',
              border: '1px solid rgba(129, 140, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              marginBottom: 'var(--space-2)',
            }}
          >
            🔖
          </div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            {bookmarks.length === 0
              ? 'No saved blogs yet'
              : 'No matching saved blogs found'}
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              maxWidth: '460px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            {bookmarks.length === 0
              ? 'When you find stories and articles you want to revisit later, click the bookmark icon on any blog to save it here.'
              : `No bookmarks match "${searchQuery}". Try a different keyword or clear your search.`}
          </p>
          {bookmarks.length === 0 ? (
            <Link
              id="explore-blogs-btn"
              href="/"
              className="btn btn-primary"
              style={{
                marginTop: 'var(--space-3)',
                padding: '10px 24px',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            >
              Explore Blogs
            </Link>
          ) : (
            <button
              id="clear-bookmark-search-btn"
              onClick={() => setSearchQuery('')}
              className="btn btn-secondary"
              style={{
                marginTop: 'var(--space-3)',
                padding: '8px 20px',
                fontSize: '0.9rem',
              }}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <section
          id="bookmarks-feed-list"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
        >
          {filteredBookmarks.map((post) => {
            const initialLiked =
              currentUser.id && Array.isArray(post.likes) && post.likes.length > 0;
            return (
              <PostCard
                key={post.id}
                post={{
                  ...post,
                  createdAt: post.createdAt,
                  isBookmarked: true,
                }}
                initialLiked={!!initialLiked}
                initialBookmarked={true}
                userAuthenticated={true}
                currentUser={currentUser}
                onBookmarkToggle={handleBookmarkToggle}
              />
            );
          })}
        </section>
      )}
    </div>
  );
}
