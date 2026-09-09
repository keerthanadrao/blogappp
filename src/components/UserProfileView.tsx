"use client";

import React, { useState, useRef, useEffect } from 'react';
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
  const [editBio, setEditBio] = useState(user.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  // Photo Picker Modal state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const displayName = user.name || user.email.split('@')[0];
  const initial = (user.name ? user.name.charAt(0) : user.email.charAt(0)).toUpperCase();
  const joinedDateFormatted = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Stop camera tracks when webcam modal closes
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Image resizing helper to create optimal base64 avatar
  const processAndUploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          await saveNewAvatar(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveNewAvatar = async (imageDataUrl: string | null) => {
    setIsSaving(true);
    setEditError('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageDataUrl,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser((prev) => ({
          ...prev,
          image: data.user.image,
        }));
        setAvatarError(false);
        setShowPhotoModal(false);
        setSuccessNotice('Profile photo updated successfully!');
        setTimeout(() => setSuccessNotice(''), 3500);
      } else {
        setEditError(data.error || 'Failed to update profile photo');
      }
    } catch (err: any) {
      setEditError(err.message || 'Failed to update profile photo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadImage(file);
    }
    // reset input value so user can re-select same file if needed
    e.target.value = '';
  };

  const startLiveWebcam = async () => {
    setShowPhotoModal(false);
    setShowWebcamModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Live webcam direct stream not available, falling back to native camera input:', err);
      closeWebcam();
      cameraInputRef.current?.click();
    }
  };

  const captureWebcamSnapshot = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        saveNewAvatar(dataUrl);
      }
    }
    closeWebcam();
  };

  const closeWebcam = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowWebcamModal(false);
  };

  const handleSaveProfileDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setEditError('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          bio: editBio,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser((prev) => ({
          ...prev,
          name: data.user.name,
          bio: data.user.bio,
        }));
        setIsEditing(false);
        setSuccessNotice('Profile details saved successfully!');
        setTimeout(() => setSuccessNotice(''), 3500);
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
      {/* Hidden file inputs for Camera and Gallery upload */}
      <input
        id="camera-file-input"
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        id="gallery-file-input"
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Success Notification Alert */}
      {successNotice && (
        <div
          style={{
            padding: '12px 18px',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid #22c55e',
            borderRadius: 'var(--radius-md)',
            color: '#86efac',
            fontSize: '0.95rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(34, 197, 94, 0.2)',
          }}
        >
          <span>✓</span> {successNotice}
        </div>
      )}

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
            {/* Avatar Section with Interactive Click-to-Change */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div
                id="profile-avatar"
                onClick={() => isOwnProfile && setShowPhotoModal(true)}
                title={isOwnProfile ? 'Click to change profile picture' : displayName}
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
                  border: '3px solid rgba(255, 255, 255, 0.15)',
                  flexShrink: 0,
                  cursor: isOwnProfile ? 'pointer' : 'default',
                  position: 'relative',
                  transition: 'transform 0.15s ease',
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

                {/* Subtle camera overlay badge on hover/own profile */}
                {isOwnProfile && (
                  <div
                    id="change-avatar-badge"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                      borderRadius: '50%',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                  >
                    <span style={{ fontSize: '1.4rem' }}>📷</span>
                  </div>
                )}
              </div>

              {/* Quick Camera Edit button badge below avatar */}
              {isOwnProfile && (
                <button
                  id="change-avatar-btn"
                  type="button"
                  onClick={() => setShowPhotoModal(true)}
                  title="Change profile picture"
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    border: '2px solid var(--bg-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  📷
                </button>
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
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link
                href="/posts/new"
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                + Write Post
              </Link>
              <Link
                href="/my-posts"
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              >
                My Posts
              </Link>
              <Link
                href="/bookmarks"
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              >
                🔖 Bookmarks
              </Link>
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="btn"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.88rem',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    color: '#ffffff',
                    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)',
                  }}
                >
                  ⚙️ Admin Dashboard
                </Link>
              )}
              <button
                id="edit-profile-btn"
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                ✏️ {isEditing ? 'Cancel Edit' : 'Edit Profile'}
              </button>
            </div>
          )}
        </div>

        {/* 📷 Photo Options Modal (Camera or Choose from Gallery/Folder) */}
        {showPhotoModal && isOwnProfile && (
          <div
            id="photo-picker-modal"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 'var(--space-4)',
            }}
            onClick={() => setShowPhotoModal(false)}
          >
            <div
              className="card"
              style={{
                maxWidth: '440px',
                width: '100%',
                padding: 'var(--space-5)',
                background: '#18181b',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Change Profile Picture
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                Choose how you would like to set your profile picture:
              </p>

              {/* Two Main Option Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {/* 1. Camera Button */}
                <button
                  id="btn-camera-capture"
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
                      startLiveWebcam();
                    } else {
                      setShowPhotoModal(false);
                      cameraInputRef.current?.click();
                    }
                  }}
                  style={{
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>📸</span> Take Photo with Camera
                </button>

                {/* 2. Choose from Gallery / Folder Button */}
                <button
                  id="btn-gallery-upload"
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPhotoModal(false);
                    galleryInputRef.current?.click();
                  }}
                  style={{
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>📁</span> Choose from Gallery / Folder
                </button>

                {/* 3. Remove Photo Option (if photo exists) */}
                {user.image && (
                  <button
                    id="remove-photo-btn"
                    type="button"
                    onClick={() => saveNewAvatar(null)}
                    style={{
                      padding: '10px 16px',
                      background: 'none',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      color: '#f87171',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    🗑️ Remove Current Photo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 📹 Live Webcam Snapshot Modal */}
        {showWebcamModal && (
          <div
            id="webcam-capture-modal"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 'var(--space-4)',
            }}
          >
            <div
              className="card"
              style={{
                maxWidth: '520px',
                width: '100%',
                padding: 'var(--space-5)',
                background: '#18181b',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
                textAlign: 'center',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                📸 Camera Snapshot
              </h3>

              <div
                style={{
                  width: '100%',
                  height: '320px',
                  backgroundColor: '#000000',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
                <button
                  type="button"
                  onClick={closeWebcam}
                  className="btn btn-secondary"
                  style={{ padding: '10px 20px' }}
                >
                  Cancel
                </button>
                <button
                  id="btn-take-snapshot"
                  type="button"
                  onClick={captureWebcamSnapshot}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontWeight: 600 }}
                >
                  📸 Capture & Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile Form (Details: Name & Bio, with quick photo change) */}
        {isEditing && isOwnProfile && (
          <form
            id="edit-profile-form"
            onSubmit={handleSaveProfileDetails}
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Update Profile Information
            </h3>

            {editError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                {editError}
              </div>
            )}

            {/* Profile Photo Actions inside Edit Form */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, var(--primary), #a855f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {user.image && !avatarError ? (
                  <img src={user.image} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff' }}>{initial}</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Profile Photo</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    id="form-camera-btn"
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
                        startLiveWebcam();
                      } else {
                        cameraInputRef.current?.click();
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    📸 Camera
                  </button>
                  <button
                    id="form-gallery-btn"
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    📁 Gallery / Folder
                  </button>
                  {user.image && (
                    <button
                      type="button"
                      onClick={() => saveNewAvatar(null)}
                      style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.8rem', cursor: 'pointer', padding: '4px 8px' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

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

        {isOwnProfile && (
          <Link
            id="profile-bookmarks-link"
            href="/bookmarks"
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              color: '#818cf8',
              textDecoration: 'none',
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(129, 140, 248, 0.1)',
              border: '1px solid rgba(129, 140, 248, 0.25)',
              alignSelf: 'center',
            }}
          >
            🔖 View Saved Blogs →
          </Link>
        )}
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
