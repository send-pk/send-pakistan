import React, { useState, useMemo, useEffect } from 'react';
import { User, Parcel, ParcelStatus, Invoice } from '../../types';
import { useData } from '../../context/DataContext';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { AirwayBill } from './AirwayBill';
import { ExchangeAirwayBill } from './ExchangeAirwayBill';
import { SearchIcon } from '../icons/SearchIcon';
import { ParcelDetailsModal } from '../shared/ParcelDetailsModal';
import { ThemeToggle } from '../shared/ThemeToggle';
import { Logo } from '../shared/Logo';
import { DateFilter } from '../shared/DateFilter';
import { DashboardView } from './tabs/DashboardView';
import { BookParcelView } from './tabs/BookParcelView';
import { FinancesView } from './tabs/FinancesView';
import { LogoutIcon } from '../icons/LogoutIcon';
import { PENDING_PARCEL_STATUSES } from '../../constants';
import { AlertTriangleIcon } from '../icons/AlertTriangleIcon';


interface BrandDashboardProps {
  user: User;
  onLogout: () => void;
}

// Helper to format date to YYYY-MM-DD for input fields
const toInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const BrandDashboard: React.FC<BrandDashboardProps> = ({ user, onLogout }) => {
    const { parcels: allParcels, invoices, loading, error } = useData();
    const [view, setView] = useState<'dashboard' | 'book' | 'finances'>('dashboard');
    
    const [isAwbModalOpen, setIsAwbModalOpen] = useState(false);
    const [parcelsForAwb, setParcelsForAwb] = useState<Parcel[]>([]);
    
    const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
    const [trackingInput, setTrackingInput] = useState('');
    const [foundParcel, setFoundParcel] = useState<Parcel | null>(null);
    const [trackingError, setTrackingError] = useState('');
    const [viewingParcel, setViewingParcel] = useState<Parcel | null>(null);

    const [dateFilter, setDateFilter] = useState('today');
    const [customStartDate, setCustomStartDate] = useState(toInputDate(new Date()));
    const [customEndDate, setCustomEndDate] = useState(toInputDate(new Date()));

    const brandParcels = useMemo(() => allParcels.filter(p => p.brandId === user.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [allParcels, user.id]);

    const parcelsInDateRange = useMemo(() => {
        if (dateFilter === 'all') {
            return brandParcels;
        }

        if (dateFilter === 'today') {
            const today = new Date();
            const startOfToday = new Date(today.setHours(0, 0, 0, 0));
            const endOfToday = new Date(today.setHours(23, 59, 59, 999));

            return brandParcels.filter(p => {
                const createdAt = new Date(p.createdAt);
                const isCreatedToday = createdAt >= startOfToday && createdAt <= endOfToday;
                
                // An active parcel is one that is operationally, financially, or has an exception.
                const isOperationallyPending = PENDING_PARCEL_STATUSES.includes(p.status);
                const isFinanciallyPending = 
                    ((p.status === ParcelStatus.DELIVERED || p.status === ParcelStatus.RETURNED) && !p.invoiceId) || // Uninvoiced
                    (!!p.invoiceId && invoices.find(inv => inv.id === p.invoiceId)?.status === 'PENDING'); // Unpaid invoice
                const isExceptionPending = [ParcelStatus.LOST, ParcelStatus.DAMAGED, ParcelStatus.FRAUDULENT].includes(p.status);

                const isActive = isOperationallyPending || isFinanciallyPending || isExceptionPending;
                
                // Show a parcel if it's active OR if it was created today.
                return isActive || isCreatedToday;
            });
        }

        // Custom date range logic
        const start = new Date(new Date(customStartDate).setHours(0, 0, 0, 0));
        const end = new Date(new Date(customEndDate).setHours(23, 59, 59, 999));
        return brandParcels.filter(p => {
            const createdAt = new Date(p.createdAt);
            return createdAt >= start && createdAt <= end;
        });
    }, [brandParcels, invoices, dateFilter, customStartDate, customEndDate]);
    
    const handleTrackParcel = (e: React.FormEvent) => { e.preventDefault(); const parcel = allParcels.find(p => p.trackingNumber.toLowerCase() === trackingInput.toLowerCase()); setFoundParcel(parcel || null); setTrackingError(parcel ? '' : 'No parcel found.'); };
    const handlePrint = () => window.print();

    const NavButton = ({ tabName, children }: { tabName: 'dashboard' | 'book' | 'finances', children: React.ReactNode }) => (
        <button onClick={() => setView(tabName)} className={`px-3 py-2 font-semibold rounded-md transition-colors duration-200 text-sm flex-shrink-0 ${view === tabName ? 'bg-primary text-white' : 'text-content-secondary hover:bg-border'}`}>
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
                 <div className="flex items-center gap-3"> <Logo textClassName="text-2xl" iconClassName="w-5 h-5" /> <span className="text-content-muted">/</span> <span className="font-semibold text-content-primary">Brand Portal</span> </div>
                 <div className="flex items-center flex-wrap justify-center md:justify-end gap-2">
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
                    <nav className="flex flex-nowrap gap-2 p-1 bg-surface rounded-lg border border-border overflow-x-auto w-full lg:w-auto">
                        {/* Fix: Added children to all NavButton components to satisfy required prop. */}
                        <NavButton tabName="dashboard">Dashboard</NavButton>
                        <NavButton tabName="book">Book a Parcel</NavButton>
                        <NavButton tabName="finances">Finances</NavButton>
                    </nav>
                     {view !== 'book' && (
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
                {view === 'dashboard' && (
                    <DashboardView
                        user={user}
                        parcelsInDateRange={parcelsInDateRange}
                        setViewingParcel={setViewingParcel}
                        setParcelsForAwb={setParcelsForAwb}
                        setIsAwbModalOpen={setIsAwbModalOpen}
                    />
                )}
                {view === 'book' && (
                   <BookParcelView user={user} onBookingSuccess={() => setView('dashboard')} />
                )}
                {view === 'finances' && (
                    <FinancesView
                        user={user}
                        parcelsInDateRange={parcelsInDateRange}
                    />
                )}
            </main>

            <Modal isOpen={isAwbModalOpen} onClose={() => setIsAwbModalOpen(false)} title="Print Airway Bills" size="4xl">
                <div className="printable-area">
                    {parcelsForAwb.length > 0 && (
                        <div className="joint-awb-container">
                            {(() => {
                                const printedExchangePairs = new Set<string>();
                                return parcelsForAwb.map(p => {
                                    if (p.isExchange) {
                                        const linkedParcel = allParcels.find(linked => linked.id === p.linkedParcelId);
                                        if (!linkedParcel) {
                                            // Fallback for an orphaned exchange parcel, just print a regular AWB for it.
                                            return (
                                                <div key={p.id} className="single-awb-wrapper">
                                                    <AirwayBill parcel={p} />
                                                </div>
                                            );
                                        }
                                        
                                        // The outbound parcel is the one WITHOUT returnItemDetails.
                                        const isPOutbound = !p.returnItemDetails;
                                        const outbound = isPOutbound ? p : linkedParcel;
                                        const inbound = isPOutbound ? linkedParcel : p;

                                        const pairKey = [outbound.id, inbound.id].sort().join('-');
                                        if (printedExchangePairs.has(pairKey)) {
                                            return null; // Avoids printing the AWB twice if both parcels of an exchange are selected
                                        }
                                        printedExchangePairs.add(pairKey);

                                        return (
                                            <div key={pairKey} className="single-awb-wrapper">
                                                <ExchangeAirwayBill outboundParcel={outbound} returnParcel={inbound} />
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div key={p.id} className="single-awb-wrapper">
                                                <AirwayBill parcel={p} />
                                            </div>
                                        );
                                    }
                                });
                            })()}
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end no-print">
                    <Button onClick={handlePrint}>Print</Button>
                </div>
            </Modal>
            
            <ParcelDetailsModal isOpen={!!viewingParcel} onClose={() => setViewingParcel(null)} parcel={viewingParcel} />
            
            <Modal isOpen={isTrackingModalOpen} onClose={() => { setIsTrackingModalOpen(false); setTrackingInput(''); setFoundParcel(null); setTrackingError(''); }} title="Track Any Parcel">
                <form onSubmit={handleTrackParcel}>
                    <div className="flex items-center gap-2">
                        <input type="text" placeholder="Enter Tracking Number" value={trackingInput} onChange={e => setTrackingInput(e.target.value)} autoFocus className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors`} />
                        <Button type="submit">Track</Button>
                    </div>
                </form>
                {trackingError && <p className="text-red-500 mt-4">{trackingError}</p>}
                {foundParcel && (<div className="mt-6"><ParcelDetailsModal isOpen={true} onClose={() => setFoundParcel(null)} parcel={foundParcel} /></div>)}
            </Modal>
        </div>
    );
};

export default BrandDashboard;