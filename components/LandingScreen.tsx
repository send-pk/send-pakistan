import React, { useState } from 'react';
import { Card } from './shared/Card';
import { Button } from './shared/Button';
import { ThemeToggle } from './shared/ThemeToggle';
import { Logo } from './shared/Logo';
import { User, UserRole, Parcel } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { supabase } from '../supabase';
import { TruckIcon } from './icons/TruckIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { UserIcon } from './icons/UserIcon';

interface LandingScreenProps {
  onCustomerLogin: (user: User, parcel: Parcel) => void;
  onSelectRole: (role: UserRole) => void;
}

// Case conversion helpers
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

const LandingScreen: React.FC<LandingScreenProps> = ({ onCustomerLogin, onSelectRole }) => {
    const [trackingNumber, setTrackingNumber] = useState('');
    const [error, setError] = useState('');
    const [isTracking, setIsTracking] = useState(false);

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingNumber.trim()) return;
        setIsTracking(true);
        setError('');
        try {
            const { data, error: dbError } = await supabase.from('parcels').select('*').ilike('tracking_number', trackingNumber.trim()).single();
            if (dbError || !data) throw new Error("Parcel not found");
            const foundParcel = keysToCamel(data) as Parcel;
            const customerUser: User = { id: 'customer-temp', name: foundParcel.recipientName, email: 'customer@temp.com', role: UserRole.CUSTOMER, status: 'ACTIVE' };
            onCustomerLogin(customerUser, foundParcel);
        } catch (err) {
            setError('Tracking number not found. Please check and try again.');
        } finally {
            setIsTracking(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-background text-content-primary flex flex-col">
            <header className="py-4 px-4 sm:px-6 md:px-12 flex justify-between items-center border-b border-border shadow-sm sticky top-0 bg-background/80 backdrop-blur-sm z-50">
                <Logo />
                <ThemeToggle />
            </header>

            <main className="flex-1 flex flex-col justify-center main-bg">
                <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 text-content-primary leading-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-400">
                            Lahore's Own
                        </span>
                        <br />
                        Courier Service
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg text-content-secondary mb-12">
                        The unified portal for customers, brands, and our internal team. Access your dashboard or track a shipment below.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
                        {/* Team Member Portal */}
                        <Card className="p-6 flex flex-col justify-center shadow-lg">
                            <h2 className="text-2xl font-bold mb-4 text-content-primary text-center">Team Portals</h2>
                             <div className="space-y-4">
                                <Button onClick={() => onSelectRole(UserRole.ADMIN)} size="lg" className="w-full flex items-center justify-center gap-2">
                                    <BuildingOfficeIcon className="w-5 h-5" />
                                    Admin Dashboard
                                </Button>
                                <Button onClick={() => onSelectRole(UserRole.BRAND)} size="lg" className="w-full flex items-center justify-center gap-2">
                                     <UserIcon className="w-5 h-5" />
                                    Brand Portal
                                </Button>
                                 <Button onClick={() => onSelectRole(UserRole.DRIVER)} size="lg" className="w-full flex items-center justify-center gap-2">
                                    <TruckIcon className="w-5 h-5" />
                                    Driver App
                                </Button>
                                 <Button onClick={() => onSelectRole(UserRole.SALES_MANAGER)} size="lg" className="w-full flex items-center justify-center gap-2">
                                    <UsersIcon className="w-5 h-5" />
                                    Team Portal
                                </Button>
                            </div>
                        </Card>

                        {/* Customer Tracking Portal */}
                        <Card className="p-6 flex flex-col justify-center shadow-lg">
                             <h2 className="text-2xl font-bold mb-4 text-content-primary text-center">Track Your Shipment</h2>
                            <form onSubmit={handleTrack}>
                                <div className="flex flex-col gap-2">
                                    <input
                                        id="tracking"
                                        type="text"
                                        value={trackingNumber}
                                        onChange={e => { setTrackingNumber(e.target.value); setError(''); }}
                                        placeholder="Enter tracking number (e.g., SD1001)"
                                        className="flex-grow w-full bg-surface border-2 border-border rounded-lg px-4 py-2.5 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-base"
                                    />
                                    <Button type="submit" size="lg" className="w-full flex items-center justify-center gap-2" disabled={isTracking}>
                                        <SearchIcon className="w-5 h-5" />
                                        {isTracking ? 'Tracking...' : 'Track'}
                                    </Button>
                                </div>
                                {error && <p className="text-red-500 mt-4 text-center text-sm">{error}</p>}
                            </form>
                        </Card>
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

export default LandingScreen;
