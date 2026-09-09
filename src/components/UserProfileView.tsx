"use client";

import React, { useState } from 'react';
import Link from 'next/link';

interface UserProfileData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  bio?: string | null;
  createdAt: string;
  posts: {
    id: string;
    title: string;
    body: string;
    cover_image_url?: string | null;
    tags?: string | null;
    createdAt: string;
    category?: { id?: string; name: string } | null;
    _count: { likes: number; comments: number };
  }[];
  comments: {
    id: string;
    content: string;
    createdAt: string;
    post: { id: string; title: string };
  }[];
  stats: {
    postsCount: number;
    commentsCount: number;
    likesCount: number;
  };
}

interface UserProfileViewProps {
  user: UserProfileData;
  isOwnProfile?: boolean;
}

export default function UserProfileView({ user: initialUser, isOwnProfile = false }: UserProfileViewProps) {
  const [user, setUser] = useState<UserProfileData>(initialUser);
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name || '');
  const [editImage, setEditImage] = useState(user.image || '');
  const [editBio, setEditBio] = useState(user.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  const displayName = user.name || user.email.split('@')[0];
  const initial = (user.name ? user.name.charAt(0) : user.email.charAt(0)).toUpperCase();
  const joinedDateFormatted = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setEditError('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          image: editImage,
          bio: editBio,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser((prev) => ({
          ...prev,
          name: data.user.name,
          image: data.user.image,
          bio: data.user.bio,
        }));
        setAvatarError(false);
        setIsEditing(false);
      } else {
        setEditError(data.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setEditError(err.message || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 👤 Profile Header Card */}
      <section
        className="card"
        style={{
          position: 'relative',
          padding: 'var(--space-6)',
          background: 'linear-gradient(145deg, rgba(24, 24, 27, 0.9), rgba(15, 15, 18, 0.95))',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            {/* Avatar Section */}
            <div
              id="profile-avatar"
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, var(--primary), #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                flexShrink: 0,
              }}
            >
              {user.image && !avatarError ? (
                <img
                  src={user.image}
                  alt={displayName}
                  onError={() => setAvatarError(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '2.4rem', fontWeight: 700, color: '#ffffff' }}>{initial}</span>
              )}
            </div>

            {/* Profile Identity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <h1
                  id="profile-name"
                  style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  {displayName}
                </h1>
                <span
                  id="profile-role-badge"
                  className={`badge ${user.role === 'ADMIN' ? '' : 'badge-primary'}`}
                  style={{
                    backgroundColor: user.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.2)' : undefined,
                    color: user.role === 'ADMIN' ? '#f87171' : undefined,
                    border: user.role === 'ADMIN' ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                  }}
                >
                  {user.role}
                </span>
              </div>

              <span id="profile-email" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                {user.email}
              </span>

              <span id="profile-joined-date" style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
                Member since {joinedDateFormatted}
              </span>

              {user.bio && (
                <p id="profile-bio" style={{ color: '#d4d4d8', fontSize: '0.95rem', marginTop: '6px', maxWidth: '540px' }}>
                  {user.bio}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {isOwnProfile && (
            <div>
              <button
                id="edit-profile-btn"
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="btn btn-secondary"
                style={{ padding: '8px 18px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                ✏️ {isEditing ? 'Cancel Edit' : 'Edit Profile'}
              </button>
            </div>
          )}
        </div>

        {/* Edit Profile Form (Conditional) */}
        {isEditing && isOwnProfile && (
          <form
            id="edit-profile-form"
            onSubmit={handleSaveProfile}
            style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-4)',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Update Profile Information</h3>

            {editError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  id="edit-name-input"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Profile Image URL
                </label>
                <input
                  id="edit-image-input"
                  type="url"
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Bio / About Me
              </label>
              <textarea
                id="edit-bio-input"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Share a brief description about yourself..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                id="cancel-edit-btn"
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                id="save-profile-btn"
                type="submit"
                disabled={isSaving}
                className="btn btn-primary"
                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* 📊 Summary Stat Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 'var(--space-3)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Published Posts
            </div>
            <div id="stat-posts-count" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
              {user.stats.postsCount}
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Comments Written
            </div>
            <div id="stat-comments-count" style={{ fontSize: '1.6rem', fontWeight: 700, color: '#a855f7', marginTop: '2px' }}>
              {user.stats.commentsCount}
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Likes Received
            </div>
            <div id="stat-likes-count" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--danger)', marginTop: '2px' }}>
              {user.stats.likesCount}
            </div>
          </div>
        </div>
      </section>

      {/* 📑 Tab Navigation */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
        <button
          id="tab-posts"
          type="button"
          onClick={() => setActiveTab('posts')}
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'posts' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'posts' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'posts' ? 600 : 500,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          📝 Published Posts ({user.posts.length})
        </button>

        <button
          id="tab-comments"
          type="button"
          onClick={() => setActiveTab('comments')}
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'comments' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'comments' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'comments' ? 600 : 500,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          💬 Comments ({user.comments.length})
        </button>
      </div>

      {/* 📝 Tab 1: Published Posts Section */}
      {activeTab === 'posts' && (
        <section id="profile-posts-section" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {user.posts.length === 0 ? (
            <div
              id="no-profile-posts"
              className="card"
              style={{
                textAlign: 'center',
                padding: 'var(--space-6)',
                background: 'rgba(24, 24, 27, 0.5)',
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>📭</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                No posts found
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {isOwnProfile ? "You haven't published any blog posts yet." : `${displayName} has not published any posts yet.`}
              </p>
              {isOwnProfile && (
                <Link href="/posts/new" className="btn btn-primary" style={{ marginTop: 'var(--space-3)', display: 'inline-block' }}>
                  + Write Your First Post
                </Link>
              )}
            </div>
          ) : (
            user.posts.map((post) => (
              <article
                key={post.id}
                className="card user-profile-post-card"
                style={{
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'border-color 0.2s',
                }}
              >
                {post.cover_image_url && (
                  <div style={{ width: '100%', maxHeight: '200px', overflow: 'hidden', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-1)' }}>
                    <img src={post.cover_image_url} alt={post.title} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                    <Link href="/" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {post.title}
                    </Link>
                  </h3>
                  {post.category && (
                    <span
                      style={{
                        padding: '2px 8px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--primary)',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {post.category.name}
                    </span>
                  )}
                </div>

                <p style={{ color: '#a1a1aa', fontSize: '0.95rem', lineHeight: '1.6', margin: '4px 0' }}>
                  {post.body.length > 180 ? `${post.body.substring(0, 180)}...` : post.body}
                </p>

                {/* Post Tags */}
                {post.tags && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {post.tags
                      .split(',')
                      .map((t) => t.trim().replace(/^#/, ''))
                      .filter(Boolean)
                      .map((tag, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            background: 'rgba(168, 85, 247, 0.1)',
                            color: '#c084fc',
                            borderRadius: 'var(--radius-pill)',
                            border: '1px solid rgba(168, 85, 247, 0.25)',
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 'var(--space-2)',
                    paddingTop: 'var(--space-2)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>
                    Published on{' '}
                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>

                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <span>❤️ {post._count.likes} likes</span>
                    <span>💬 {post._count.comments} comments</span>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {/* 💬 Tab 2: Comments Section */}
      {activeTab === 'comments' && (
        <section id="profile-comments-section" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {user.comments.length === 0 ? (
            <div
              id="no-profile-comments"
              className="card"
              style={{
                textAlign: 'center',
                padding: 'var(--space-6)',
                background: 'rgba(24, 24, 27, 0.5)',
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>💬</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                No comments found
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {isOwnProfile ? "You haven't written any comments yet." : `${displayName} has not posted any comments yet.`}
              </p>
            </div>
          ) : (
            user.comments.map((comment) => (
              <div
                key={comment.id}
                className="card user-profile-comment-card"
                style={{
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                    Commented on: <strong style={{ color: 'var(--text-primary)' }}>{comment.post.title}</strong>
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {new Date(comment.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div
                  style={{
                    color: '#e4e4e7',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--primary)',
                  }}
                >
                  {comment.content}
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}
