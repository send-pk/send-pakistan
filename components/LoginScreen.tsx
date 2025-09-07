import React, { useState } from 'react';
import { Card } from './shared/Card';
import { Button } from './shared/Button';
import { ThemeToggle } from './shared/ThemeToggle';
import { Logo } from './shared/Logo';
import { useData } from '../context/DataContext';
import { User, UserRole, Parcel } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { Modal } from './shared/Modal';
import { UserIcon } from './icons/UserIcon';

interface LoginScreenProps {
  onLogin: (user: User, parcel?: Parcel) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const { parcels, users } = useData();
    const [trackingNumber, setTrackingNumber] = useState('');
    const [error, setError] = useState('');
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const handleTrack = (e: React.FormEvent) => {
        e.preventDefault();
        const foundParcel = parcels.find(p => p.trackingNumber.toLowerCase() === trackingNumber.toLowerCase().trim());
        if (foundParcel) {
            // FIX: Added missing 'status' property to conform to User type.
            const customerUser: User = { id: 'customer-temp', name: foundParcel.recipientName, email: 'customer@temp.com', role: UserRole.CUSTOMER, status: 'ACTIVE' };
            onLogin(customerUser, foundParcel);
        } else {
            setError('Tracking number not found. Please check and try again.');
        }
    };
    
    const admins = users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.WAREHOUSE_MANAGER);
    const brands = users.filter(u => u.role === UserRole.BRAND);
    const drivers = users.filter(u => u.role === UserRole.DRIVER);

    return (
        <div className="min-h-screen bg-background text-content-primary">
            <header className="py-4 px-4 sm:px-6 md:px-12 flex justify-between items-center border-b border-border">
                <Logo />
                <div className="flex items-center gap-4">
                    <Button onClick={() => setIsLoginModalOpen(true)} variant="secondary" className="flex items-center gap-2">
                        <UserIcon className="w-5 h-5"/>
                        Login
                    </Button>
                    <ThemeToggle />
                </div>
            </header>

            <main className="py-12 px-4 sm:px-6">
                <section className="text-center py-16 px-4 sm:px-6">
                     <h1 className="text-4xl md:text-5xl font-bold mb-4 text-content-primary">
                        Lahore's Fastest Courier Service
                     </h1>
                     <p className="max-w-2xl mx-auto text-lg text-content-secondary mb-8">
                        Just want to track a shipment? Enter your tracking number below.
                    </p>
                    <Card className="max-w-2xl mx-auto p-6 text-left shadow-lg">
                        <form onSubmit={handleTrack}>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    id="tracking"
                                    type="text"
                                    value={trackingNumber}
                                    onChange={e => { setTrackingNumber(e.target.value); setError(''); }}
                                    placeholder="Enter your tracking number (e.g., SD1001)"
                                    className="flex-grow w-full bg-surface border-2 border-border rounded-lg px-4 py-3 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                />
                                <Button type="submit" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2">
                                    <SearchIcon className="w-5 h-5" />
                                    Track
                                </Button>
                            </div>
                            {error && <p className="text-red-500 mt-4 text-center text-sm">{error}</p>}
                        </form>
                    </Card>
                </section>
            </main>

            <footer className="text-center py-12 px-4 sm:px-6 bg-surface">
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
            
            <Modal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} title="Select a Portal to Login" size="lg">
                <div className="space-y-6 p-2">
                    <div>
                        <h3 className="font-bold text-lg mb-2 text-content-primary">Admin / Warehouse</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {admins.map(user => (
                                <Button key={user.id} variant="secondary" size="lg" className="w-full justify-start" onClick={() => onLogin(user)}>
                                    {user.name} <span className="text-xs text-content-muted ml-1">({user.role === UserRole.ADMIN ? 'Admin' : 'Warehouse'})</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-2 text-content-primary">Brands</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {brands.map(user => (
                                <Button key={user.id} variant="secondary" size="lg" className="w-full justify-start" onClick={() => onLogin(user)}>
                                    {user.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-2 text-content-primary">Drivers</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {drivers.map(user => (
                                <Button key={user.id} variant="secondary" size="lg" className="w-full justify-start" onClick={() => onLogin(user)}>
                                    {user.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default LoginScreen;