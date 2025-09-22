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

const LoginScreen: React.FC<LoginScreenProps> = ({ authError, clearAuthError }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setLoginError('');
        if (authError) clearAuthError();

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setLoginError(error.message);
            setIsLoggingIn(false);
            return;
        }

        // On successful login, the onAuthStateChange listener in App.tsx will handle
        // fetching user data and navigating to the correct dashboard.
    };
    
    return (
        <div className="min-h-screen bg-background text-content-primary flex flex-col">
            <header className="py-4 px-4 sm:px-6 md:px-12 flex justify-between items-center border-b border-border shadow-sm sticky top-0 bg-background/80 backdrop-blur-sm z-50">
                <Logo />
                <ThemeToggle />
            </header>

            <main className="flex-1 flex flex-col justify-center main-bg">
                <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="text-center md:text-left">
                             <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 text-content-primary leading-tight">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-400">
                                    Lahore's Own
                                </span>
                                <br />
                                Courier Service
                             </h1>
                             <p className="max-w-md mx-auto md:mx-0 text-lg text-content-secondary">
                                The all-in-one portal for Brands, Drivers, and Team Members. Log in to access your dashboard.
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            <Card className="p-4 sm:p-6 text-left shadow-2xl border-border/50">
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-bold text-content-primary">Sign in to your account</h2>
                                    <p className="text-sm text-content-secondary mt-1">Enter your credentials to access your dashboard.</p>
                                </div>
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-content-secondary mb-2">Email</label>
                                        <input 
                                            id="email" 
                                            type="email" 
                                            autoComplete="email"
                                            value={email} 
                                            onChange={e => { setEmail(e.target.value); setLoginError(''); }} 
                                            required 
                                            autoFocus 
                                            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                     <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-content-secondary mb-2">Password</label>
                                        <input 
                                            id="password" 
                                            type="password" 
                                            autoComplete="current-password"
                                            value={password} 
                                            onChange={e => { setPassword(e.target.value); setLoginError(''); }} 
                                            required 
                                            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
                                    <div className="pt-2">
                                        <Button type="submit" size="lg" className="w-full" disabled={isLoggingIn}>
                                            {isLoggingIn ? 'Logging in...' : 'Login'}
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                            {authError && (
                                <div className="p-4 rounded-md bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-start gap-3">
                                    <AlertTriangleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold">Authentication Error</h3>
                                        <p className="text-sm">{authError}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <footer className="text-center py-8 px-4 sm:px-6 bg-surface border-t border-border">
                <div className="mb-4">
                    <p className="font-semibold text-content-primary">Open a Business Account with SEND</p>
                    <p className="text-content-secondary mt-1">
                        WhatsApp <a href="https://wa.me/923055600056" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">0305 5600056</a> or email us at <a href="mailto:hello@send.com.pk" className="font-medium text-primary hover:underline">hello@send.com.pk</a>.
                    </p>
                </div>
                <p className="text-sm text-content-muted">
                    © 2025 SEND. Powered By stor.
                </p>
            </footer>
        </div>
    );
};

export default LoginScreen;
