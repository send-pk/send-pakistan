import React, { useState } from 'react';
import { Card } from './shared/Card';
import { Button } from './shared/Button';
import { ThemeToggle } from './shared/ThemeToggle';
import { Logo } from './shared/Logo';
import { User, UserRole, Parcel } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { UserIcon } from './icons/UserIcon';
import { supabase } from '../supabase';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { Modal } from './shared/Modal';

interface LoginScreenProps {
  onCustomerLogin: (user: User, parcel: Parcel) => void;
  authError: string | null;
  clearAuthError: () => void;
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

const LoginScreen: React.FC<LoginScreenProps> = ({ onCustomerLogin, authError, clearAuthError }) => {
    const [trackingNumber, setTrackingNumber] = useState('');
    const [trackingError, setTrackingError] = useState('');
    const [isTracking, setIsTracking] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingNumber.trim()) return;

        setIsTracking(true);
        setTrackingError('');

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
            onCustomerLogin(customerUser, foundParcel);

        } catch (err) {
            setTrackingError('Tracking number not found. Please check and try again.');
        } finally {
            setIsTracking(false);
        }
    };
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setLoginError('');
        if (authError) clearAuthError();

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                setLoginError(error.message);
            } else {
                // Success, onAuthStateChange will handle the rest.
                setIsModalOpen(false);
            }
        } catch (err: any) {
            console.error("Login exception:", err);
            setLoginError(err.message || "An unexpected error occurred. Please try again.");
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
        setEmail('');
        setPassword('');
        setLoginError('');
    };
    
    return (
        <div className="min-h-screen bg-background text-content-primary flex flex-col">
            <header className="py-4 px-4 sm:px-6 md:px-12 flex justify-between items-center border-b border-border shadow-sm sticky top-0 bg-background/80 backdrop-blur-sm z-50">
                <Logo />
                <div className="flex items-center gap-4">
                    <Button onClick={handleOpenModal} variant="secondary" className="flex items-center gap-2">
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
                             <p className="max-w-md mx-auto md:mx-0 text-lg text-content-secondary mb-4">
                                Just want to track a shipment? Enter your tracking number to see its current status.
                            </p>
                             <p className="max-w-md mx-auto md:mx-0 text-md text-content-secondary">
                                Are you a registered Brand, Driver, or Team Member? Use the <strong>Login</strong> button to access your portal.
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
                                            onChange={e => { setTrackingNumber(e.target.value); setTrackingError(''); }}
                                            placeholder="Enter tracking number (e.g., SD1001)"
                                            className="flex-grow w-full bg-surface border-2 border-border rounded-lg px-4 py-2.5 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                        />
                                        <Button type="submit" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2" disabled={isTracking}>
                                            <SearchIcon className="w-5 h-5" />
                                            {isTracking ? 'Tracking...' : 'Track'}
                                        </Button>
                                    </div>
                                    {trackingError && <p className="text-red-500 mt-4 text-center text-sm">{trackingError}</p>}
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Login">
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-content-secondary mb-2">Email or Username</label>
                        <input id="email" type="text" value={email} onChange={e => setEmail(e.target.value)} required autoFocus className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary"/>
                    </div>
                     <div>
                        <label htmlFor="password" className="block text-sm font-medium text-content-secondary mb-2">Password</label>
                        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary"/>
                    </div>
                    {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoggingIn}>
                            {isLoggingIn ? 'Logging in...' : 'Login'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LoginScreen;