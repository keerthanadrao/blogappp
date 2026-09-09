"use client";

import React from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

interface AuthNavProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  } | null;
}

export default function AuthNav({ user }: AuthNavProps) {
  if (user) {
    const displayName = user.name || user.email?.split('@')[0] || 'User';
    const initial = displayName.charAt(0).toUpperCase();

    return (
      <div className="nav-links-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* User Identity Pill (Clicking goes to /profile) */}
        <Link
          id="nav-profile-user-link"
          href="/profile"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px 4px 6px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            textDecoration: 'none',
            color: 'var(--text-primary)',
            transition: 'all var(--transition-fast)',
          }}
          title={user.name || user.email || ''}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #818cf8)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            {initial}
          </div>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </span>
          {user.role === 'ADMIN' ? (
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                fontSize: '0.65rem',
                padding: '1px 5px',
              }}
            >
              ADMIN
            </span>
          ) : (
            <span
              className="badge badge-primary"
              style={{
                fontSize: '0.65rem',
                padding: '1px 5px',
              }}
            >
              AUTHOR
            </span>
          )}
        </Link>

        {/* Navigation Quick Links */}
        <Link
          id="nav-profile-link"
          href="/profile"
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.84rem' }}
        >
          👤 Profile
        </Link>

        <Link
          id="nav-bookmarks-link"
          href="/bookmarks"
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.84rem' }}
        >
          🔖 Bookmarks
        </Link>

        <Link
          href="/my-posts"
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.84rem' }}
        >
          My Posts
        </Link>

        {user.role === 'ADMIN' && (
          <Link
            href="/admin"
            className="btn"
            style={{
              padding: '6px 12px',
              fontSize: '0.84rem',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)',
            }}
          >
            ⚙️ Admin
          </Link>
        )}

        <Link
          href="/posts/new"
          className="btn btn-primary"
          style={{ padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600 }}
        >
          + Write Post
        </Link>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="btn btn-secondary"
          style={{
            padding: '6px 10px',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="nav-links-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <Link href="/login" className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.88rem' }}>
        Login
      </Link>
      <Link href="/signup" className="btn btn-primary" style={{ padding: '7px 16px', fontSize: '0.88rem' }}>
        Sign Up
      </Link>
      <Link
        href="/admin"
        className="btn"
        style={{
          padding: '7px 12px',
          fontSize: '0.84rem',
          border: '1px solid var(--border-color)',
          background: 'rgba(255, 255, 255, 0.04)',
          color: 'var(--text-secondary)',
        }}
      >
        🛡️ Admin Portal
      </Link>
    </div>
  );
}
