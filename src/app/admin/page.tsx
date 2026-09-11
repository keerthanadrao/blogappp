'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import RichTextEditor (Tiptap) to avoid SSR mismatch
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: '220px',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
      }}
    >
      Loading editor…
    </div>
  ),
});

export default function AdminDashboard() {
  console.log('ADMIN PAGE LOADED');

  const [categories, setCategories] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');

  // Edit State
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ─── News State ─────────────────────────────────────────────────────────
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState('');

  // Create form
  const [newsTitle, setNewsTitle] = useState('');
  const [newsDescription, setNewsDescription] = useState('');
  const [newsPublished, setNewsPublished] = useState(false);
  const [newsSaving, setNewsSaving] = useState(false);

  // Edit form
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [editNewsTitle, setEditNewsTitle] = useState('');
  const [editNewsDescription, setEditNewsDescription] = useState('');
  const [editNewsPublished, setEditNewsPublished] = useState(false);
  const [editNewsSaving, setEditNewsSaving] = useState(false);

  const fetchData = async () => {
    console.log('FETCH DATA STARTED');
    setLoading(true);
    setError('');

    try {
      const [catRes, postRes] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch('/api/admin/posts'),
      ]);

      console.log('FETCH RESPONSES:', catRes.status, postRes.status);

      if (!catRes.ok || !postRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const catData = await catRes.json();
      const postData = await postRes.json();
      
      console.log('FETCH JSON:', catData, postData);

      setCategories(catData.categories || []);
      setPosts(postData.posts || []);
    } catch (err) {
      console.error('DASHBOARD FETCH ERROR:', err);
      setError('Failed to fetch dashboard data');
    } finally {
      console.log('FETCH DATA FINISHED');
      setLoading(false);
    }
  };

  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError('');
    try {
      const res = await fetch('/api/admin/news');
      if (!res.ok) throw new Error('Failed to fetch news');
      const data = await res.json();
      setNews(data.news || []);
    } catch (err) {
      console.error('NEWS FETCH ERROR:', err);
      setNewsError('Failed to fetch news items');
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchNews();
  }, [fetchNews]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoryName = newCategory.trim();

    if (!categoryName) {
      setError('Category name is required');
      return;
    }

    setError('');

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create category');
        return;
      }

      // Immediately add the newly created category to the table
      if (data.category) {
        setCategories((currentCategories) => {
          const exists = currentCategories.some(
            (category) => category.id === data.category.id
          );

          if (exists) {
            return currentCategories;
          }

          return [...currentCategories, data.category].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
        });
      }

      setNewCategory('');

      // Refresh from database to keep the dashboard synchronized
      await fetchData();
    } catch (err) {
      console.error('CATEGORY CREATE ERROR:', err);
      setError('Failed to create category');
    }
  };

  const handleEditCategory = async (id: string) => {
    const categoryName = editingCategoryName.trim();

    if (!categoryName) {
      setError('Category name is required');
      return;
    }

    setError('');

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          name: categoryName,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setEditingCategoryId(null);
        setEditingCategoryName('');

        await fetchData();
      } else {
        setError(data.error || 'Failed to update category');
      }
    } catch (err) {
      console.error('CATEGORY UPDATE ERROR:', err);
      setError('Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    setError('');

    try {
      const res = await fetch(
        `/api/admin/categories?id=${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        }
      );

      const data = await res.json();

      if (res.ok) {
        setCategories((currentCategories) =>
          currentCategories.filter((category) => category.id !== id)
        );

        await fetchData();
      } else {
        setError(data.error || 'Failed to delete category');
      }
    } catch (err) {
      console.error('CATEGORY DELETE ERROR:', err);
      setError('Failed to delete category');
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setError('');

    try {
      const res = await fetch(
        `/api/admin/posts?id=${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        }
      );

      const data = await res.json();

      if (res.ok) {
        setPosts((currentPosts) =>
          currentPosts.filter((post) => post.id !== id)
        );

        await fetchData();
      } else {
        setError(data.error || 'Failed to delete post');
      }
    } catch (err) {
      console.error('POST DELETE ERROR:', err);
      setError('Failed to delete post');
    }
  };

  // ─── News Handlers ────────────────────────────────────────────────────────

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsError('');
    if (!newsTitle.trim()) {
      setNewsError('News title is required.');
      return;
    }
    setNewsSaving(true);
    try {
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newsTitle.trim(),
          description: newsDescription,
          published: newsPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewsError(data.error || 'Failed to create news item');
        return;
      }
      setNewsTitle('');
      setNewsDescription('');
      setNewsPublished(false);
      await fetchNews();
    } catch (err) {
      console.error('NEWS CREATE ERROR:', err);
      setNewsError('Failed to create news item');
    } finally {
      setNewsSaving(false);
    }
  };

  const handleStartEditNews = (item: any) => {
    setEditingNewsId(item.id);
    setEditNewsTitle(item.title);
    setEditNewsDescription(item.description || '');
    setEditNewsPublished(item.published);
  };

  const handleCancelEditNews = () => {
    setEditingNewsId(null);
    setEditNewsTitle('');
    setEditNewsDescription('');
    setEditNewsPublished(false);
  };

  const handleSaveEditNews = async (id: string) => {
    setNewsError('');
    if (!editNewsTitle.trim()) {
      setNewsError('News title is required.');
      return;
    }
    setEditNewsSaving(true);
    try {
      const res = await fetch('/api/admin/news', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title: editNewsTitle.trim(),
          description: editNewsDescription,
          published: editNewsPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewsError(data.error || 'Failed to update news item');
        return;
      }
      handleCancelEditNews();
      await fetchNews();
    } catch (err) {
      console.error('NEWS UPDATE ERROR:', err);
      setNewsError('Failed to update news item');
    } finally {
      setEditNewsSaving(false);
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news item?')) return;
    setNewsError('');
    try {
      const res = await fetch(`/api/admin/news?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setNews((prev) => prev.filter((n) => n.id !== id));
      } else {
        setNewsError(data.error || 'Failed to delete news item');
      }
    } catch (err) {
      console.error('NEWS DELETE ERROR:', err);
      setNewsError('Failed to delete news item');
    }
  };

  // ─── Shared inline styles ─────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-subtle)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 600,
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      <h1>Dashboard Overview</h1>

      {error && (
        <div
          style={{
            color: 'var(--danger)',
            marginBottom: 'var(--space-3)',
          }}
        >
          {error}
        </div>
      )}

      {loading && <div>Loading dashboard...</div>}

      <section className="card">
        <h2 style={{ marginBottom: 'var(--space-4)' }}>
          Manage Categories
        </h2>

        <form
          onSubmit={handleCreateCategory}
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            placeholder="New Category Name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
            disabled={loading}
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            Add Category
          </button>
        </form>

        <div className="table-responsive">
          <table
            style={{
              width: '100%',
              minWidth: '320px',
              borderCollapse: 'collapse',
            }}
          >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-color)',
                textAlign: 'left',
              }}
            >
              <th style={{ padding: 'var(--space-2) 0' }}>
                Name
              </th>

              <th style={{ padding: 'var(--space-2) 0' }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {categories.map((cat) => (
              <tr
                key={cat.id}
                style={{
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <td style={{ padding: 'var(--space-2) 0' }}>
                  {editingCategoryId === cat.id ? (
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) =>
                        setEditingCategoryName(e.target.value)
                      }
                      autoFocus
                    />
                  ) : (
                    cat.name
                  )}
                </td>

                <td
                  style={{
                    padding: 'var(--space-2) 0',
                    display: 'flex',
                    gap: 'var(--space-2)',
                  }}
                >
                  {editingCategoryId === cat.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleEditCategory(cat.id)
                        }
                        className="btn btn-success"
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                        }}
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(null);
                          setEditingCategoryName('');
                        }}
                        className="btn btn-secondary"
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(cat.id);
                          setEditingCategoryName(cat.name);
                        }}
                        className="btn btn-secondary"
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                        }}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteCategory(cat.id)
                        }
                        className="btn btn-danger"
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {categories.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={2}
                  style={{
                    padding: 'var(--space-2) 0',
                    color: 'var(--text-secondary)',
                  }}
                >
                  No categories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginBottom: 'var(--space-4)' }}>
          Manage Posts
        </h2>

        <div className="table-responsive">
          <table
            style={{
              width: '100%',
              minWidth: '540px',
              borderCollapse: 'collapse',
            }}
          >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-color)',
                textAlign: 'left',
              }}
            >
              <th style={{ padding: 'var(--space-2) 0' }}>
                Title
              </th>

              <th style={{ padding: 'var(--space-2) 0' }}>
                Author
              </th>

              <th style={{ padding: 'var(--space-2) 0' }}>
                Category
              </th>

              <th style={{ padding: 'var(--space-2) 0' }}>
                Status
              </th>

              <th style={{ padding: 'var(--space-2) 0' }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {posts.map((post) => (
              <tr
                key={post.id}
                style={{
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <td style={{ padding: 'var(--space-2) 0' }}>
                  {post.title}
                </td>

                <td style={{ padding: 'var(--space-2) 0' }}>
                  {post.author?.name} ({post.author?.email})
                </td>

                <td style={{ padding: 'var(--space-2) 0' }}>
                  {post.category?.name}
                </td>

                <td style={{ padding: 'var(--space-2) 0' }}>
                  <span
                    className={
                      post.status === 'PUBLISHED'
                        ? 'badge badge-success'
                        : 'badge badge-primary'
                    }
                  >
                    {post.status}
                  </span>
                </td>

                <td style={{ padding: 'var(--space-2) 0' }}>
                  <button
                    type="button"
                    onClick={() =>
                      handleDeletePost(post.id)
                    }
                    className="btn btn-danger"
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {posts.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 'var(--space-2) 0',
                    color: 'var(--text-secondary)',
                  }}
                >
                  No posts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </section>

      {/* ──────────────────── Manage News ──────────────────────────────── */}
      <section className="card" id="news-section">
        <h2 style={{ marginBottom: 'var(--space-4)' }}>📰 Manage News</h2>

        {newsError && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: 'var(--space-3)',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: '0.9rem',
            }}
          >
            {newsError}
          </div>
        )}

        {/* ── Create News Form ── */}
        <form
          onSubmit={handleCreateNews}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-5)',
            padding: 'var(--space-4)',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Create News Item</h3>

          {/* Title */}
          <div>
            <label htmlFor="news-title" style={labelStyle}>
              Title <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="news-title"
              data-testid="news-title-input"
              type="text"
              placeholder="News headline…"
              value={newsTitle}
              onChange={(e) => setNewsTitle(e.target.value)}
              style={inputStyle}
              disabled={newsSaving}
            />
          </div>

          {/* Description — Rich-Text Editor */}
          <div>
            <label style={labelStyle}>
              Description <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.82rem' }}>(supports bold, italic, lists, paste)</span>
            </label>
            <RichTextEditor
              id="news-description-editor"
              value={newsDescription}
              onChange={setNewsDescription}
              placeholder="Write news description here… (supports bold, italic, bullet and numbered lists)"
              minHeight="200px"
            />
          </div>

          {/* Published toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              id="news-published"
              data-testid="news-published-checkbox"
              type="checkbox"
              checked={newsPublished}
              onChange={(e) => setNewsPublished(e.target.checked)}
              style={{ width: 'auto', cursor: 'pointer' }}
              disabled={newsSaving}
            />
            <label htmlFor="news-published" style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.92rem' }}>
              Publish immediately
            </label>
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={newsSaving}
              data-testid="news-create-btn"
            >
              {newsSaving ? 'Creating…' : '+ Create News Item'}
            </button>
          </div>
        </form>

        {/* ── News List ── */}
        {newsLoading ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading news…</div>
        ) : news.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No news items yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {news.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 'var(--space-3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0,0,0,0.15)',
                }}
                data-testid={`news-item-${item.id}`}
              >
                {editingNewsId === item.id ? (
                  /* ── Inline Edit Form ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div>
                      <label style={labelStyle}>Title</label>
                      <input
                        type="text"
                        value={editNewsTitle}
                        onChange={(e) => setEditNewsTitle(e.target.value)}
                        style={inputStyle}
                        disabled={editNewsSaving}
                        data-testid="news-edit-title-input"
                        autoFocus
                      />
                    </div>

                    {/* Description Rich-Text Editor for editing */}
                    <div>
                      <label style={labelStyle}>Description</label>
                      <RichTextEditor
                        id="news-edit-description-editor"
                        value={editNewsDescription}
                        onChange={setEditNewsDescription}
                        placeholder="Write news description…"
                        minHeight="180px"
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        id={`news-edit-published-${item.id}`}
                        type="checkbox"
                        checked={editNewsPublished}
                        onChange={(e) => setEditNewsPublished(e.target.checked)}
                        style={{ width: 'auto', cursor: 'pointer' }}
                        disabled={editNewsSaving}
                      />
                      <label htmlFor={`news-edit-published-${item.id}`} style={{ cursor: 'pointer', fontSize: '0.92rem' }}>
                        Published
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button
                        type="button"
                        onClick={() => handleSaveEditNews(item.id)}
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '13px' }}
                        disabled={editNewsSaving}
                        data-testid="news-save-edit-btn"
                      >
                        {editNewsSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditNews}
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '13px' }}
                        disabled={editNewsSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Read View ── */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontWeight: 700, marginBottom: '4px' }}>{item.title}</p>
                        <span
                          className={item.published ? 'badge badge-success' : 'badge badge-primary'}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {item.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleStartEditNews(item)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          data-testid={`news-edit-btn-${item.id}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNews(item.id)}
                          className="btn btn-danger"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          data-testid={`news-delete-btn-${item.id}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {item.description && (
                      <div
                        className="news-prose"
                        style={{ marginTop: '10px', opacity: 0.85 }}
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}