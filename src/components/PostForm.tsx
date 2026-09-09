"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
}

interface PostFormProps {
  initialData?: {
    id: string;
    title: string;
    body: string;
    categoryId: string;
    status: 'DRAFT' | 'PUBLISHED';
    cover_image_url?: string | null;
    tags?: string | null;
  };
  isEditing?: boolean;
}

export default function PostForm({ initialData, isEditing = false }: PostFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.cover_image_url || '');
  const [tags, setTags] = useState(initialData?.tags || '');
  const [imagePreviewError, setImagePreviewError] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.categories) {
          setCategories(data.categories);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCategories();
  }, []);

  const isValidUrl = (urlString: string) => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED') => {
    setErrorMessage('');
    if (!title.trim() || !body.trim() || !categoryId) {
      setErrorMessage('Title, body, and category are required.');
      return;
    }

    const trimmedImageUrl = coverImageUrl.trim();
    if (trimmedImageUrl && !isValidUrl(trimmedImageUrl)) {
      setErrorMessage('Please enter a valid HTTP or HTTPS Image URL.');
      return;
    }

    setSaving(true);
    try {
      const url = isEditing ? `/api/posts/${initialData?.id}` : '/api/posts';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          categoryId,
          status,
          cover_image_url: trimmedImageUrl || null,
          tags: tags.trim() || null,
        }),
      });

      const responseData = await res.json();

      if (res.ok) {
        router.push('/my-posts');
        router.refresh();
      } else {
        setErrorMessage(responseData.error || 'Failed to save post');
      }
    } catch (error) {
      console.error('Error submitting post:', error);
      setErrorMessage('An unexpected error occurred while saving the post.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: 'var(--space-6)' }}>
      {errorMessage && (
        <div style={{
          padding: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-md)',
          color: '#fca5a5',
          fontSize: '0.95rem'
        }}>
          {errorMessage}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '600' }}>
            Title <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Enter post title..."
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-primary)',
              fontSize: '1.1rem'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '600' }}>
            Category <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <select 
            value={categoryId} 
            onChange={e => setCategoryId(e.target.value)}
            disabled={loadingCats}
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
          >
            <option value="">{loadingCats ? 'Loading categories...' : 'Select a category'}</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tags-input" style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '600' }}>
            Tags <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.9rem' }}>(Optional, comma-separated)</span>
          </label>
          <input 
            id="tags-input"
            type="text" 
            value={tags} 
            onChange={e => setTags(e.target.value)} 
            placeholder="e.g. tech, javascript, react, tutorial"
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <label htmlFor="cover_image_url" style={{ fontWeight: '600' }}>
              Cover Image URL <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.9rem' }}>(Optional)</span>
            </label>
          </div>
          <input 
            id="cover_image_url"
            type="text" 
            value={coverImageUrl} 
            onChange={e => {
              setCoverImageUrl(e.target.value);
              setImagePreviewError(false);
            }} 
            placeholder="https://images.unsplash.com/... or https://example.com/cover.jpg"
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
          />
          {coverImageUrl.trim() && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Image Preview:
              </span>
              <div style={{
                position: 'relative',
                maxHeight: '220px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {!imagePreviewError ? (
                  <img 
                    src={coverImageUrl.trim()} 
                    alt="Cover preview" 
                    onError={() => setImagePreviewError(true)}
                    style={{
                      width: '100%',
                      maxHeight: '220px',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                ) : (
                  <div style={{ padding: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                    ⚠️ Unable to load image preview from this URL. Please verify the link.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '600' }}>
            Content <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <textarea 
            value={body} 
            onChange={e => setBody(e.target.value)} 
            placeholder="Write your post content here..."
            rows={12}
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              fontSize: '1rem',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
          <button 
            type="button"
            onClick={() => handleSubmit('DRAFT')} 
            disabled={saving}
            className="btn btn-secondary"
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button 
            type="button"
            onClick={() => handleSubmit('PUBLISHED')} 
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Publishing...' : (isEditing && initialData?.status === 'PUBLISHED' ? 'Update Post' : 'Publish')}
          </button>
        </div>
      </div>
    </div>
  );
}
