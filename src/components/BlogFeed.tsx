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

  // In Astra Creative Blog, the top post is showcased as Featured
  const featuredPost = filteredPosts.length > 0 ? filteredPosts[0] : null;
  const gridPosts = filteredPosts.length > 1 ? filteredPosts.slice(1) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 🌟 MNTN-Inspired Scenic Editorial Hero Banner */}
      <section
        className="card astra-hero"
        style={{
          position: 'relative',
          padding: 'clamp(36px, 7vw, 68px) clamp(20px, 5vw, 48px)',
          backgroundImage: `linear-gradient(180deg, rgba(11, 15, 25, 0.40) 0%, rgba(11, 15, 25, 0.72) 48%, rgba(11, 15, 25, 0.97) 100%), url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=85')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          {/* Amber/Gold Eyebrow Accent Line */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              color: '#fbbf24',
              fontSize: '0.82rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)',
            }}
          >
            <span style={{ width: '28px', height: '2px', background: '#fbbf24', display: 'inline-block' }}></span>
            <span>✦ A Curated Editorial Publication ✦</span>
            <span style={{ width: '28px', height: '2px', background: '#fbbf24', display: 'inline-block' }}></span>
          </div>

          {/* High-Contrast Bold Editorial Headline */}
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2.2rem, 5.6vw, 3.7rem)',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              margin: 0,
              textShadow: '0 4px 24px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.95)',
            }}
          >
            Discover Stories Worth Reading
          </h2>

          {/* Subtitle with High Legibility */}
          <p
            style={{
              color: '#f1f5f9',
              fontSize: 'clamp(1.02rem, 2.6vw, 1.2rem)',
              lineHeight: 1.65,
              margin: 0,
              maxWidth: '620px',
              fontWeight: 500,
              textShadow: '0 2px 12px rgba(0,0,0,0.9)',
            }}
          >
            Explore thoughtful ideas, architectural guides, design systems, and inspiring narratives curated for modern creators.
          </p>

          {/* Subtle Explore Hint */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#cbd5e1',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            }}
          >
            <span>Explore Articles</span>
            <span style={{ color: '#fbbf24', fontSize: '0.95rem' }}>↓</span>
          </div>
        </div>

        {/* 🔍 Search Input Bar with Crisp Contrast */}
        <div style={{ width: '100%', maxWidth: '640px', marginTop: 'var(--space-2)' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', width: '100%' }} role="search">
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '16px',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
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
                  setActiveSearch(e.target.value);
                }}
                placeholder="Search articles by title, keywords, or topics..."
                style={{
                  width: '100%',
                  padding: '14px 42px 14px 48px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.28)',
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  backdropFilter: 'blur(16px)',
                  color: '#ffffff',
                  fontSize: '0.98rem',
                  fontWeight: 500,
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
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
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                padding: '0 26px',
                fontWeight: 700,
                fontSize: '0.96rem',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 16px rgba(79, 70, 229, 0.4)',
              }}
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* 🏷️ Clean Streamlined Category Navigation & Tag Filter Bar */}
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: 'var(--space-4)',
        }}
      >
        {/* Left: Clean Category Navigation Tabs / Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="horizontal-scroll-pills" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="category-pill"
              data-category="ALL"
              onClick={() => setSelectedCategory('ALL')}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-pill)',
                border: selectedCategory === 'ALL' ? '1px solid var(--primary-light)' : '1px solid var(--border-color)',
                backgroundColor: selectedCategory === 'ALL' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                color: selectedCategory === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              All Topics
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className="category-pill"
                data-category={cat.name}
                onClick={() => setSelectedCategory(selectedCategory === cat.name ? 'ALL' : cat.name)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-pill)',
                  border: selectedCategory === cat.name ? '1px solid var(--primary-light)' : '1px solid var(--border-color)',
                  backgroundColor: selectedCategory === cat.name ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                  color: selectedCategory === cat.name ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Accessible Category Dropdown Selector */}
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '6px 26px 6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              width: 'auto',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23818cf8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
              backgroundSize: '10px',
              appearance: 'none',
              WebkitAppearance: 'none',
            }}
          >
            <option value="ALL" style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: '10px' }}>
              Filter by Category
            </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name} style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: '10px' }}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Clean Tag Selector Dropdown (No redundant duplicate chips!) */}
        {availableTags.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.86rem', color: '#94a3b8', fontWeight: 600 }}>Tag:</span>
            <select
              id="tag-filter"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              style={{
                padding: '7px 28px 7px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: 'auto',
                minWidth: '120px',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23c084fc' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                backgroundSize: '12px',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            >
              <option value="ALL" style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: '10px' }}>
                All Tags
              </option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag} style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: '10px' }}>
                  #{tag}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Active Filter Chips & Summary */}
        {isFiltering && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px 14px',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginTop: 'var(--space-2)',
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
                    background: 'rgba(99, 102, 241, 0.25)',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    color: '#818cf8',
                    fontWeight: 600,
                  }}
                >
                  "{activeSearch}"
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
                    background: 'rgba(99, 102, 241, 0.25)',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    color: '#818cf8',
                    fontWeight: 600,
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
                    background: 'rgba(168, 85, 247, 0.25)',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    color: '#c084fc',
                    fontWeight: 600,
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
                fontSize: '0.82rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Reset All Filters
            </button>
          </div>
        )}
      </section>

      {/* 📄 Main Content Stream */}
      {filteredPosts.length === 0 ? (
        <div
          id="no-blogs-found"
          className="card"
          style={{
            textAlign: 'center',
            padding: 'var(--space-6)',
            background: 'var(--surface-color)',
            border: '1px dashed var(--border-color)',
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
              style={{ fontSize: '0.9rem', padding: '8px 20px' }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* 🌟 1. Featured Article Showcase (Prominently displayed) */}
          {featuredPost && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                <span>⭐ Featured Story</span>
              </div>
              <PostCard
                key={featuredPost.id}
                post={{
                  ...featuredPost,
                  createdAt: featuredPost.createdAt,
                }}
                initialLiked={!!(userId && Array.isArray(featuredPost.likes) && featuredPost.likes.length > 0)}
                initialBookmarked={!!featuredPost.isBookmarked}
                userAuthenticated={userAuthenticated}
                currentUser={currentUser}
                onTagClick={handleTagClick}
                featured={true}
              />
            </section>
          )}

          {/* 📰 2. Latest Stories Responsive Editorial Grid */}
          {gridPosts.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '8px',
                }}
              >
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Latest Stories
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {gridPosts.length} {gridPosts.length === 1 ? 'article' : 'articles'}
                </span>
              </div>

              <div className="astra-blog-grid">
                {gridPosts.map((post) => {
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
                      featured={false}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
