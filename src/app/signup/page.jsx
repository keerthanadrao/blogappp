"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import AuthSuccessModal from "@/components/AuthSuccessModal";

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'reader';
    const errorParam = searchParams.get('error');

    const [role, setRole] = useState(initialRole);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [secretKey, setSecretKey] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showSecretKey, setShowSecretKey] = useState(false);

    useEffect(() => {
        if (searchParams.get('role') === 'admin') {
            setRole('admin');
        }
    }, [searchParams]);

    useEffect(() => {
        if (errorParam) {
            if (errorParam === 'AccessDenied' || errorParam === 'Callback') {
                setError("Authentication was cancelled or access was denied. Please try again.");
            } else if (errorParam === 'OAuthSignin' || errorParam === 'OAuthCallback') {
                setError("Social sign-in was cancelled or encountered a provider error. Please try again.");
            } else if (errorParam === 'OAuthAccountNotLinked') {
                setError("This email is already associated with another login provider.");
            } else {
                setError(`Authentication failed (${errorParam}). Please try again.`);
            }
        }
    }, [errorParam]);

    async function handleSocialSignup(provider) {
        setError("");
        setSocialLoading(provider);
        try {
            await signIn(provider, { callbackUrl: "/" });
        } catch {
            setError(`Failed to redirect to ${provider}. Please try again.`);
            setSocialLoading("");
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const endpoint = role === 'admin' ? "/api/auth/admin-register" : "/api/auth/register";
            const payload = role === 'admin' 
                ? { name, email, password, secretKey } 
                : { name, email, password };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Registration failed");
                setLoading(false);
                return;
            }

            // Show success popup and automatically redirect to Login page
            setShowSuccessModal(true);
            setLoading(false);

            setTimeout(() => {
                window.location.href = role === 'admin' ? "/login?role=admin" : "/login";
            }, 800);
        } catch {
            setError("Something went wrong. Please try again.");
            setLoading(false);
        }
    }

    return (
        <>
            <AuthSuccessModal
                isOpen={showSuccessModal}
                title="Account Created Successfully!"
                message={role === 'admin' 
                    ? "Your administrator account has been set up. Opening Sign In..." 
                    : "Welcome to Antigravity Blog! Your account is ready."}
                redirectingTo="Sign In"
            />
            <div className="card" style={{ 
                width: '100%', 
                maxWidth: '460px', 
                padding: 'clamp(var(--space-4), 5vw, var(--space-6))',
                border: role === 'admin' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                boxShadow: role === 'admin' ? '0 8px 32px rgba(239, 68, 68, 0.15)' : '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
                <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    ← Back to Blog
                </Link>
                <h1 style={{ 
                    fontSize: 'clamp(1.6rem, 4.5vw, 2.2rem)', 
                    marginTop: 'var(--space-2)',
                    background: role === 'admin' 
                        ? 'linear-gradient(to right, #ef4444, #f97316)' 
                        : 'linear-gradient(to right, var(--primary), #a855f7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.2
                }}>
                    {role === 'admin' ? 'Admin Registration' : 'Create Account'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', marginTop: 'var(--space-1)' }}>
                    {role === 'admin' 
                        ? 'Register an administrator account with security key (Single Admin System)' 
                        : 'Join the community with your favorite account or email'}
                </p>
            </div>

            {/* Account Type Tabs */}
            <div style={{ 
                display: 'flex', 
                borderRadius: 'var(--radius-md)', 
                background: 'var(--bg-color)', 
                padding: '4px', 
                marginBottom: 'var(--space-5)',
                border: '1px solid var(--border-color)'
            }}>
                <button
                    type="button"
                    onClick={() => { setRole('reader'); setError(''); }}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: role === 'reader' ? 'var(--primary)' : 'transparent',
                        color: role === 'reader' ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                    }}
                >
                    Author / Reader
                </button>
                <button
                    type="button"
                    onClick={() => { setRole('admin'); setError(''); }}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: role === 'admin' ? 'var(--danger)' : 'transparent',
                        color: role === 'admin' ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                    }}
                >
                    🛡️ Admin
                </button>
            </div>

            {error && (
                <div 
                    id="signup-error-banner"
                    role="alert"
                    style={{
                        padding: 'var(--space-3)',
                        marginBottom: 'var(--space-4)',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid var(--danger)',
                        borderRadius: 'var(--radius-md)',
                        color: '#fca5a5',
                        fontSize: '0.9rem',
                        textAlign: 'center'
                    }}
                >
                    {error}
                </div>
            )}

            {/* Social Authentication Options (for Reader / Author signup) */}
            {role === 'reader' && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {/* Google Button */}
                        <button
                            id="social-google-btn"
                            type="button"
                            disabled={!!socialLoading}
                            onClick={() => handleSocialSignup('google')}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                padding: '11px 16px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.borderColor = '#4285F4';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            }}
                        >
                            {/* Official Google 'G' Multi-color SVG */}
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                />
                            </svg>
                            <span>{socialLoading === 'google' ? "Connecting to Google..." : "Continue with Google"}</span>
                        </button>

                        {/* LinkedIn Button */}
                        <button
                            id="social-linkedin-btn"
                            type="button"
                            disabled={!!socialLoading}
                            onClick={() => handleSocialSignup('linkedin')}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                padding: '11px 16px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.borderColor = '#0A66C2';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2">
                                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.07v8.37h2.78z" />
                            </svg>
                            <span>{socialLoading === 'linkedin' ? "Connecting to LinkedIn..." : "Continue with LinkedIn"}</span>
                        </button>

                        {/* GitHub Button */}
                        <button
                            id="social-github-btn"
                            type="button"
                            disabled={!!socialLoading}
                            onClick={() => handleSocialSignup('github')}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                padding: '11px 16px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.borderColor = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                            </svg>
                            <span>{socialLoading === 'github' ? "Connecting to GitHub..." : "Continue with GitHub"}</span>
                        </button>

                    </div>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--space-4) 0 var(--space-2) 0', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                        <span style={{ padding: '0 12px' }}>or continue with email</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div>
                    <label htmlFor="name" style={{ display: 'block', marginBottom: 'var(--space-1)', fontWeight: 500 }}>
                        Full Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Enter your name"
                    />
                </div>

                <div>
                    <label htmlFor="email" style={{ display: 'block', marginBottom: 'var(--space-1)', fontWeight: 500 }}>
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                    />
                </div>

                <div>
                    <label htmlFor="password" style={{ display: 'block', marginBottom: 'var(--space-1)', fontWeight: 500 }}>
                        Password
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="Choose a secure password"
                            style={{ paddingRight: '42px', width: '100%' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            title={showPassword ? "Hide password" : "Show password"}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                padding: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                            }}
                        >
                            {showPassword ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {role === 'admin' && (
                    <div>
                        <label htmlFor="secretKey" style={{ display: 'block', marginBottom: 'var(--space-1)', fontWeight: 500, color: '#fca5a5' }}>
                            Admin Secret Key <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                id="secretKey"
                                type={showSecretKey ? "text" : "password"}
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                                required
                                placeholder="Enter admin registration secret"
                                style={{ borderColor: 'rgba(239, 68, 68, 0.5)', paddingRight: '42px', width: '100%' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowSecretKey(!showSecretKey)}
                                aria-label={showSecretKey ? "Hide secret key" : "Show secret key"}
                                title={showSecretKey ? "Hide secret key" : "Show secret key"}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    padding: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '4px',
                                }}
                            >
                                {showSecretKey ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                            Required for elevated administrative role.
                        </span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !!socialLoading}
                    className={role === 'admin' ? "btn btn-danger" : "btn btn-primary"}
                    style={{ 
                        width: '100%', 
                        padding: '12px', 
                        marginTop: 'var(--space-2)',
                        fontWeight: 600,
                        fontSize: '1rem'
                    }}
                >
                    {loading ? "Creating Account..." : role === 'admin' ? "Create Admin Account" : "Sign Up"}
                </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 'var(--space-5)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Already have an account?{" "}
                <Link 
                    href={role === 'admin' ? "/login?role=admin" : "/login"} 
                    style={{ color: role === 'admin' ? 'var(--danger)' : 'var(--primary)', fontWeight: 600 }}
                >
                    Sign In here
                </Link>
            </div>
        </div>
        </>
    );
}

export default function SignupPage() {
    return (
        <main style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 'var(--space-4)',
            background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #09090b 70%)'
        }}>
            <Suspense fallback={<div style={{ color: 'var(--text-secondary)' }}>Loading...</div>}>
                <SignupForm />
            </Suspense>
        </main>
    );
}