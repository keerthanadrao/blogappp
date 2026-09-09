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
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Link
            id="nav-profile-user-link"
            href="/profile"
            style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500, textDecoration: 'none' }}
          >
            {user.name || user.email}
          </Link>
          {user.role === 'ADMIN' ? (
            <span 
              className="badge" 
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}
            >
              ADMIN
            </span>
          ) : (
            <span className="badge badge-primary">
              AUTHOR
            </span>
          )}
        </div>

        <Link id="nav-profile-link" href="/profile" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.9rem' }}>
          👤 Profile
        </Link>
        <Link id="nav-bookmarks-link" href="/bookmarks" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.9rem' }}>
          🔖 Bookmarks
        </Link>
        <Link href="/posts/new" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.9rem' }}>
          + Write Post
        </Link>
        <Link href="/my-posts" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.9rem' }}>
          My Posts
        </Link>
        {user.role === 'ADMIN' && (
          <Link 
            href="/admin" 
            className="btn" 
            style={{ 
              padding: '6px 14px', 
              fontSize: '0.9rem',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)'
            }}
          >
            ⚙️ Admin Dashboard
          </Link>
        )}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <Link href="/login" className="btn btn-secondary" style={{ padding: '8px 16px' }}>
        Login
      </Link>
      <Link href="/signup" className="btn btn-primary" style={{ padding: '8px 16px' }}>
        Sign Up
      </Link>
      <Link 
        href="/admin" 
        className="btn"
        style={{ 
          padding: '8px 14px', 
          fontSize: '0.85rem',
          border: '1px solid var(--border-color)',
          background: 'rgba(24, 24, 27, 0.8)',
          color: '#a1a1aa'
        }}
      >
        🛡️ Admin Portal
      </Link>
    </div>
  );
}
