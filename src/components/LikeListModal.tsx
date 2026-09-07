import React, { useEffect, useState } from 'react';

interface LikeListModalProps {
  postId: string;
  onClose: () => void;
}

export default function LikeListModal({ postId, onClose }: LikeListModalProps) {
  const [users, setUsers] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/like`);
        const data = await res.json();
        if (data.users) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Failed to fetch likers', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [postId]);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div 
        className="card"
        style={{
          width: '90%',
          maxWidth: '400px',
          maxHeight: '80vh',
          overflowY: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <h3 style={{ margin: 0 }}>Liked by</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            &times;
          </button>
        </div>
        
        {loading ? (
          <div style={{ padding: 'var(--space-3) 0', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 'var(--space-3) 0', textAlign: 'center', color: 'var(--text-secondary)' }}>No likes yet.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {users.map((u, i) => (
              <li 
                key={i}
                style={{
                  padding: 'var(--space-2) 0',
                  borderBottom: i === users.length - 1 ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)'
                }}
              >
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: 'var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)'
                }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <span>{u.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
