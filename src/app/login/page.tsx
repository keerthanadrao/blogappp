"use client";

import { signIn, getSession } from "next-auth/react";
import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthSuccessModal from "@/components/AuthSuccessModal";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'reader';

    const [loginRole, setLoginRole] = useState<'reader' | 'admin'>(initialRole);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [destination, setDestination] = useState<string>("/");

    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (searchParams.get('role') === 'admin') {
            setLoginRole('admin');
        }
    }, [searchParams]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setLoading(true);

        const result = await signIn("credentials", {
            email: email.trim(),
            password,
            redirect: false,
        });

        if (result?.error) {
            setLoading(false);
            setError("Invalid email or password.");
            return;
        }

        // Fetch user session to determine role-based redirection
        const session: any = await getSession();
        setLoading(false);

        if (loginRole === 'admin' && session?.user?.role !== 'ADMIN') {
            setError("Access denied. This account does not have Administrator privileges. Please sign in as Author / Reader.");
            return;
        }

        const targetPath = session?.user?.role === 'ADMIN' ? "/admin" : "/";
        setDestination(targetPath);
        setShowSuccessModal(true);

        setTimeout(() => {
            window.location.href = targetPath;
        }, 800);
    }

    return (
        <>
            <AuthSuccessModal
                isOpen={showSuccessModal}
                title="Successfully Logged In!"
                message={destination === "/admin" 
                    ? "Welcome to Admin Dashboard! Loading your administrative controls..." 
                    : "Welcome back to Antigravity Blog! Redirecting to Home Feed..."}
                redirectingTo={destination === "/admin" ? "Admin Portal" : "Home"}
            />
            <div className="card" style={{ 
                width: '100%', 
                maxWidth: '440px', 
                padding: 'clamp(var(--space-4), 5vw, var(--space-6))',
                border: loginRole === 'admin' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                boxShadow: loginRole === 'admin' ? '0 8px 32px rgba(239, 68, 68, 0.15)' : '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
                <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    ← Back to Blog
                </Link>
                <h1 style={{ 
                    fontSize: 'clamp(1.6rem, 4.5vw, 2.2rem)', 
                    marginTop: 'var(--space-2)',
                    background: loginRole === 'admin' 
                        ? 'linear-gradient(to right, #ef4444, #f97316)' 
                        : 'linear-gradient(to right, var(--primary), #a855f7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.2
                }}>
                    {loginRole === 'admin' ? 'Admin Portal Login' : 'Welcome Back'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', marginTop: 'var(--space-1)' }}>
                    {loginRole === 'admin' 
                        ? 'Sign in with your administrative credentials' 
                        : 'Sign in to write, comment, and manage posts'}
                </p>
            </div>

            {/* Role Switcher Tabs */}
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
                    onClick={() => { setLoginRole('reader'); setError(''); }}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: loginRole === 'reader' ? 'var(--primary)' : 'transparent',
                        color: loginRole === 'reader' ? '#ffffff' : 'var(--text-secondary)',
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
                    onClick={() => { setLoginRole('admin'); setError(''); }}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: loginRole === 'admin' ? 'var(--danger)' : 'transparent',
                        color: loginRole === 'admin' ? '#ffffff' : 'var(--text-secondary)',
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

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
                        placeholder={loginRole === 'admin' ? "admin@example.com" : "you@example.com"}
                    />
                </div>

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                        <label htmlFor="password" style={{ fontWeight: 500 }}>
                            Password
                        </label>
                        <Link
                            href={loginRole === 'admin' ? "/forgot-password?role=admin" : "/forgot-password"}
                            style={{
                                fontSize: '0.85rem',
                                color: loginRole === 'admin' ? 'var(--danger)' : 'var(--primary)',
                                textDecoration: 'none',
                                fontWeight: 500,
                            }}
                        >
                            Forgot Password?
                        </Link>
                    </div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
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

                <button
                    type="submit"
                    disabled={loading}
                    className={loginRole === 'admin' ? "btn btn-danger" : "btn btn-primary"}
                    style={{ 
                        width: '100%', 
                        padding: '12px', 
                        marginTop: 'var(--space-2)',
                        fontWeight: 600,
                        fontSize: '1rem'
                    }}
                >
                    {loading ? "Signing in..." : loginRole === 'admin' ? "Enter Admin Dashboard" : "Sign In"}
                </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 'var(--space-5)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Don't have an account?{" "}
                <Link 
                    href={loginRole === 'admin' ? "/signup?role=admin" : "/signup"} 
                    style={{ color: loginRole === 'admin' ? 'var(--danger)' : 'var(--primary)', fontWeight: 600 }}
                >
                    {loginRole === 'admin' ? "Register as Admin" : "Sign Up here"}
                </Link>
            </div>
        </div>
        </>
    );
}

export default function LoginPage() {
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
                <LoginForm />
            </Suspense>
        </main>
    );
}