import React from 'react';
import { User, Parcel, ParcelStatus } from '../../types';
import { useData } from '../../context/DataContext';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { Logo } from '../shared/Logo';
import { ThemeToggle } from '../shared/ThemeToggle';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { AlertTriangleIcon } from '../icons/AlertTriangleIcon';
import { ArrowUturnLeftIcon } from '../icons/ArrowUturnLeftIcon';
import { MapPinIcon } from '../icons/MapPinIcon';
import { TruckIcon } from '../icons/TruckIcon';
import { PackageIcon } from '../icons/PackageIcon';
import { DollarSignIcon } from '../icons/DollarSignIcon';
import { UserIcon } from '../icons/UserIcon';
import { LahoreMap } from './LahoreMap';
import { BuildingOfficeIcon } from '../icons/BuildingOfficeIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { LogoutIcon } from '../icons/LogoutIcon';

interface CustomerDashboardProps {
  user: User;
  parcel: Parcel;
  onLogout: () => void;
}

const statusInfo: { [key in ParcelStatus]?: { icon: React.FC<React.SVGProps<SVGSVGElement>>, color: string } } = {
    [ParcelStatus.BOOKED]: { icon: ClockIcon, color: 'text-yellow-500' },
    [ParcelStatus.PENDING_EXCHANGE_PICKUP]: { icon: ClockIcon, color: 'text-yellow-500' },
    [ParcelStatus.PICKED_UP]: { icon: PackageIcon, color: 'text-blue-500' },
    [ParcelStatus.AT_HUB]: { icon: BuildingOfficeIcon, color: 'text-sky-500' },
    [ParcelStatus.OUT_FOR_DELIVERY]: { icon: MapPinIcon, color: 'text-cyan-500' },
    [ParcelStatus.DELIVERED]: { icon: CheckCircleIcon, color: 'text-green-500' },
    [ParcelStatus.DELIVERY_FAILED]: { icon: AlertTriangleIcon, color: 'text-red-500' },
    [ParcelStatus.CUSTOMER_REFUSED]: { icon: AlertTriangleIcon, color: 'text-red-500' },
    [ParcelStatus.PENDING_DELIVERY]: { icon: BuildingOfficeIcon, color: 'text-orange-500' },
    [ParcelStatus.PENDING_RETURN]: { icon: ArrowUturnLeftIcon, color: 'text-orange-500' },
    [ParcelStatus.OUT_FOR_RETURN]: { icon: TruckIcon, color: 'text-orange-500' },
    [ParcelStatus.RETURNED]: { icon: ArrowUturnLeftIcon, color: 'text-gray-500' },
    [ParcelStatus.CANCELED]: { icon: TrashIcon, color: 'text-gray-500' },
    [ParcelStatus.LOST]: { icon: AlertTriangleIcon, color: 'text-gray-500' },
    [ParcelStatus.DAMAGED]: { icon: AlertTriangleIcon, color: 'text-red-500' },
};

const renderTimeline = (parcel: Parcel) => {
    const statuses = [ParcelStatus.BOOKED, ParcelStatus.PICKED_UP, ParcelStatus.AT_HUB, ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERED];
    const currentStatusIndex = statuses.indexOf(parcel.status);

    return (
        <div className="flex items-center mt-4 overflow-x-auto pb-4">
            {statuses.map((status, index) => (
                <React.Fragment key={status}>
                    <div className="flex flex-col items-center flex-shrink-0">
                       <div className={`w-4 h-4 rounded-full ${index <= currentStatusIndex ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-border'} border-4 border-surface box-content`}></div>
                       <p className={`text-xs mt-2 text-center w-20 font-medium ${index <= currentStatusIndex ? 'text-content-primary' : 'text-content-secondary'}`}>{status.replace(/ /g, '\n')}</p>
                    </div>
                    {index < statuses.length - 1 && <div className={`flex-1 h-1 mx-1 min-w-[20px] ${index < currentStatusIndex ? 'bg-primary' : 'bg-border'}`}></div>}
                </React.Fragment>
            ))}
        </div>
    );
};

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user, parcel, onLogout }) => {
    const { users } = useData();
    const deliveryDriver = users.find(u => u.id === parcel.deliveryDriverId);
    const CurrentStatusIcon = statusInfo[parcel.status]?.icon || ClockIcon;
    const currentStatusColor = statusInfo[parcel.status]?.color || 'text-gray-500';

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="bg-surface shadow-sm px-4 sm:px-6 py-2 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-2 z-10 border-b border-border sticky top-0">
                <div className="flex items-center gap-3"><Logo textClassName="text-2xl" iconClassName="w-5 h-5" /><span className="text-content-muted">/</span><span className="font-semibold text-content-primary">Track Parcel</span></div>
                <div className="flex items-center gap-3"><span className="text-content-secondary hidden sm:inline">Welcome, {user.name}</span><ThemeToggle /><Button onClick={onLogout} variant="secondary" className="flex items-center gap-2" aria-label="Logout"><LogoutIcon className="w-5 h-5"/><span className="hidden sm:inline">Logout</span></Button></div>
            </header>
            <main className="flex-1 p-3 overflow-y-auto">
                <Card className="max-w-4xl mx-auto">
                    <div className="text-center border-b border-border pb-3 mb-3">
                        <p className="text-content-secondary">Tracking Number</p>
                        <h1 className="text-xl font-bold font-mono text-primary">{parcel.trackingNumber}</h1>
                        <div className={`mt-2 inline-flex items-center gap-2 text-sm font-semibold ${currentStatusColor}`}><CurrentStatusIcon className="w-5 h-5" /><span>{parcel.status}</span></div>
                    </div>
                    <div className="mb-4">{renderTimeline(parcel)}</div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card><h3 className="text-sm font-semibold mb-2 text-content-primary flex items-center gap-2"><MapPinIcon className="w-5 h-5 text-primary"/> Delivery Progress</h3><LahoreMap parcel={parcel} driver={deliveryDriver} /></Card>
                        <div className="space-y-4">
                             <Card className="p-3"><h3 className="text-sm font-semibold mb-2 text-content-primary flex items-center gap-2"><UserIcon className="w-5 h-5 text-primary"/> Delivery Details</h3><p><strong>To:</strong> <span className="text-content-primary">{parcel.recipientName}</span></p><p><strong>Address:</strong> <span className="text-content-primary">{parcel.recipientAddress}</span></p><p><strong>Delivery Driver:</strong> <span className="text-content-primary">{deliveryDriver?.name || 'Not Assigned'}</span></p></Card>
                            <Card className="p-3"><h3 className="text-sm font-semibold mb-2 text-content-primary flex items-center gap-2"><DollarSignIcon className="w-5 h-5 text-primary"/> Amount to Pay</h3><p className="text-lg font-bold text-green-600 dark:text-green-400">PKR {parcel.codAmount.toFixed(2)}</p><p className="text-xs text-content-muted">Please pay this amount to the driver upon delivery.</p></Card>
                        </div>
                    </div>
                </Card>
            </main>
        </div>
    );
};

export default CustomerDashboard;