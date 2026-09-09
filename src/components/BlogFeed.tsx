"use client";

import React, { useState, useMemo } from 'react';
import PostCard from './PostCard';

interface PostData {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  cover_image_url?: string | null;
  tags?: string | null;
  isBookmarked?: boolean;
  author?: { id?: string; name: string | null; email: string; image?: string | null } | null;
  category: { id?: string; name: string } | null;
  _count: { likes: number; comments: number };
  likes?: { userId: string }[] | boolean;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface BlogFeedProps {
  initialPosts: PostData[];
  categories: CategoryOption[];
  userAuthenticated: boolean;
  currentUser?: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
  } | null;
  userId?: string | null;
}

export default function BlogFeed({
  initialPosts,
  categories,
  userAuthenticated,
  currentUser,
  userId,
}: BlogFeedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  // Extract all unique tags across all published posts
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    initialPosts.forEach((post) => {
      if (post.tags) {
        post.tags
          .split(',')
          .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
          .filter(Boolean)
          .forEach((t) => tagSet.add(t));
      }
      const hashtags = (post.body.match(/#([a-zA-Z0-9_-]+)/g) || []).map((t) =>
        t.replace('#', '').toLowerCase()
      );
      hashtags.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [initialPosts]);

  // Compute filtered posts
  const filteredPosts = useMemo(() => {
    return initialPosts.filter((post) => {
      // 1. Search Query Filter (Title, Body, or Tags)
      if (activeSearch.trim()) {
        const query = activeSearch.trim().toLowerCase();
        const matchesTitle = post.title.toLowerCase().includes(query);
        const matchesBody = post.body.toLowerCase().includes(query);
        const matchesPostTags = post.tags ? post.tags.toLowerCase().includes(query) : false;

        if (!matchesTitle && !matchesBody && !matchesPostTags) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'ALL') {
        const postCatName = post.category?.name?.toLowerCase() || '';
        const selectedCatName = selectedCategory.toLowerCase();
        if (postCatName !== selectedCatName && post.category?.id !== selectedCategory) {
          return false;
        }
      }

      // 3. Tag Filter
      if (selectedTag !== 'ALL') {
        const targetTag = selectedTag.toLowerCase().replace(/^#/, '');
        const postTagList = post.tags
          ? post.tags
              .split(',')
              .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
          : [];
        const hashtags = (post.body.match(/#([a-zA-Z0-9_-]+)/g) || []).map((t) =>
          t.replace('#', '').toLowerCase()
        );
        const allTags = [...postTagList, ...hashtags];

        if (!allTags.includes(targetTag)) {
          return false;
        }
      }

      return true;
    });
  }, [initialPosts, activeSearch, selectedCategory, selectedTag]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setActiveSearch('');
    setSelectedCategory('ALL');
    setSelectedTag('ALL');
  };

  const handleTagClick = (tag: string) => {
    const cleanTag = tag.replace(/^#/, '').toLowerCase();
    setSelectedTag(cleanTag === selectedTag.toLowerCase() ? 'ALL' : cleanTag);
  };

  const isFiltering = activeSearch.trim() !== '' || selectedCategory !== 'ALL' || selectedTag !== 'ALL';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* 🔍 Search & Filter Bar Section */}
      <section
        className="card"
        style={{
          padding: 'var(--space-4)',
          background: 'rgba(24, 24, 27, 0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {/* Search Input Row */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 'var(--space-2)' }} role="search">
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                position: 'absolute',
                left: '14px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Also trigger instant search as user types
                setActiveSearch(e.target.value);
              }}
              placeholder="Search blogs by title, keywords, or topics..."
              style={{
                width: '100%',
                padding: '12px 38px 12px 42px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-color)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                transition: 'border-color 0.2s',
              }}
            />
            {searchQuery && (
              <button
                id="search-clear-btn"
                type="button"
                onClick={clearSearch}
                title="Clear search"
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <button
            id="search-submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '0.95rem',
              whiteSpace: 'nowrap',
            }}
          >
            Search
          </button>
        </form>

        {/* Filter Controls Row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Category Selector & Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Category:</span>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-color)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Quick Category Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="category-pill"
                data-category="ALL"
                onClick={() => setSelectedCategory('ALL')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                  border: selectedCategory === 'ALL' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  background: selectedCategory === 'ALL' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: selectedCategory === 'ALL' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="category-pill"
                  data-category={cat.name}
                  onClick={() => setSelectedCategory(selectedCategory === cat.name ? 'ALL' : cat.name)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    border: selectedCategory === cat.name ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    background: selectedCategory === cat.name ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: selectedCategory === cat.name ? 'var(--primary)' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Selector & Pills */}
          {availableTags.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tag:</span>
              <select
                id="tag-filter"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Tags</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </select>

              {/* Tag Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {availableTags.slice(0, 5).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="tag-pill"
                    data-tag={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? 'ALL' : tag)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: selectedTag === tag ? '1px solid #c084fc' : '1px solid rgba(168, 85, 247, 0.25)',
                      background: selectedTag === tag ? 'rgba(168, 85, 247, 0.25)' : 'rgba(168, 85, 247, 0.08)',
                      color: selectedTag === tag ? '#ffffff' : '#c084fc',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active Filter Chips & Summary */}
        {isFiltering && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span id="results-count" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredPosts.length}</strong> of{' '}
                {initialPosts.length} blogs
              </span>

              {activeSearch && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    color: '#818cf8',
                  }}
                >
                  Search: "{activeSearch}"
                  <button
                    onClick={clearSearch}
                    style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: 0 }}
                  >
                    ✕
                  </button>
                </span>
              )}

              {selectedCategory !== 'ALL' && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    color: '#818cf8',
                  }}
                >
                  Category: {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: 0 }}
                  >
                    ✕
                  </button>
                </span>
              )}

              {selectedTag !== 'ALL' && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    background: 'rgba(168, 85, 247, 0.2)',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    color: '#c084fc',
                  }}
                >
                  Tag: #{selectedTag}
                  <button
                    onClick={() => setSelectedTag('ALL')}
                    style={{ background: 'none', border: 'none', color: '#c084fc', cursor: 'pointer', padding: 0 }}
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>

            <button
              id="clear-filters-btn"
              onClick={clearAllFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Reset All Filters
            </button>
          </div>
        )}
      </section>

      {/* 📄 Main Post Feed / Empty State */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {filteredPosts.length === 0 ? (
          <div
            id="no-blogs-found"
            className="card"
            style={{
              textAlign: 'center',
              padding: 'var(--space-6)',
              background: 'linear-gradient(145deg, #18181b, #09090b)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto var(--space-3) auto',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              No blogs found
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '440px', margin: '0 auto var(--space-4) auto' }}>
              {isFiltering
                ? "We couldn't find any blogs matching your search or filter criteria. Try adjusting your keywords or clearing the filters."
                : "No blogs have been published yet. Check back later for new content!"}
            </p>
            {isFiltering && (
              <button
                id="clear-filters-empty-btn"
                onClick={clearAllFilters}
                className="btn btn-secondary"
                style={{ fontSize: '0.9rem', padding: '8px 18px' }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          filteredPosts.map((post) => {
            const initialLiked = userId && Array.isArray(post.likes) && post.likes.length > 0;
            return (
              <PostCard
                key={post.id}
                post={{
                  ...post,
                  createdAt: post.createdAt,
                }}
                initialLiked={!!initialLiked}
                initialBookmarked={!!post.isBookmarked}
                userAuthenticated={userAuthenticated}
                currentUser={currentUser}
                onTagClick={handleTagClick}
              />
            );
          })
        )}
      </section>
    </div>
  );
}
