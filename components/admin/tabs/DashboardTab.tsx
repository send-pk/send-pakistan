import React, { useState, useMemo, useEffect } from 'react';
import { Parcel, ParcelStatus, User } from '../../../types';
import { Card } from '../../shared/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useTheme } from '../../../App';
import { useData } from '../../../context/DataContext';
import { Modal } from '../../shared/Modal';
import { ParcelDetailsModal } from '../../shared/ParcelDetailsModal';
import { PackageIcon } from '../../icons/PackageIcon';
import { TruckIcon } from '../../icons/TruckIcon';
import { CheckCircleIcon } from '../../icons/CheckCircleIcon';
import { BuildingOfficeIcon } from '../../icons/BuildingOfficeIcon';
import { SearchIcon } from '../../icons/SearchIcon';
import { ParcelsByStatus } from '../shared/ParcelsByStatus';
import { Checkbox } from '../../shared/Checkbox';
import { Button } from '../../shared/Button';
import { EditIcon } from '../../icons/EditIcon';
import { XIcon } from '../../icons/XIcon';
import { UserIcon } from '../../icons/UserIcon';

const statusInfo: { [key in ParcelStatus]?: { icon: React.FC<React.SVGProps<SVGSVGElement>>, colorClasses: string } } = {
    [ParcelStatus.BOOKED]: { icon: PackageIcon, colorClasses: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/40' },
    // ... other statuses mapped
    [ParcelStatus.DELIVERED]: { icon: CheckCircleIcon, colorClasses: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/40' },
};

const BulkEditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    selectedParcels: Set<string>;
    onUpdate: (status: ParcelStatus, remark?: string) => void;
}> = ({ isOpen, onClose, selectedParcels, onUpdate }) => {
    const [status, setStatus] = useState<ParcelStatus | ''>('');
    const [remark, setRemark] = useState('');

    useEffect(() => { if (!isOpen) { setStatus(''); setRemark(''); } }, [isOpen]);
    
    const handleSubmit = () => { if (status) { onUpdate(status, remark); onClose(); } };
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
                        <textarea id="bulk-remark" value={remark} onChange={e => setRemark(e.target.value)} rows={3} placeholder="Add a note to explain this status change..." className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors" required />
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

interface DashboardTabProps {
  parcels: Parcel[];
  allParcels: Parcel[];
  users: User[];
  user: User;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ parcels, allParcels, users, user }) => {
    const { theme } = useTheme();
    const { updateMultipleParcelStatuses } = useData();

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [performerFilter, setPerformerFilter] = useState<{ type: 'brand' | 'driver'; value: string; id?: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    
    const [viewingParcel, setViewingParcel] = useState<Parcel | null>(null);
    const [selectedParcels, setSelectedParcels] = useState<Set<string>>(new Set());
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    
    const dailyVolumeData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d; }).reverse();
        return last7Days.map(date => ({ name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), parcels: allParcels.filter(p => new Date(p.createdAt).toDateString() === date.toDateString()).length }));
    }, [allParcels]);

    const { topBrands, topDrivers } = useMemo(() => {
        const brandCounts = parcels.reduce((acc, p) => ({ ...acc, [p.brandName]: (acc[p.brandName] || 0) + 1 }), {} as Record<string, number>);
        const driverCounts = parcels.filter(p => p.status === ParcelStatus.DELIVERED && p.deliveryDriverId).reduce((acc, p) => ({ ...acc, [p.deliveryDriverId!]: (acc[p.deliveryDriverId!] || 0) + 1 }), {} as Record<string, number>);
        const sortedBrands = Object.entries(brandCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }));
        const sortedDrivers = Object.entries(driverCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([driverId, count]) => ({ name: users.find(u => u.id === driverId)?.name || 'Unknown', count, id: driverId }));
        return { topBrands: sortedBrands, topDrivers: sortedDrivers };
    }, [parcels, users]);

    const filteredParcels = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return parcels.filter(p => {
            const statusMatch = statusFilter === 'all' || p.status === statusFilter || (statusFilter === ParcelStatus.DELIVERY_FAILED && [ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED].includes(p.status));
            const performerMatch = !performerFilter || (performerFilter.type === 'brand' ? p.brandName === performerFilter.value : p.deliveryDriverId === performerFilter.id);
            const searchMatch = !lowerSearch || p.trackingNumber.toLowerCase().includes(lowerSearch) || p.orderId.toLowerCase().includes(lowerSearch) || p.recipientName.toLowerCase().includes(lowerSearch) || p.brandName.toLowerCase().includes(lowerSearch);
            return statusMatch && performerMatch && searchMatch;
        });
    }, [parcels, statusFilter, performerFilter, searchTerm]);
    
    const handleStatusSelect = (status: string) => { setStatusFilter(prev => (prev === status ? 'all' : status)); setSelectedParcels(new Set()); };
    const handlePerformerSelect = (type: 'brand' | 'driver', value: string, id?: string) => { setPerformerFilter(prev => (prev?.value === value ? null : { type, value, id })); setSelectedParcels(new Set()); };
    const handleSelectParcel = (parcelId: string) => setSelectedParcels(prev => { const newSet = new Set(prev); if (newSet.has(parcelId)) newSet.delete(parcelId); else newSet.add(parcelId); return newSet; });
    
    const allVisibleSelected = useMemo(() => filteredParcels.length > 0 && filteredParcels.every(p => selectedParcels.has(p.id)), [filteredParcels, selectedParcels]);
    const handleSelectAllVisible = () => setSelectedParcels(allVisibleSelected ? new Set() : new Set(filteredParcels.map(p => p.id)));

    const handleBulkUpdate = (status: ParcelStatus, remark?: string) => { updateMultipleParcelStatuses(Array.from(selectedParcels), status, user, { adminRemark: remark }); setSelectedParcels(new Set()); };

    return (
        <div className="space-y-4">
            <Card>
                <h2 className="text-lg font-bold mb-3 text-content-primary">Parcel Volume (Last 7 Days)</h2>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dailyVolumeData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--color-border-rgb), 0.5)" /><XAxis dataKey="name" tick={{ fill: 'rgb(var(--color-content-secondary-rgb))' }} fontSize={12} /><YAxis tick={{ fill: 'rgb(var(--color-content-secondary-rgb))' }} fontSize={12} /><Tooltip cursor={{ fill: 'rgba(var(--color-primary-rgb), 0.1)' }} contentStyle={{ backgroundColor: 'rgb(var(--color-surface-rgb))', border: '1px solid rgb(var(--color-border-rgb))', borderRadius: '0.5rem' }} /><Bar dataKey="parcels" fill="rgb(var(--color-primary-rgb))" radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <ParcelsByStatus parcels={allParcels} onStatusSelect={handleStatusSelect} activeStatus={statusFilter as ParcelStatus | 'all'} />
                <Card><h3 className="text-md font-bold mb-3 text-content-primary">Top Brands by Volume</h3><ul className="space-y-2">{topBrands.map(b => <li key={b.name} onClick={() => handlePerformerSelect('brand', b.name)} className={`flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors ${performerFilter?.value === b.name ? 'bg-primary/10' : 'hover:bg-border'}`}><div className="flex items-center gap-2 font-semibold"><BuildingOfficeIcon className="w-5 h-5 text-primary" />{b.name}</div><span className="font-bold text-primary">{b.count}</span></li>)}</ul></Card>
                <Card><h3 className="text-md font-bold mb-3 text-content-primary">Top Drivers by Deliveries</h3><ul className="space-y-2">{topDrivers.map(d => <li key={d.id} onClick={() => handlePerformerSelect('driver', d.name, d.id)} className={`flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors ${performerFilter?.value === d.name ? 'bg-primary/10' : 'hover:bg-border'}`}><div className="flex items-center gap-2 font-semibold"><UserIcon className="w-5 h-5 text-green-500" />{d.name}</div><span className="font-bold text-green-500">{d.count}</span></li>)}</ul></Card>
            </div>

            <Card>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold text-content-primary">Parcels</h2>
                    {(statusFilter !== 'all' || performerFilter) && (
                        <div className="flex items-center gap-2 text-sm bg-background p-1.5 rounded-lg border border-border">
                            <span className="font-semibold text-content-secondary">Filtering by:</span>
                            {statusFilter !== 'all' && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md">{statusFilter}</span>}
                            {performerFilter && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md">{performerFilter.value}</span>}
                            <button onClick={() => { setStatusFilter('all'); setPerformerFilter(null); }} className="p-1 rounded-full hover:bg-border"><XIcon className="w-4 h-4 text-content-secondary" /></button>
                        </div>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 mb-3">
                    <div className="relative flex-grow w-full"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted" /><input placeholder="Search within filtered results..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors" /></div>
                    {selectedParcels.size > 0 && <div className="flex items-center gap-2 flex-shrink-0 bg-primary/10 p-2 rounded-lg"><span className="text-sm font-semibold text-primary">{selectedParcels.size} selected</span><Button size="sm" onClick={() => setIsBulkEditModalOpen(true)} className="flex items-center gap-1.5"><EditIcon className="w-4 h-4" /> Edit</Button><Button size="sm" variant="secondary" onClick={() => setSelectedParcels(new Set())}>Clear</Button></div>}
                </div>
                <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-surface/50 text-content-secondary"><tr><th className="p-2 w-12"><Checkbox checked={allVisibleSelected} onChange={handleSelectAllVisible} aria-label="Select all visible parcels"/></th><th className="p-2 font-semibold">Tracking #</th><th className="p-2 font-semibold">Brand</th><th className="p-2 font-semibold">Recipient</th><th className="p-2 font-semibold">Status</th><th className="p-2 font-semibold text-right">COD</th></tr></thead>
                    <tbody className="text-content-primary">{filteredParcels.map(p => (<tr key={p.id} onClick={() => setViewingParcel(p)} className={`border-b border-border last:border-b-0 hover:bg-surface cursor-pointer ${selectedParcels.has(p.id) ? 'bg-primary/10' : ''}`}><td className="p-2 w-12" onClick={e => e.stopPropagation()}><Checkbox checked={selectedParcels.has(p.id)} onChange={() => handleSelectParcel(p.id)} aria-label={`Select parcel ${p.trackingNumber}`}/></td><td className="p-2 text-primary font-medium">{p.trackingNumber}</td><td className="p-2">{p.brandName}</td><td className="p-2">{p.recipientName}</td><td className="p-2">{p.status}</td><td className="p-2 text-right font-semibold">PKR {p.codAmount.toLocaleString()}</td></tr>))}</tbody>
                </table></div>
                {filteredParcels.length === 0 && <p className="text-center py-8 text-content-muted">No parcels match the current filters.</p>}
            </Card>

            <ParcelDetailsModal isOpen={!!viewingParcel} onClose={() => setViewingParcel(null)} parcel={viewingParcel} user={user} />
            <BulkEditModal isOpen={isBulkEditModalOpen} onClose={() => setIsBulkEditModalOpen(false)} selectedParcels={selectedParcels} onUpdate={handleBulkUpdate} />
        </div>
    )
}
