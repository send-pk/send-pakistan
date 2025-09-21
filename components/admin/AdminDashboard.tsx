import React, { useState, useMemo } from 'react';
import { User, UserRole, Parcel, ParcelStatus } from '../../types';
import { useData } from '../../context/DataContext';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { ParcelDetailsModal } from '../shared/ParcelDetailsModal';
import { ThemeToggle } from '../shared/ThemeToggle';
import { Logo } from '../shared/Logo';
import { SearchIcon } from '../icons/SearchIcon';
import { BuildingOfficeIcon } from '../icons/BuildingOfficeIcon';
import { DateFilter } from '../shared/DateFilter';
import { DashboardTab } from './tabs/DashboardTab';
import { WarehouseTab } from './tabs/WarehouseTab';
import { FinanceTab } from './tabs/FinanceTab';
import { BrandsTab } from './tabs/BrandsTab';
import { DriversTab } from './tabs/DriversTab';
import { SalesTab } from './tabs/SalesTab';
import { LogoutIcon } from '../icons/LogoutIcon';
import { PENDING_PARCEL_STATUSES } from '../../constants';
import { UsersIcon } from '../icons/UsersIcon';
import { AlertTriangleIcon } from '../icons/AlertTriangleIcon';
import { SparklesIcon } from '../icons/SparklesIcon'; // Import new icon
import { SmartInquiryModal } from './shared/SmartInquiryModal'; // Import new modal

