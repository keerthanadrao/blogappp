"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'reader';

    const [role, setRole] = useState(initialRole);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [secretKey, setSecretKey] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showSecretKey, setShowSecretKey] = useState(false);

    useEffect(() => {
        if (searchParams.get('role') === 'admin') {
            setRole('admin');
        }
    }, [searchParams]);

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
                return;
            }

            router.push(role === 'admin' ? "/login?role=admin" : "/login");
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="card" style={{ 
            width: '100%', 
            maxWidth: '460px', 
            padding: 'var(--space-6)',
            border: role === 'admin' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
            boxShadow: role === 'admin' ? '0 8px 32px rgba(239, 68, 68, 0.15)' : '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
                <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    ← Back to Blog
                </Link>
                <h1 style={{ 
                    fontSize: '2.2rem', 
                    marginTop: 'var(--space-2)',
                    background: role === 'admin' 
                        ? 'linear-gradient(to right, #ef4444, #f97316)' 
                        : 'linear-gradient(to right, var(--primary), #a855f7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>
                    {role === 'admin' ? 'Admin Registration' : 'Create Account'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: 'var(--space-1)' }}>
                    {role === 'admin' 
                        ? 'Register an administrator account with security key (Single Admin System)' 
                        : 'Join the community to write and engage with posts'}
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
                <div style={{
                    padding: 'var(--space-3)',
                    marginBottom: 'var(--space-4)',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid var(--danger)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fca5a5',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                }}>
                    {error}
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
                    disabled={loading}
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