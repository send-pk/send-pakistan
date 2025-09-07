import React, { useMemo } from 'react';
import { Parcel, ParcelStatus } from '../../../types';
import { Card } from '../../shared/Card';
import { ClockIcon } from '../../icons/ClockIcon';
import { TruckIcon } from '../../icons/TruckIcon';
import { BuildingOfficeIcon } from '../../icons/BuildingOfficeIcon';
import { MapPinIcon } from '../../icons/MapPinIcon';
import { CheckCircleIcon } from '../../icons/CheckCircleIcon';
import { AlertTriangleIcon } from '../../icons/AlertTriangleIcon';
import { ArrowUturnLeftIcon } from '../../icons/ArrowUturnLeftIcon';

interface ParcelsByStatusProps {
    parcels: Parcel[];
    onStatusSelect: (status: ParcelStatus | 'all') => void;
    activeStatus: ParcelStatus | 'all';
}

const statusDisplayConfig = [
    { status: ParcelStatus.BOOKED, label: 'Booked', icon: ClockIcon, colors: { 
        bg: 'bg-yellow-100 dark:bg-yellow-900/40', 
        text: 'text-yellow-700 dark:text-yellow-400',
        label: 'text-yellow-900 dark:text-yellow-200'
    }},
    { status: ParcelStatus.PICKED_UP, label: 'Picked Up', icon: TruckIcon, colors: { 
        bg: 'bg-blue-100 dark:bg-blue-900/40', 
        text: 'text-blue-700 dark:text-blue-400',
        label: 'text-blue-900 dark:text-blue-200'
    }},
    { status: ParcelStatus.AT_HUB, label: 'Arrived at Warehouse', icon: BuildingOfficeIcon, colors: { 
        bg: 'bg-purple-100 dark:bg-purple-900/40', 
        text: 'text-purple-700 dark:text-purple-400',
        label: 'text-purple-900 dark:text-purple-200'
    }},
    { status: ParcelStatus.OUT_FOR_DELIVERY, label: 'Out for Delivery', icon: MapPinIcon, colors: {
        bg: 'bg-cyan-100 dark:bg-cyan-900/40', 
        text: 'text-cyan-700 dark:text-cyan-400',
        label: 'text-cyan-900 dark:text-cyan-200'
    }},
    { status: ParcelStatus.DELIVERED, label: 'Delivered', icon: CheckCircleIcon, colors: {
        bg: 'bg-green-100 dark:bg-green-900/40',
        text: 'text-green-700 dark:text-green-400',
        label: 'text-green-900 dark:text-green-200'
    }},
    { status: ParcelStatus.DELIVERY_FAILED, label: 'Failed Attempt', icon: AlertTriangleIcon, colors: {
        bg: 'bg-red-100 dark:bg-red-900/40',
        text: 'text-red-700 dark:text-red-400',
        label: 'text-red-900 dark:text-red-200'
    }},
    { status: ParcelStatus.RETURNED, label: 'Returned to Sender', icon: ArrowUturnLeftIcon, colors: {
        bg: 'bg-slate-100 dark:bg-slate-700/50',
        text: 'text-slate-700 dark:text-slate-400',
        label: 'text-slate-900 dark:text-slate-200'
    }},
];


export const ParcelsByStatus: React.FC<ParcelsByStatusProps> = ({ parcels, onStatusSelect, activeStatus }) => {
    const statusCounts = useMemo(() => {
        const counts = parcels.reduce((acc, parcel) => {
            const status = parcel.status;
            // Group multiple failure types into one
            if ([ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED].includes(status)) {
                acc[ParcelStatus.DELIVERY_FAILED] = (acc[ParcelStatus.DELIVERY_FAILED] || 0) + 1;
            } else {
                 acc[status] = (acc[status] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        return counts;
    }, [parcels]);

    return (
        <Card className="p-4">
            <h2 className="text-lg font-bold text-content-primary mb-4 px-2">Parcels by Status</h2>
            <ul className="space-y-2">
                 {statusDisplayConfig.map(({ status, label, icon: Icon, colors }) => {
                    const count = statusCounts[status] || 0;
                    const isActive = activeStatus === status;
                    return (
                        <li key={status}>
                            <button
                                onClick={() => onStatusSelect(isActive ? 'all' : status)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${colors.bg} ${isActive ? 'ring-2 ring-offset-2 ring-offset-surface ring-primary' : 'hover:brightness-95 dark:hover:brightness-125'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className={`w-5 h-5 flex-shrink-0 ${colors.text}`} />
                                    <span className={`font-semibold text-sm ${colors.label}`}>{label}</span>
                                </div>
                                <span className={`font-bold text-sm ${colors.text}`}>{count}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
};