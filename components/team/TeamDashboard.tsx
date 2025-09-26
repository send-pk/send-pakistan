import React, { useState, useMemo } from 'react';
import { User, UserRole, Parcel } from '../../types';
import { useData } from '../../context/DataContext';
import { Button } from '../shared/Button';
import { ThemeToggle } from '../shared/ThemeToggle';
import { Logo } from '../shared/Logo';
import { LogoutIcon } from '../icons/LogoutIcon';
import { DateFilter } from '../shared/DateFilter';
import { Card } from '../shared/Card';
import { FinanceStatCard } from '../admin/shared/StatCards';
import { DollarSignIcon } from '../icons/DollarSignIcon';
import { PackageIcon } from '../icons/PackageIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { ParcelDetailsModal } from '../shared/ParcelDetailsModal';
import { AlertTriangleIcon } from '../icons/AlertTriangleIcon';

// Helper to format date to YYYY-MM-DD for input fields
const toInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface TeamDashboardProps {
  user: User;
  onLogout: () => void;
}

const TeamDashboard: React.FC<TeamDashboardProps> = ({ user, onLogout }) => {
    const { parcels: allParcels, loading, error } = useData();
    const [dateFilter, setDateFilter] = useState('today');
    const [customStartDate, setCustomStartDate] = useState(toInputDate(new Date()));
    const [customEndDate, setCustomEndDate] = useState(toInputDate(new Date()));
    const [viewingParcel, setViewingParcel] = useState<Parcel | null>(null);

    const parcelsInDateRange = useMemo(() => {
        // This is the primary date filtering logic
        if (dateFilter === 'all') {
            return allParcels;
        }

        if (dateFilter === 'today') {
            const today = new Date();
            const startOfToday = new Date(today.setHours(0, 0, 0, 0));
            const endOfToday = new Date(today.setHours(23, 59, 59, 999));
            return allParcels.filter(p => new Date(p.createdAt) >= startOfToday && new Date(p.createdAt) <= endOfToday);
        }
        
        // Custom date range
        const start = new Date(new Date(customStartDate).setHours(0, 0, 0, 0));
        const end = new Date(new Date(customEndDate).setHours(23, 59, 59, 999));
        return allParcels.filter(p => new Date(p.createdAt) >= start && new Date(p.createdAt) <= end);
    }, [allParcels, dateFilter, customStartDate, customEndDate]);

    const teamData = useMemo(() => {
        let relevantParcels: Parcel[] = [];
        let totalCommission = 0;

        if (user.role === UserRole.SALES_MANAGER) {
            const managedBrandIds = Object.keys(user.brandCommissions || {});
            relevantParcels = parcelsInDateRange.filter(p => managedBrandIds.includes(p.brandId));

            const commissionDetails = Object.entries(user.brandCommissions || {}).map(([brandId, rate]) => {
                const brandRevenue = relevantParcels
                    .filter(p => p.brandId === brandId)
                    .reduce((sum, p) => sum + p.deliveryCharge + p.tax, 0);
                return brandRevenue * (rate / 100);
            });
            totalCommission = commissionDetails.reduce((total: number, commission: number) => total + commission, 0);
        } else if (user.role === UserRole.DIRECT_SALES) {
            // Direct sales commission is on all company revenue in the period
            relevantParcels = parcelsInDateRange;
            const totalRevenue = relevantParcels.reduce((sum, p) => sum + p.deliveryCharge + p.tax, 0);
            totalCommission = totalRevenue * ((user.commissionRate || 0) / 100);
        }

        const totalRevenue = relevantParcels.reduce((sum, p) => sum + p.deliveryCharge + p.tax, 0);
        // FIX: Ensure baseSalary is treated as a number in the sum to prevent type errors.
        const totalSalary = (user.baseSalary || 0) + totalCommission;

        return {
            parcels: relevantParcels,
            stats: {
                totalParcels: relevantParcels.length,
                totalRevenue,
                totalCommission,
                totalSalary
            }
        };
    }, [user, parcelsInDateRange]);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-lg text-content-secondary">Loading Team Portal...</p>
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
            <header className="bg-surface px-4 md:px-6 py-2 flex justify-between items-center z-10 border-b border-border sticky top-0">
                <div className="flex items-center gap-3">
                    <Logo textClassName="text-2xl" iconClassName="w-5 h-5" />
                    <span className="text-content-muted">/</span>
                    <span className="font-semibold text-content-primary">Team Portal</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="hidden md:inline text-sm text-content-secondary">Welcome, {user.name}</span>
                    <ThemeToggle />
                    <Button onClick={onLogout} variant="secondary" className="flex items-center gap-2" aria-label="Logout">
                        <LogoutIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </header>
            
            <main className="flex-1 p-4 overflow-y-auto bg-background space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <h1 className="text-2xl font-bold text-content-primary">Your Dashboard</h1>
                    <DateFilter
                        dateFilter={dateFilter}
                        setDateFilter={setDateFilter}
                        customStartDate={customStartDate}
                        setCustomStartDate={setCustomStartDate}
                        customEndDate={customEndDate}
                        setCustomEndDate={setCustomEndDate}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FinanceStatCard title="Total Parcels" value={teamData.stats.totalParcels.toLocaleString()} icon={PackageIcon} colorClass="text-blue-500" bgColorClass="bg-blue-100 dark:bg-blue-500/20" />
                    <FinanceStatCard title="Total Revenue" value={teamData.stats.totalRevenue} icon={DollarSignIcon} colorClass="text-green-500" bgColorClass="bg-green-100 dark:bg-green-500/20" />
                    <FinanceStatCard title="Your Commission" value={teamData.stats.totalCommission} icon={UsersIcon} colorClass="text-purple-500" bgColorClass="bg-purple-100 dark:bg-purple-500/20" />
                    <FinanceStatCard title="Estimated Salary" value={teamData.stats.totalSalary} icon={DollarSignIcon} colorClass="text-sky-500" bgColorClass="bg-sky-100 dark:bg-sky-500/20" />
                </div>
                
                <Card>
                    <h2 className="text-lg font-bold text-content-primary mb-3">Associated Parcels</h2>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border bg-surface/50 text-content-secondary">
                                <tr>
                                    <th className="p-2 font-semibold">Tracking #</th>
                                    <th className="p-2 font-semibold">Brand</th>
                                    <th className="p-2 font-semibold">Recipient</th>
                                    <th className="p-2 font-semibold">Status</th>
                                    <th className="p-2 font-semibold text-right">COD</th>
                                    <th className="p-2 font-semibold text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="text-content-primary">
                                {teamData.parcels.map(p => (
                                    <tr key={p.id} onClick={() => setViewingParcel(p)} className="border-b border-border last:border-b-0 hover:bg-surface cursor-pointer">
                                        <td className="p-2 text-primary font-medium">{p.trackingNumber}</td>
                                        <td className="p-2">{p.brandName}</td>
                                        <td className="p-2">{p.recipientName}</td>
                                        <td className="p-2">{p.status}</td>
                                        <td className="p-2 text-right font-semibold">PKR {p.codAmount.toLocaleString()}</td>
                                        <td className="p-2 text-right font-semibold">PKR {(p.deliveryCharge + p.tax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {teamData.parcels.length === 0 && <p className="text-center py-8 text-content-muted">No parcels found for the current filter.</p>}
                </Card>
            </main>
            <ParcelDetailsModal isOpen={!!viewingParcel} onClose={() => setViewingParcel(null)} parcel={viewingParcel} user={user} />
        </div>
    );
};

export default TeamDashboard;