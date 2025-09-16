import React, { useState } from 'react';
import { Card } from './shared/Card';
import { Button } from './shared/Button';
import { ThemeToggle } from './shared/ThemeToggle';
import { Logo } from './shared/Logo';
import { User, UserRole, Parcel } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { Modal } from './shared/Modal';
import { UserIcon } from './icons/UserIcon';
import { supabase } from '../supabase';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

interface LoginScreenProps {
  onLogin: (user: User, parcel?: Parcel) => void;
  authError?: string | null;
}

// Case conversion helpers moved here for direct DB query
const toCamel = (s: string): string => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
const isObject = (obj: any): boolean => obj === Object(obj) && !Array.isArray(obj) && typeof obj !== 'function';
const keysToCamel = (obj: any): any => {
  if (isObject(obj)) {
    const n: { [key: string]: any } = {};
    Object.keys(obj).forEach((k) => { n[toCamel(k)] = keysToCamel(obj[k]); });
    return n;
  } else if (Array.isArray(obj)) {
    return obj.map((i) => keysToCamel(i));
  }
  return obj;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, authError }) => {
    const [trackingNumber, setTrackingNumber] = useState('');
    const [error, setError] = useState('');
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [loginError, setLoginError] = useState('');


    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingNumber.trim()) return;

        setIsTracking(true);
        setError('');

        try {
            const { data, error: dbError } = await supabase
                .from('parcels')
                .select('*')
                .ilike('tracking_number', trackingNumber.trim())
                .single();

            if (dbError || !data) {
                throw new Error("Parcel not found");
            }
            
            const foundParcel = keysToCamel(data) as Parcel;
            const customerUser: User = { id: 'customer-temp', name: foundParcel.recipientName, email: 'customer@temp.com', role: UserRole.CUSTOMER, status: 'ACTIVE' };
            onLogin(customerUser, foundParcel);

        } catch (err) {
            setError('Tracking number not found. Please check and try again.');
        } finally {
            setIsTracking(false);
        }
    };
    
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setLoginError('');

        const identifier = loginIdentifier.trim();
        let emailToLogin = '';

        try {
            // If identifier is not an email, query for the username
            if (!identifier.includes('@')) {
                const { data: userByUsername, error: userError } = await supabase
                    .from('users')
                    .select('email')
                    .ilike('username', identifier) // Case-insensitive search
                    .single();

                if (userError || !userByUsername) {
                    // To prevent user enumeration, we use a generic error message and log the real one
                    console.error('Username lookup failed:', userError?.message);
                    throw new Error('Invalid credentials');
                }
                emailToLogin = userByUsername.email;
            } else {
                emailToLogin = identifier.toLowerCase();
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: emailToLogin,
                password,
            });

            if (signInError) {
                console.error('Sign-in failed:', signInError.message);
                throw new Error('Invalid credentials');
            }
            
            // On successful login, the onAuthStateChange listener in App.tsx will handle the rest.
            setIsLoginModalOpen(false);
        } catch (error: any) {
            // Use a generic error message for security.
            setLoginError('Invalid username/email or password.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-background text-content-primary flex flex-col">
            <header className="py-4 px-4 sm:px-6 md:px-12 flex justify-between items-center border-b border-border shadow-sm sticky top-0 bg-background/80 backdrop-blur-sm z-50">
                <Logo />
                <div className="flex items-center gap-4">
                    <Button onClick={() => setIsLoginModalOpen(true)} variant="secondary" className="flex items-center gap-2">
                        <UserIcon className="w-5 h-5"/>
                        Login
                    </Button>
                    <ThemeToggle />
                </div>
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
                             <p className="max-w-md mx-auto md:mx-0 text-lg text-content-secondary mb-8">
                                Just want to track a shipment? Enter your tracking number to see its current status.
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            <Card className="p-4 sm:p-6 text-left shadow-2xl border-border/50">
                                <form onSubmit={handleTrack}>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            id="tracking"
                                            type="text"
                                            value={trackingNumber}
                                            onChange={e => { setTrackingNumber(e.target.value); setError(''); }}
                                            placeholder="Enter tracking number (e.g., SD1001)"
                                            className="flex-grow w-full bg-surface border-2 border-border rounded-lg px-4 py-2.5 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                        />
                                        <Button type="submit" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2" disabled={isTracking}>
                                            <SearchIcon className="w-5 h-5" />
                                            {isTracking ? 'Tracking...' : 'Track'}
                                        </Button>
                                    </div>
                                    {error && <p className="text-red-500 mt-4 text-center text-sm">{error}</p>}
                                </form>
                            </Card>

                            {authError && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-800 dark:text-red-200" role="alert">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <AlertTriangleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-bold">Authentication Issue</h3>
                                            <div className="mt-2 text-sm">
                                                <p>{authError}</p>
                                            </div>
                                        </div>
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
            
            <Modal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} title="Portal Login" size="md">
                <form onSubmit={handleEmailLogin} className="space-y-4 p-1">
                    <div>
                        <label htmlFor="loginIdentifier" className="block text-sm font-medium text-content-secondary mb-2">Email or Username</label>
                        <input
                            id="loginIdentifier"
                            name="loginIdentifier"
                            type="text"
                            autoComplete="username"
                            required
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label htmlFor="password"  className="block text-sm font-medium text-content-secondary mb-2">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
                    <div>
                        <Button type="submit" className="w-full" size="lg" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LoginScreen;
