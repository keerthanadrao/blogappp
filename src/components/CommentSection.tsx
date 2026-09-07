"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export interface CommentAuthor {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export interface CommentData {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  author: CommentAuthor;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CommentSectionProps {
  postId: string;
  initialCommentCount?: number;
  currentUser: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
  } | null;
  onCommentCountChange?: (count: number) => void;
}

export default function CommentSection({
  postId,
  currentUser,
  onCommentCountChange,
}: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        if (onCommentCountChange) {
          onCommentCountChange((data.comments || []).length);
        }
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newCommentText.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setNewCommentText('');
        const updated = [...comments, data.comment];
        setComments(updated);
        if (onCommentCountChange) {
          onCommentCountChange(updated.length);
        }
      } else {
        setError(data.error || 'Failed to post comment');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReply = async (parentCommentId: string, replyText: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText.trim(), parentCommentId }),
      });

      const data = await res.json();
      if (res.ok) {
        const updated = [...comments, data.comment];
        setComments(updated);
        if (onCommentCountChange) {
          onCommentCountChange(updated.length);
        }
        return true;
      } else {
        alert(data.error || 'Failed to post reply');
        return false;
      }
    } catch (err) {
      console.error(err);
      alert('Failed to post reply');
      return false;
    }
  };

  const handleEditComment = async (commentId: string, updatedContent: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedContent.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, content: data.comment.content, updatedAt: data.comment.updatedAt } : c))
        );
        return true;
      } else {
        alert(data.error || 'Failed to edit comment');
        return false;
      }
    } catch (err) {
      console.error(err);
      alert('Failed to edit comment');
      return false;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment? All replies will also be removed.')) {
      return;
    }

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Find all descendants recursively to remove from state
        const getDescendantIds = (parentId: string, list: CommentData[]): string[] => {
          const directChildren = list.filter((c) => c.parentCommentId === parentId);
          return [
            parentId,
            ...directChildren.flatMap((child) => getDescendantIds(child.id, list)),
          ];
        };

        const idsToDelete = new Set(getDescendantIds(commentId, comments));
        const remaining = comments.filter((c) => !idsToDelete.has(c.id));
        setComments(remaining);
        if (onCommentCountChange) {
          onCommentCountChange(remaining.length);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete comment');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete comment');
    }
  };

  // Group comments into root comments and map of replies by parentId
  const rootComments = comments.filter((c) => !c.parentCommentId);
  const repliesByParentId: { [parentId: string]: CommentData[] } = {};

  comments.forEach((c) => {
    if (c.parentCommentId) {
      if (!repliesByParentId[c.parentCommentId]) {
        repliesByParentId[c.parentCommentId] = [];
      }
      repliesByParentId[c.parentCommentId].push(c);
    }
  });

  return (
    <div
      className="comment-section"
      style={{
        marginTop: 'var(--space-4)',
        paddingTop: 'var(--space-4)',
        borderTop: '1px solid var(--border-color)',
      }}
    >
      <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Comments
        <span
          style={{
            fontSize: '0.85rem',
            background: 'var(--surface-hover)',
            color: 'var(--text-secondary)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          {comments.length}
        </span>
      </h3>

      {/* New Top-Level Comment Form */}
      {currentUser ? (
        <form onSubmit={handleCreateComment} style={{ marginBottom: 'var(--space-5)' }}>
          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 'var(--space-2)' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add to the discussion..."
              rows={2}
              style={{
                flex: 1,
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                resize: 'vertical',
                minHeight: '44px',
              }}
              required
            />
            <button
              type="submit"
              disabled={submitting || !newCommentText.trim()}
              className="btn btn-primary"
              style={{ alignSelf: 'flex-end', height: '42px', padding: '0 var(--space-3)' }}
            >
              {submitting ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div
          style={{
            background: 'var(--surface-hover)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            textAlign: 'center',
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Link href="/login" style={{ fontWeight: '600', color: 'var(--primary)' }}>
            Log in
          </Link>{' '}
          or{' '}
          <Link href="/signup" style={{ fontWeight: '600', color: 'var(--primary)' }}>
            Sign up
          </Link>{' '}
          to join the discussion.
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div style={{ color: 'var(--text-secondary)', padding: 'var(--space-3) 0', fontSize: '0.9rem' }}>
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: 'var(--space-2) 0', fontSize: '0.9rem' }}>
          No comments yet. Be the first to share your thoughts!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {rootComments.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              repliesByParentId={repliesByParentId}
              currentUser={currentUser}
              onReply={handleCreateReply}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentNodeProps {
  comment: CommentData;
  repliesByParentId: { [parentId: string]: CommentData[] };
  currentUser: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
  } | null;
  onReply: (parentCommentId: string, replyText: string) => Promise<boolean>;
  onEdit: (commentId: string, updatedContent: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<void>;
  depth: number;
}

function CommentNode({
  comment,
  repliesByParentId,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  depth,
}: CommentNodeProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const replies = repliesByParentId[comment.id] || [];

  const authorName = comment.author.name || comment.author.email;
  const isAuthor = currentUser?.id === comment.authorId;
  const isAdmin = currentUser?.role === 'ADMIN';
  const canDelete = isAuthor || isAdmin;
  const canEdit = isAuthor;

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    const success = await onReply(comment.id, replyText);
    if (success) {
      setReplyText('');
      setIsReplying(false);
    }
    setIsSubmittingReply(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editText.trim() || isSubmittingEdit) return;

    setIsSubmittingEdit(true);
    const success = await onEdit(comment.id, editText);
    if (success) {
      setIsEditing(false);
    }
    setIsSubmittingEdit(false);
  };

  return (
    <div
      className="comment-item"
      data-comment-id={comment.id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        paddingLeft: depth > 0 ? 'var(--space-3)' : '0',
        borderLeft: depth > 0 ? '2px solid var(--border-color)' : 'none',
        marginLeft: depth > 0 ? 'var(--space-2)' : '0',
      }}
    >
      <div
        style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
        }}
      >
        {/* Comment Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {authorName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {authorName}
            </span>
            {comment.author.role === 'ADMIN' && (
              <span
                style={{
                  fontSize: '0.7rem',
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: 'var(--primary)',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-pill)',
                  fontWeight: '600',
                }}
              >
                ADMIN
              </span>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {new Date(comment.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {canEdit && !isEditing && (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setEditText(comment.content);
                }}
                className="edit-comment-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="delete-comment-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--danger)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Comment Content or Edit Form */}
        {isEditing ? (
          <form onSubmit={handleEditSubmit} style={{ marginTop: 'var(--space-2)' }}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 'var(--space-2)',
                fontSize: '0.9rem',
              }}
              required
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingEdit || !editText.trim()}
                className="btn btn-primary"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                {isSubmittingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div
            className="comment-content"
            style={{
              color: '#d4d4d8',
              fontSize: '0.92rem',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
            }}
          >
            {comment.content}
          </div>
        )}

        {/* Reply Trigger */}
        {currentUser && !isEditing && (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="reply-btn"
              style={{
                background: 'none',
                border: 'none',
                color: isReplying ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 0',
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v3M3 10l6-6M3 10l6 6" />
              </svg>
              {isReplying ? 'Cancel Reply' : 'Reply'}
            </button>
          </div>
        )}

        {/* Inline Reply Form */}
        {isReplying && (
          <form
            onSubmit={handleReplySubmit}
            style={{
              marginTop: 'var(--space-2)',
              paddingTop: 'var(--space-2)',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Replying to ${authorName}...`}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                }}
                required
              />
              <button
                type="submit"
                disabled={isSubmittingReply || !replyText.trim()}
                className="btn btn-primary"
                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
              >
                {isSubmittingReply ? 'Replying...' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Recursive Nested Replies */}
      {replies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
          {replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              repliesByParentId={repliesByParentId}
              currentUser={currentUser}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
