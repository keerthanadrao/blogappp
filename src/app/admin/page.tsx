'use client';

import { useState, useEffect } from 'react';

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

  useEffect(() => {
    fetchData();
  }, []);

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
          }}
        >
          <input
            type="text"
            placeholder="New Category Name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={{ flex: 1 }}
            disabled={loading}
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            Add Category
          </button>
        </form>

        <table
          style={{
            width: '100%',
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
      </section>

      <section className="card">
        <h2 style={{ marginBottom: 'var(--space-4)' }}>
          Manage Posts
        </h2>

        <table
          style={{
            width: '100%',
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
      </section>
    </div>
  );
}