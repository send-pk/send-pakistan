
import React, { useState } from 'react';
import { Card } from './shared/Card';
import { Button } from './shared/Button';
import { ThemeToggle } from './shared/ThemeToggle';
import { Logo } from './shared/Logo';
import { supabase } from '../supabase';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

interface LoginScreenProps {
  authError: string | null;
  clearAuthError: () => void;
}

const AuthErrorDisplay: React.FC<{ message: string | null }> = ({ message }) => {
    if (!message) return null;
    return (
        <div className="p-4 rounded-md bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-start gap-3 mt-4">
            <AlertTriangleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
                <h3 className="font-semibold">Authentication Error</h3>
                <p className="text-sm">{message}</p>
            </div>
        </div>
    );
};

const LoginScreen: React.FC<LoginScreenProps> = ({ authError, clearAuthError }) => {
    const [isLoginView, setIsLoginView] = useState(true);

    // Common states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Signup specific states
    const [name, setName] = useState('');
    const [signupSuccess, setSignupSuccess] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        if (authError) clearAuthError();

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError(error.message);
        }
        // On success, the onAuthStateChange listener in App.tsx handles navigation.
        setLoading(false);
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSignupSuccess(false);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
        });

        if (error) {
            setError(error.message);
        } else if (data.user) {
            setSignupSuccess(true);
        }
        setLoading(false);
    };

    const clearFormState = () => {
        setEmail('');
        setPassword('');
        setName('');
        setError('');
        setSignupSuccess(false);
        if (authError) clearAuthError();
    };

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        clearFormState();
    };
    
    return (
        <div className="min-h-screen bg-background text-content-primary flex flex-col">
            <header className="py-4 px-4 sm:px-6 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-sm z-50">
                <Logo />
                <ThemeToggle />
            </header>

            <main className="flex-1 flex flex-col items-center justify-center main-bg p-4">
                <div className="w-full max-w-md">
                    <Card className="p-6 sm:p-8 shadow-2xl border-border/50">
                        {signupSuccess ? (
                            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Account Created!</h3>
                                <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                                    Please check your email at <strong>{email}</strong> to verify your account.
                                </p>
                                <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                                   Once verified, please contact an administrator to complete your profile setup.
                                </p>
                                <Button onClick={toggleView} className="mt-4">
                                    Back to Login
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-bold text-content-primary">
                                        {isLoginView ? 'Welcome Back' : 'Create an Account'}
                                    </h2>
                                    <p className="text-sm text-content-secondary mt-1">
                                        {isLoginView ? 'Sign in to access your dashboard.' : 'Enter your details to get started.'}
                                    </p>
                                </div>

                                <form onSubmit={isLoginView ? handleLogin : handleSignUp} className="space-y-4">
                                    {!isLoginView && (
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-content-secondary mb-2">Full Name</label>
                                            <input id="name" type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required autoFocus className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary" />
                                        </div>
                                    )}
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-content-secondary mb-2">Email</label>
                                        <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus={isLoginView} className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary" />
                                    </div>
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-content-secondary mb-2">Password</label>
                                        <input id="password" type="password" autoComplete={isLoginView ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary" />
                                    </div>

                                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                                    
                                    <div className="pt-2">
                                        <Button type="submit" size="lg" className="w-full" disabled={loading}>
                                            {loading ? (isLoginView ? 'Logging in...' : 'Creating Account...') : (isLoginView ? 'Login' : 'Create Account')}
                                        </Button>
                                    </div>
                                </form>
                                
                                <div className="text-center mt-4 text-sm">
                                    <span className="text-content-secondary">
                                        {isLoginView ? "Don't have an account?" : "Already have an account?"}
                                    </span>
                                    <button onClick={toggleView} className="font-semibold text-primary hover:underline ml-1 focus:outline-none">
                                        {isLoginView ? "Sign up" : "Login"}
                                    </button>
                                </div>
                            </>
                        )}
                    </Card>

                    <AuthErrorDisplay message={authError} />

                </div>
            </main>

             <footer className="text-center py-6 px-4 sm:px-6 bg-surface border-t border-border">
                <p className="text-sm text-content-muted">
                    © 2025 SEND. All Rights Reserved.
                </p>
            </footer>
        </div>
    );
};

export default LoginScreen;
