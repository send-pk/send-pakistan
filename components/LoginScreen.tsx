import React, { useState } from 'react';
import { Card } from './shared/Card';
import { Button } from './shared/Button';
import { ThemeToggle } from './shared/ThemeToggle';
import { Logo } from './shared/Logo';
import { supabase } from '../supabase';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { UserRole } from '../types';
import { UsersIcon } from './icons/UsersIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { TruckIcon } from './icons/TruckIcon';

interface LoginScreenProps {
  authError: string | null;
  clearAuthError: () => void;
}

type Portal = 'admin' | 'brand' | 'driver';

const portalConfig = {
    admin: {
        title: 'Admin & Team Login',
        subtitle: 'Access for administrators and internal teams.',
        icon: UsersIcon,
        validRoles: [UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.SALES_MANAGER, UserRole.DIRECT_SALES],
    },
    brand: {
        title: 'Brand / Client Login',
        subtitle: 'Portal for our valued business partners.',
        icon: BuildingOfficeIcon,
        validRoles: [UserRole.BRAND],
    },
    driver: {
        title: 'Driver Login',
        subtitle: 'Access for our delivery riders.',
        icon: TruckIcon,
        validRoles: [UserRole.DRIVER],
    },
};


const LoginScreen: React.FC<LoginScreenProps> = ({ authError, clearAuthError }) => {
    const [activePortal, setActivePortal] = useState<Portal>('admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setLoginError('');
        if (authError) clearAuthError();

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setLoginError(error.message);
            setIsLoggingIn(false);
            return;
        }

        if (data.user) {
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('role')
                .eq('id', data.user.id)
                .single();
            
            if (profileError || !profile) {
                await supabase.auth.signOut();
                setLoginError("Login failed: Could not retrieve your user profile.");
                setIsLoggingIn(false);
                return;
            }

            const userRole = (profile.role as string).toUpperCase();
            const validRolesForPortal = portalConfig[activePortal].validRoles;

            if (!validRolesForPortal.includes(userRole as UserRole)) {
                await supabase.auth.signOut();
                setLoginError("Access denied. Please use the correct login portal for your account type.");
                setIsLoggingIn(false);
                return;
            }
        }
        // Success is handled by onAuthStateChange in App.tsx
        // isLoggingIn state will be cleared on component unmount
    };

    const TabButton: React.FC<{ portal: Portal, children: React.ReactNode }> = ({ portal, children }) => {
        const isActive = activePortal === portal;
        const Icon = portalConfig[portal].icon;
        return (
            <button
                type="button"
                onClick={() => { setActivePortal(portal); setLoginError(''); setEmail(''); setPassword(''); }}
                className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${
                    isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-content-secondary hover:text-content-primary'
                }`}
                aria-current={isActive ? 'page' : undefined}
            >
                <Icon className="w-5 h-5" />
                {children}
            </button>
        );
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
                            <Card className="p-0 text-left shadow-2xl border-border/50 overflow-hidden">
                                <div className="flex border-b border-border">
                                    <TabButton portal="admin">Admin & Team</TabButton>
                                    <TabButton portal="brand">Brand</TabButton>
                                    <TabButton portal="driver">Driver</TabButton>
                                </div>
                                <div className="p-4 sm:p-6">
                                    <div className="text-center mb-4">
                                        <h2 className="text-xl font-bold text-content-primary">{portalConfig[activePortal].title}</h2>
                                        <p className="text-sm text-content-secondary">{portalConfig[activePortal].subtitle}</p>
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
                                </div>
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