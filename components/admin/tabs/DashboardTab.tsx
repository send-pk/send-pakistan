import React, { useState, useMemo, useEffect } from 'react';
import { Parcel, ParcelStatus, User } from '../../../types';
import { Card } from '../../shared/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTheme } from '../../../App';
import { useData } from '../../../context/DataContext';
import { Modal } from '../../shared/Modal';
import { ParcelDetailsModal } from '../../shared/ParcelDetailsModal';
import { StatCard } from '../shared/StatCards';
import { PackageIcon } from '../../icons/PackageIcon';
import { TruckIcon } from '../../icons/TruckIcon';
import { CheckCircleIcon } from '../../icons/CheckCircleIcon';
import { AlertTriangleIcon } from '../../icons/AlertTriangleIcon';
import { ArrowUturnLeftIcon } from '../../icons/ArrowUturnLeftIcon';
import { ClockIcon } from '../../icons/ClockIcon';
import { MapPinIcon } from '../../icons/MapPinIcon';
import { BuildingOfficeIcon } from '../../icons/BuildingOfficeIcon';
import { SearchIcon } from '../../icons/SearchIcon';
import { TrashIcon } from '../../icons/TrashIcon';
import { CheckBadgeIcon } from '../../icons/CheckBadgeIcon';
import { ArrowPathIcon } from '../../icons/ArrowPathIcon';
import { ParcelsByStatus } from '../shared/ParcelsByStatus';
import { Checkbox } from '../../shared/Checkbox';
import { Button } from '../../shared/Button';
import { EditIcon } from '../../icons/EditIcon';

