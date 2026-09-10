"use client";

import { signIn, getSession } from "next-auth/react";
import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthSuccessModal from "@/components/AuthSuccessModal";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleParam = searchParams.get('role');
    const [selectedRole, setSelectedRole] = useState<'reader' | 'admin' | null>(null);
    const loginRole = selectedRole !== null ? selectedRole : (roleParam === 'admin' ? 'admin' : 'reader');
    const setLoginRole = (newRole: 'reader' | 'admin') => setSelectedRole(newRole);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [destination, setDestination] = useState<string>("/");

    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setLoading(true);

        const form = event.currentTarget;
        const formEmail = ((form?.elements?.namedItem("email") as HTMLInputElement)?.value || email || "").trim();
        const formPassword = (form?.elements?.namedItem("password") as HTMLInputElement)?.value || password;

        const result = await signIn("credentials", {
            email: formEmail,
            password: formPassword,
            redirect: false,
        });

        if (result?.error) {
            setLoading(false);
            setError("Invalid email or password.");
            return;
        }

        const session = await getSession();
        const isAdmin = (session?.user as any)?.role === 'ADMIN' || loginRole === 'admin' || searchParams.get('role') === 'admin';
        const targetPath = isAdmin ? "/admin" : "/";

        setLoading(false);
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
                <div 
                    id="login-error-banner"
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
                    }}>
                    {error}
                </div>
            )}

            {/* Social Authentication for Reader / Author */}
            {loginRole === 'reader' && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <button
                        id="login-google-btn"
                        type="button"
                        disabled={loading}
                        onClick={async () => {
                            setError("");
                            try {
                                await signIn('google', { callbackUrl: '/' });
                            } catch {
                                setError("Failed to redirect to Google. Please try again.");
                            }
                        }}
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
                            minHeight: '44px',
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
                        <span>Continue with Google</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--space-4) 0 var(--space-2) 0', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                        <span style={{ padding: '0 12px' }}>or sign in with email</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div>
                    <label htmlFor="email" style={{ display: 'block', marginBottom: 'var(--space-1)', fontWeight: 500 }}>
                        Email Address
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
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
                            name="password"
                            type={showPassword ? "text" : "password"}
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