// Helper to format date to YYYY-MM-DD for input fields
const toInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
    const { parcels: allParcels, users, invoices, loading, error } = useData();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'warehouse' | 'finance' | 'brands' | 'drivers' | 'sales'>(
        user.role === UserRole.WAREHOUSE_MANAGER ? 'warehouse' : 'dashboard'
    );
    
    const [dateFilter, setDateFilter] = useState('today');
    const [customStartDate, setCustomStartDate] = useState(toInputDate(new Date()));
    const [customEndDate, setCustomEndDate] = useState(toInputDate(new Date()));
    
    const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
    const [trackingInput, setTrackingInput] = useState('');
    const [foundParcel, setFoundParcel] = useState<Parcel | null>(null);
    const [trackingError, setTrackingError] = useState('');
    const [isSmartInquiryOpen, setIsSmartInquiryOpen] = useState(false); // State for new modal

    const parcels = useMemo(() => {
        if (dateFilter === 'all') {
            return allParcels;
        }

        if (dateFilter === 'today') {
            const today = new Date();
            const startOfToday = new Date(today.setHours(0, 0, 0, 0));
            const endOfToday = new Date(today.setHours(23, 59, 59, 999));

            return allParcels.filter(p => {
                const createdAt = new Date(p.createdAt);
                const isCreatedToday = createdAt >= startOfToday && createdAt <= endOfToday;

                // An active parcel is one that is operationally, financially, or exceptionally pending.
                const isOperationallyPending = PENDING_PARCEL_STATUSES.includes(p.status);
                const isFinanciallyPending = 
                    (p.status === ParcelStatus.DELIVERED && p.codAmount > 0 && !p.isCodReconciled) || // Unreconciled COD
                    ((p.status === ParcelStatus.DELIVERED || p.status === ParcelStatus.RETURNED) && !p.invoiceId) || // Uninvoiced
                    (!!p.invoiceId && invoices.find(inv => inv.id === p.invoiceId)?.status === 'PENDING'); // Unpaid invoice
                const isExceptionPending = [ParcelStatus.LOST, ParcelStatus.DAMAGED, ParcelStatus.FRAUDULENT].includes(p.status);
                
                const isActive = isOperationallyPending || isFinanciallyPending || isExceptionPending;
                
                // Show a parcel if it's active OR if it was created today.
                return isActive || isCreatedToday;
            });
        }

        // Custom date range logic
        if (!customStartDate || !customEndDate) return allParcels;
        const start = new Date(new Date(customStartDate).setHours(0, 0, 0, 0));
        const end = new Date(new Date(customEndDate).setHours(23, 59, 59, 999));
        return allParcels.filter(p => {
            const createdAt = new Date(p.createdAt);
            return createdAt >= start && createdAt <= end;
        });
    }, [allParcels, invoices, dateFilter, customStartDate, customEndDate]);

    const handleTrackParcel = (e: React.FormEvent) => {
        e.preventDefault();
        const p = allParcels.find(p => p.trackingNumber.toLowerCase() === trackingInput.toLowerCase());
        setFoundParcel(p || null);
        setTrackingError(p ? '' : 'No parcel found.');
    };

    const NavButton = ({ tabName, children }: {tabName: string, children: React.ReactNode}) => (
      <button 
        onClick={() => setActiveTab(tabName as any)} 
        className={`px-3 py-2 font-semibold rounded-md transition-colors duration-200 text-sm flex items-center gap-2 flex-shrink-0 ${activeTab === tabName ? 'bg-primary/10 text-primary' : 'text-content-secondary hover:bg-border'}`}
      >
        {children}
      </button>
    );
    
    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-lg text-content-secondary">Loading Dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-screen text-center p-4">
                <AlertTriangleIcon className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-content-primary mb-2">Error Loading Data</h2>
                <p className="text-content-secondary mb-4 max-w-md">{error}</p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="bg-surface px-4 md:px-6 py-2 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-2 z-10 border-b border-border sticky top-0">
                <div className="flex items-center gap-3">
                    <Logo textClassName="text-2xl" iconClassName="w-5 h-5" />
                    <span className="text-content-muted">/</span>
                    <span className="font-semibold text-content-primary">
                        {user.role === UserRole.ADMIN ? 'Admin Portal' : 'Warehouse Portal'}
                    </span>
                </div>
                <div className="flex items-center flex-wrap justify-center md:justify-end gap-2">
                    {user.role === UserRole.ADMIN && (
                        <Button variant="secondary" onClick={() => setIsSmartInquiryOpen(true)} className="flex items-center gap-2" aria-label="Smart Inquiry">
                            <SparklesIcon className="w-4 h-4 text-purple-500"/>
                            <span className="hidden sm:inline">Smart Inquiry</span>
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => setIsTrackingModalOpen(true)} className="flex items-center gap-2" aria-label="Track Parcel">
                         <SearchIcon className="w-4 h-4"/>
                         <span className="hidden sm:inline">Track</span>
                    </Button>
                    <span className="hidden md:inline text-sm text-content-secondary">Welcome, {user.name}</span>
                    <ThemeToggle />
                    <Button onClick={onLogout} variant="secondary" className="flex items-center gap-2" aria-label="Logout">
                        <LogoutIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </header>
            
            <main className="flex-1 p-4 overflow-y-auto bg-background">
                 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
                    {user.role === UserRole.ADMIN && (
                        <nav className="flex flex-nowrap gap-2 p-1 bg-surface rounded-lg border border-border overflow-x-auto w-full lg:w-auto">
                            <NavButton tabName="dashboard">Dashboard</NavButton>
                            <NavButton tabName="warehouse"><BuildingOfficeIcon className="w-4 h-4"/>Warehouse</NavButton>
                            <NavButton tabName="finance">Finance</NavButton>
                            <NavButton tabName="brands">Brands</NavButton>
                            <NavButton tabName="drivers">Drivers</NavButton>
                            <NavButton tabName="sales"><UsersIcon className="w-4 h-4"/>Sales</NavButton>
                        </nav>
                    )}
                     {(user.role === UserRole.ADMIN) && (
                        <div className="w-full lg:w-auto flex-shrink-0">
                            <DateFilter
                                dateFilter={dateFilter}
                                setDateFilter={setDateFilter}
                                customStartDate={customStartDate}
                                setCustomStartDate={setCustomStartDate}
                                customEndDate={customEndDate}
                                setCustomEndDate={setCustomEndDate}
                            />
                        </div>
                     )}
                </div>
                <div className="space-y-4">
                    {activeTab === 'dashboard' && user.role === UserRole.ADMIN && <DashboardTab parcels={parcels} allParcels={allParcels} users={users} user={user} />}
                    {activeTab === 'warehouse' && <WarehouseTab user={user} />}
                    {activeTab === 'finance' && user.role === UserRole.ADMIN && <FinanceTab parcelsForDateRange={parcels} allParcels={allParcels} users={users}/>}
                    {activeTab === 'brands' && user.role === UserRole.ADMIN && <BrandsTab />}
                    {activeTab === 'drivers' && user.role === UserRole.ADMIN && <DriversTab parcels={parcels} allParcels={allParcels} user={user} />}
                    {activeTab === 'sales' && user.role === UserRole.ADMIN && <SalesTab parcels={parcels} dateFilter={dateFilter} customStartDate={customStartDate} customEndDate={customEndDate} />}
                </div>
            </main>

            <Modal isOpen={isTrackingModalOpen} onClose={() => { setIsTrackingModalOpen(false); setTrackingInput(''); setFoundParcel(null); setTrackingError(''); }} title="Track a Parcel">
                <form onSubmit={handleTrackParcel}>
                    <div className="flex items-center gap-2">
                        <input type="text" placeholder="Enter Tracking Number" value={trackingInput} onChange={e => setTrackingInput(e.target.value)} autoFocus className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors`} />
                        <Button type="submit">Track</Button>
                    </div>
                </form>
                {trackingError && <p className="text-red-500 mt-4">{trackingError}</p>}
                {foundParcel && (<div className="mt-6"><ParcelDetailsModal isOpen={true} onClose={() => setFoundParcel(null)} parcel={foundParcel} user={user} /></div>)}
            </Modal>
            
            {user.role === UserRole.ADMIN && (
                <SmartInquiryModal 
                    isOpen={isSmartInquiryOpen} 
                    onClose={() => setIsSmartInquiryOpen(false)}
                    parcels={allParcels}
                    users={users}
                />
            )}
        </div>
    );
};
export default AdminDashboard;