const formatPKT = (dateString: string) => new Date(dateString).toLocaleString('en-US', { timeZone: 'Asia/Karachi', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const statusInfo: { [key in ParcelStatus]?: { icon: React.FC<React.SVGProps<SVGSVGElement>>, colorClasses: string } } = {
    [ParcelStatus.BOOKED]: { icon: ClockIcon, colorClasses: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/40' },
    [ParcelStatus.PENDING_EXCHANGE_PICKUP]: { icon: ArrowPathIcon, colorClasses: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/40' },
    [ParcelStatus.PICKED_UP]: { icon: TruckIcon, colorClasses: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/40' },
    [ParcelStatus.AT_HUB]: { icon: BuildingOfficeIcon, colorClasses: 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-900/40' },
    [ParcelStatus.OUT_FOR_DELIVERY]: { icon: MapPinIcon, colorClasses: 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/40' },
    [ParcelStatus.DELIVERED]: { icon: CheckCircleIcon, colorClasses: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/40' },
    [ParcelStatus.DELIVERY_FAILED]: { icon: AlertTriangleIcon, colorClasses: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/40' },
    [ParcelStatus.CUSTOMER_REFUSED]: { icon: AlertTriangleIcon, colorClasses: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/40' },
    [ParcelStatus.PENDING_DELIVERY]: { icon: BuildingOfficeIcon, colorClasses: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/40' },
    [ParcelStatus.PENDING_RETURN]: { icon: ArrowUturnLeftIcon, colorClasses: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/40' },
    [ParcelStatus.OUT_FOR_RETURN]: { icon: TruckIcon, colorClasses: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/40' },
    [ParcelStatus.RETURNED]: { icon: ArrowUturnLeftIcon, colorClasses: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700/40' },
    [ParcelStatus.CANCELED]: { icon: TrashIcon, colorClasses: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700/40' },
    [ParcelStatus.LOST]: { icon: AlertTriangleIcon, colorClasses: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700/40' },
    [ParcelStatus.DAMAGED]: { icon: AlertTriangleIcon, colorClasses: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/40' },
    [ParcelStatus.FRAUDULENT]: { icon: AlertTriangleIcon, colorClasses: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/40' },
    [ParcelStatus.SOLVED]: { icon: CheckBadgeIcon, colorClasses: 'text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-900/40' },
};

interface DashboardTabProps {
  parcels: Parcel[];
  allParcels: Parcel[];
  users: User[];
  user: User;
}

const getAssignedDriverName = (parcel: Parcel, users: User[]): string => {
    let driverId: string | undefined;
    const pickupStatuses = [ParcelStatus.BOOKED, ParcelStatus.PICKED_UP, ParcelStatus.PENDING_RETURN, ParcelStatus.OUT_FOR_RETURN, ParcelStatus.RETURNED];
    const deliveryStatuses = [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERED, ParcelStatus.DELIVERY_FAILED, ParcelStatus.AT_HUB, ParcelStatus.CUSTOMER_REFUSED, ParcelStatus.PENDING_DELIVERY];
    if (pickupStatuses.includes(parcel.status)) driverId = parcel.pickupDriverId;
    else if (deliveryStatuses.includes(parcel.status)) driverId = parcel.deliveryDriverId;
    if (!driverId) return 'Unassigned';
    const driver = users.find(u => u.id === driverId);
    return driver ? driver.name : 'Unknown Driver';
};

const BulkEditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    selectedParcels: Set<string>;
    onUpdate: (status: ParcelStatus, remark?: string) => void;
}> = ({ isOpen, onClose, selectedParcels, onUpdate }) => {
    const [status, setStatus] = useState<ParcelStatus | ''>('');
    const [remark, setRemark] = useState('');

    const handleSubmit = () => {
        if (!status) return;
        onUpdate(status, remark);
        onClose();
    };
    
    useEffect(() => {
        if (!isOpen) {
            setStatus('');
            setRemark('');
        }
    }, [isOpen]);
    
    const allStatuses = Object.values(ParcelStatus);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Editing ${selectedParcels.size} Parcels`} size="lg">
            <div className="space-y-3">
                <div>
                    <label htmlFor="bulk-status" className="block mb-2 text-sm text-content-secondary font-medium">New Status</label>
                    <select id="bulk-status" value={status} onChange={e => setStatus(e.target.value as ParcelStatus)} className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                        <option value="" disabled>Select a status</option>
                        {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {status && (
                    <div>
                        <label htmlFor="bulk-remark" className="block mb-2 text-sm text-content-secondary font-medium">Add Remark / Note (Required)</label>
                        <textarea 
                            id="bulk-remark" 
                            value={remark} 
                            onChange={e => setRemark(e.target.value)} 
                            rows={3} 
                            placeholder="Add a note to explain this status change..." 
                            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                            required
                        />
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!status || !remark}>Update Parcels</Button>
                </div>
            </div>
        </Modal>
    );
};


export const DashboardTab: React.FC<DashboardTabProps> = ({ parcels, allParcels, users, user }) => {
    const { theme } = useTheme();
    const { updateMultipleParcelStatuses } = useData();
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [viewingParcel, setViewingParcel] = useState<Parcel | null>(null);
    const [selectedParcels, setSelectedParcels] = useState<Set<string>>(new Set());
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

    const stats = useMemo(() => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        return {
            total: parcels.length,
            delivered: parcels.filter(p => p.status === ParcelStatus.DELIVERED).length,
            needsAttention: parcels.filter(p => p.status === ParcelStatus.PICKED_UP && new Date(p.updatedAt) < threeDaysAgo).length,
            shipperRemarked: parcels.filter(p => !!p.shipperAdvice).length,
        };
    }, [parcels]);

    const filteredParcels = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        
        let statusFilteredParcels: Parcel[];

        if (filterStatus === 'needsAttention') {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            statusFilteredParcels = parcels.filter(p => p.status === ParcelStatus.PICKED_UP && new Date(p.updatedAt) < threeDaysAgo);
        } else if (filterStatus === 'shipperRemarked') {
            statusFilteredParcels = parcels.filter(p => !!p.shipperAdvice);
        } else if (filterStatus === 'all') {
            statusFilteredParcels = parcels;
        } else {
            statusFilteredParcels = parcels.filter(p => p.status === filterStatus || (filterStatus === ParcelStatus.DELIVERY_FAILED && [ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED].includes(p.status)));
        }

        return statusFilteredParcels.filter(p => 
            (p.trackingNumber.toLowerCase().includes(lowerSearch) || 
             p.orderId.toLowerCase().includes(lowerSearch) || 
             p.recipientName.toLowerCase().includes(lowerSearch) || 
             p.brandName.toLowerCase().includes(lowerSearch)
            )
        );
    }, [parcels, filterStatus, searchTerm]);
    
    const handleFilterChange = (status: string) => {
        setFilterStatus(prev => (prev === status ? 'all' : status));
        setSelectedParcels(new Set());
    };
    
    const handleSelectParcel = (parcelId: string) => {
        setSelectedParcels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(parcelId)) {
                newSet.delete(parcelId);
            } else {
                newSet.add(parcelId);
            }
            return newSet;
        });
    };
    
    const allVisibleSelected = useMemo(() => {
        if (filteredParcels.length === 0) return false;
        return filteredParcels.every(p => selectedParcels.has(p.id));
    }, [filteredParcels, selectedParcels]);

    const handleSelectAllVisible = () => {
        if (allVisibleSelected) {
            setSelectedParcels(prev => {
                const newSet = new Set(prev);
                filteredParcels.forEach(p => newSet.delete(p.id));
                return newSet;
            });
        } else {
            setSelectedParcels(prev => new Set([...prev, ...filteredParcels.map(p => p.id)]));
        }
    };

    const handleBulkUpdate = (status: ParcelStatus, remark?: string) => {
        updateMultipleParcelStatuses(Array.from(selectedParcels), status, user, { adminRemark: remark });
        setSelectedParcels(new Set());
    };

    return (
        <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard 
                    title="Total Parcels" 
                    value={stats.total} 
                    icon={PackageIcon} 
                    onClick={() => setFilterStatus('all')} 
                    colorClass="text-primary"
                    isActive={filterStatus === 'all'}
                />
                 <StatCard 
                    title="Delivered" 
                    value={stats.delivered} 
                    icon={CheckCircleIcon} 
                    onClick={() => handleFilterChange(ParcelStatus.DELIVERED)} 
                    colorClass="text-green-500 dark:text-green-400"
                    isActive={filterStatus === ParcelStatus.DELIVERED}
                />
                <StatCard 
                    title="Need Attention" 
                    value={stats.needsAttention} 
                    icon={AlertTriangleIcon} 
                    onClick={() => handleFilterChange('needsAttention')} 
                    colorClass="text-red-500 dark:text-red-400"
                    isActive={filterStatus === 'needsAttention'}
                />
                <StatCard 
                    title="Shipper Remarked" 
                    value={stats.shipperRemarked} 
                    icon={CheckBadgeIcon} 
                    onClick={() => handleFilterChange('shipperRemarked')} 
                    colorClass="text-blue-500 dark:text-blue-400"
                    isActive={filterStatus === 'shipperRemarked'}
                />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                <div className="xl:col-span-1">
                    <ParcelsByStatus 
                        parcels={allParcels} 
                        onStatusSelect={(status) => setFilterStatus(status as string)} 
                        activeStatus={filterStatus as ParcelStatus | 'all'} 
                    />
                </div>
                <div className="xl:col-span-2">
                    <Card>
                        <h2 className="text-2xl font-bold mb-4 text-content-primary">All Parcels</h2>
                        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                            <div className="relative flex-grow w-full">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted" />
                                <input placeholder="Search by Tracking #, Order ID, Name, Brand..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
                            </div>
                            {selectedParcels.size > 0 && (
                                <div className="flex items-center gap-2 flex-shrink-0 bg-primary/10 p-2 rounded-lg">
                                    <span className="text-sm font-semibold text-primary">{selectedParcels.size} selected</span>
                                    <Button size="sm" onClick={() => setIsBulkEditModalOpen(true)} className="flex items-center gap-1.5"><EditIcon className="w-4 h-4" /> Edit</Button>
                                    <Button size="sm" variant="secondary" onClick={() => setSelectedParcels(new Set())}>Clear</Button>
                                </div>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-border bg-surface/50 text-content-secondary">
                                    <tr>
                                        <th className="p-4 w-12"><Checkbox checked={allVisibleSelected} onChange={handleSelectAllVisible} aria-label="Select all visible parcels"/></th>
                                        <th className="p-4 font-semibold">Tracking #</th>
                                        <th className="p-4 font-semibold">Brand</th>
                                        <th className="p-4 font-semibold">Recipient</th>
                                        <th className="p-4 font-semibold">Assigned Driver</th>
                                        <th className="p-4 font-semibold">Status</th>
                                        <th className="p-4 font-semibold text-right">COD</th>
                                    </tr>
                                </thead>
                                <tbody className="text-content-primary">
                                    {filteredParcels.map(p => {
                                        const driverName = getAssignedDriverName(p, users);
                                        const info = statusInfo[p.status];
                                        const Icon = info?.icon;
                                        return (
                                        <tr key={p.id} onClick={() => setViewingParcel(p)} className={`border-b border-border last:border-b-0 hover:bg-surface cursor-pointer ${selectedParcels.has(p.id) ? 'bg-primary/10' : ''}`}>
                                            <td className="p-4 w-12" onClick={e => e.stopPropagation()}><Checkbox checked={selectedParcels.has(p.id)} onChange={() => handleSelectParcel(p.id)} aria-label={`Select parcel ${p.trackingNumber}`}/></td>
                                            <td className="p-4 text-primary font-medium">{p.trackingNumber}</td>
                                            <td className="p-4">{p.brandName}</td>
                                            <td className="p-4">{p.recipientName}</td>
                                            <td className="p-4">{driverName}</td>
                                            <td className="p-4">
                                                {info && Icon ? (
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${info.colorClasses}`}>
                                                        <Icon className="w-3 h-3" />
                                                        {p.status}
                                                    </span>
                                                ) : p.status}
                                            </td>
                                            <td className="p-4 text-right font-semibold">PKR {p.codAmount.toLocaleString()}</td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
            <ParcelDetailsModal isOpen={!!viewingParcel} onClose={() => setViewingParcel(null)} parcel={viewingParcel} user={user} />
            <BulkEditModal isOpen={isBulkEditModalOpen} onClose={() => setIsBulkEditModalOpen(false)} selectedParcels={selectedParcels} onUpdate={handleBulkUpdate} />
        </div>
    )
}