import React, { useState, useMemo } from 'react';
import { Parcel, ParcelStatus, User } from '../../../types';
import { useData } from '../../../context/DataContext';
import { Card } from '../../shared/Card';
import { Button } from '../../shared/Button';
import { Checkbox } from '../../shared/Checkbox';
import { Modal } from '../../shared/Modal';
import { ClockIcon } from '../../icons/ClockIcon';
import { TruckIcon } from '../../icons/TruckIcon';
import { BuildingOfficeIcon } from '../../icons/BuildingOfficeIcon';
import { MapPinIcon } from '../../icons/MapPinIcon';
import { CheckCircleIcon } from '../../icons/CheckCircleIcon';
import { AlertTriangleIcon } from '../../icons/AlertTriangleIcon';
import { ArrowUturnLeftIcon } from '../../icons/ArrowUturnLeftIcon';
import { TrashIcon } from '../../icons/TrashIcon';
import { PrinterIcon } from '../../icons/PrinterIcon';
import { CheckBadgeIcon } from '../../icons/CheckBadgeIcon';
import { ArrowPathIcon } from '../../icons/ArrowPathIcon';
import { PackageIcon } from '../../icons/PackageIcon';
import { DollarSignIcon } from '../../icons/DollarSignIcon';
import { ExchangeParcelModal } from '../ExchangeParcelModal';
import { ExchangeAirwayBill } from '../ExchangeAirwayBill';

const statusBadgeInfo: { [key in ParcelStatus]?: { icon: React.FC<React.SVGProps<SVGSVGElement>>, colorClasses: string } } = {
    [ParcelStatus.BOOKED]: { icon: ClockIcon, colorClasses: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-500/20' },
    [ParcelStatus.PENDING_EXCHANGE_PICKUP]: { icon: ArrowPathIcon, colorClasses: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-500/20' },
    [ParcelStatus.PICKED_UP]: { icon: TruckIcon, colorClasses: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/20' },
    [ParcelStatus.AT_HUB]: { icon: BuildingOfficeIcon, colorClasses: 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-500/20' },
    [ParcelStatus.OUT_FOR_DELIVERY]: { icon: MapPinIcon, colorClasses: 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-500/20' },
    [ParcelStatus.DELIVERED]: { icon: CheckCircleIcon, colorClasses: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-500/20' },
    [ParcelStatus.DELIVERY_FAILED]: { icon: AlertTriangleIcon, colorClasses: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-500/20' },
    [ParcelStatus.CUSTOMER_REFUSED]: { icon: AlertTriangleIcon, colorClasses: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-500/20' },
    [ParcelStatus.PENDING_DELIVERY]: { icon: BuildingOfficeIcon, colorClasses: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-500/20' },
    [ParcelStatus.PENDING_RETURN]: { icon: ArrowUturnLeftIcon, colorClasses: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-500/20' },
    [ParcelStatus.OUT_FOR_RETURN]: { icon: TruckIcon, colorClasses: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-500/20' },
    [ParcelStatus.RETURNED]: { icon: ArrowUturnLeftIcon, colorClasses: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-500/20' },
    [ParcelStatus.CANCELED]: { icon: TrashIcon, colorClasses: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-500/20' },
    [ParcelStatus.LOST]: { icon: AlertTriangleIcon, colorClasses: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-500/20' },
    [ParcelStatus.DAMAGED]: { icon: AlertTriangleIcon, colorClasses: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-500/20' },
};

const STATUS_PANEL_CONFIG: { [key in ParcelStatus]?: { icon: React.FC<any>, color: string, textColor: string, name: string } } = {
    [ParcelStatus.BOOKED]: { icon: ClockIcon, color: '#FEF9C3', textColor: '#92400E', name: 'Booked' },
    [ParcelStatus.PICKED_UP]: { icon: TruckIcon, color: '#DBEAFE', textColor: '#1E40AF', name: 'Picked Up' },
    [ParcelStatus.AT_HUB]: { icon: BuildingOfficeIcon, color: '#E0E7FF', textColor: '#3730A3', name: 'At Hub' },
    [ParcelStatus.OUT_FOR_DELIVERY]: { icon: MapPinIcon, color: '#CFFAFE', textColor: '#155E75', name: 'Out for Delivery' },
    [ParcelStatus.DELIVERED]: { icon: CheckCircleIcon, color: '#DCFCE7', textColor: '#166534', name: 'Delivered' },
    [ParcelStatus.DELIVERY_FAILED]: { icon: AlertTriangleIcon, color: '#FEE2E2', textColor: '#991B1B', name: 'Delivery Failed' },
    [ParcelStatus.PENDING_DELIVERY]: { icon: BuildingOfficeIcon, color: '#FFEDD5', textColor: '#9A3412', name: 'Pending Delivery' },
    [ParcelStatus.PENDING_RETURN]: { icon: ArrowUturnLeftIcon, color: '#FFEDD5', textColor: '#9A3412', name: 'Pending Return' },
    [ParcelStatus.OUT_FOR_RETURN]: { icon: TruckIcon, color: '#FFEDD5', textColor: '#9A3412', name: 'Out for Return' },
    [ParcelStatus.RETURNED]: { icon: ArrowUturnLeftIcon, color: '#E5E7EB', textColor: '#374151', name: 'Returned' },
    [ParcelStatus.CANCELED]: { icon: TrashIcon, color: '#E5E7EB', textColor: '#374151', name: 'Canceled' },
    [ParcelStatus.LOST]: { icon: AlertTriangleIcon, color: '#D1D5DB', textColor: '#1F2937', name: 'Lost' },
    [ParcelStatus.DAMAGED]: { icon: AlertTriangleIcon, color: '#FEE2E2', textColor: '#991B1B', name: 'Damaged' },
    [ParcelStatus.FRAUDULENT]: { icon: AlertTriangleIcon, color: '#FEE2E2', textColor: '#991B1B', name: 'Fraudulent' },
    [ParcelStatus.SOLVED]: { icon: CheckBadgeIcon, color: '#D1FAE5', textColor: '#065F46', name: 'Solved' },
    [ParcelStatus.PENDING_EXCHANGE_PICKUP]: { icon: ArrowPathIcon, color: '#E9D5FF', textColor: '#581C87', name: 'Exchange Pickup' },
};

const STATUS_ORDER = Object.values(ParcelStatus);

const formatPKT = (dateString: string) => new Date(dateString).toLocaleString('en-US', { timeZone: 'Asia/Karachi', year: 'numeric', month: 'short', day: 'numeric' });

interface DashboardViewProps {
    user: User;
    parcelsInDateRange: Parcel[];
    setViewingParcel: (p: Parcel | null) => void;
    setParcelsForAwb: (parcels: Parcel[]) => void;
    setIsAwbModalOpen: (isOpen: boolean) => void;
}

const SimpleStatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.FC<React.SVGProps<SVGSVGElement>> }) => (
    <Card className="flex items-center p-3">
        <div className="p-2.5 rounded-full bg-primary/10 text-primary mr-3">
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <p className="text-sm text-content-secondary">{title}</p>
            <p className="text-base font-bold text-content-primary">{value}</p>
        </div>
    </Card>
);

export const DashboardView: React.FC<DashboardViewProps> = ({ user, parcelsInDateRange, setViewingParcel, setParcelsForAwb, setIsAwbModalOpen }) => {
    const { deleteParcel, addBrandRemark } = useData();
    const [selectedParcels, setSelectedParcels] = useState<Set<string>>(new Set());
    const [remarkingParcel, setRemarkingParcel] = useState<Parcel | null>(null);
    const [remark, setRemark] = useState('');
    const [exchangingParcel, setExchangingParcel] = useState<Parcel | null>(null);
    const [exchangeSuccessData, setExchangeSuccessData] = useState<{ outboundParcel: Parcel; returnParcel: Parcel; } | null>(null);

    const stats = useMemo(() => {
        const total = parcelsInDateRange.length;
        const totalCOD = parcelsInDateRange.reduce((sum, p) => sum + p.codAmount, 0);
        return { total, totalCOD };
    }, [parcelsInDateRange]);

    const allVisibleSelected = useMemo(() => {
        if (parcelsInDateRange.length === 0) return false;
        return parcelsInDateRange.every(p => selectedParcels.has(p.id));
    }, [parcelsInDateRange, selectedParcels]);

    const handleSelectAllVisible = () => {
        if (allVisibleSelected) {
            setSelectedParcels(new Set());
        } else {
            setSelectedParcels(new Set(parcelsInDateRange.map(p => p.id)));
        }
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

    const handleDeleteSelected = () => {
        const parcelsToDelete = parcelsInDateRange.filter(p => selectedParcels.has(p.id) && p.status === ParcelStatus.BOOKED);
        if (parcelsToDelete.length === 0) {
            alert('Only parcels with "Booked" status can be canceled.');
            return;
        }
        if (window.confirm(`Are you sure you want to cancel ${parcelsToDelete.length} selected parcel(s)? This action cannot be undone.`)) {
            deleteParcel(parcelsToDelete.map(p => p.id));
            setSelectedParcels(new Set());
        }
    };
    
    const handlePrintSelected = () => {
        const parcelsToPrint = parcelsInDateRange.filter(p => selectedParcels.has(p.id));
        if (parcelsToPrint.length === 0) {
            alert('Please select parcels to print.');
            return;
        }
        setParcelsForAwb(parcelsToPrint);
        setIsAwbModalOpen(true);
    };

    const handleRemarkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (remarkingParcel) {
            addBrandRemark(remarkingParcel.id, remark);
            setRemarkingParcel(null);
            setRemark('');
        }
    };

    const handleExchangeSuccess = (data: { outboundParcel: Parcel; returnParcel: Parcel; }) => {
        setExchangeSuccessData(data);
    };

    const handlePrintExchangeAWB = () => {
        window.print();
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SimpleStatCard title="Total Parcels in View" value={stats.total} icon={PackageIcon} />
                <SimpleStatCard title="Total COD in View" value={`PKR ${stats.totalCOD.toLocaleString()}`} icon={DollarSignIcon} />
            </div>

            <Card>
                <h2 className="text-lg font-bold mb-3 text-content-primary">Parcels</h2>
                <div className="flex items-center gap-2 mb-3">
                    <Button onClick={handlePrintSelected} disabled={selectedParcels.size === 0} size="sm" className="flex items-center gap-1.5">
                        <PrinterIcon className="w-4 h-4" /> Print AWB ({selectedParcels.size})
                    </Button>
                    <Button onClick={handleDeleteSelected} disabled={selectedParcels.size === 0} size="sm" variant="danger" className="flex items-center gap-1.5">
                        <TrashIcon className="w-4 h-4" /> Cancel Selected
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-border bg-surface/50 text-content-secondary">
                            <tr>
                                <th className="p-2 w-12"><Checkbox checked={allVisibleSelected} onChange={handleSelectAllVisible} aria-label="Select all parcels"/></th>
                                <th className="p-2 font-semibold">Details</th>
                                <th className="p-2 font-semibold">Recipient</th>
                                <th className="p-2 font-semibold text-right">COD</th>
                                <th className="p-2 font-semibold">Status</th>
                                <th className="p-2 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-content-primary">
                            {parcelsInDateRange.map(p => {
                                const info = statusBadgeInfo[p.status];
                                const Icon = info?.icon;
                                return (
                                <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-surface">
                                    <td className="p-2 w-12" onClick={e => e.stopPropagation()}><Checkbox checked={selectedParcels.has(p.id)} onChange={() => handleSelectParcel(p.id)} aria-label={`Select parcel ${p.trackingNumber}`}/></td>
                                    <td className="p-2 cursor-pointer" onClick={() => setViewingParcel(p)}>
                                        <p className="font-mono text-primary font-semibold">{p.trackingNumber}</p>
                                        <p className="text-xs text-content-muted">Order ID: {p.orderId}</p>
                                        <p className="text-xs text-content-muted">{formatPKT(p.createdAt)}</p>
                                    </td>
                                    <td className="p-2 cursor-pointer" onClick={() => setViewingParcel(p)}>{p.recipientName}<br/><span className="text-xs text-content-muted">{p.recipientAddress}</span></td>
                                    <td className="p-2 text-right font-semibold">PKR {p.codAmount.toLocaleString()}</td>
                                    <td className="p-2 cursor-pointer" onClick={() => setViewingParcel(p)}>
                                        {info && Icon ? (
                                            <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 text-xs font-semibold rounded-full ${info.colorClasses}`}>
                                                <Icon className="w-3 h-3" />
                                                {p.status}
                                            </span>
                                        ) : p.status}
                                    </td>
                                    <td className="p-2">
                                        <div className="flex flex-col items-start gap-1">
                                            <Button size="sm" variant="secondary" onClick={() => setRemarkingParcel(p)}>Add Remark</Button>
                                            <Button size="sm" variant="secondary" onClick={() => setExchangingParcel(p)} disabled={p.status !== ParcelStatus.DELIVERED && p.status !== ParcelStatus.RETURNED}>
                                                Exchange
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={!!remarkingParcel} onClose={() => setRemarkingParcel(null)} title={`Add Remark for ${remarkingParcel?.trackingNumber}`}>
                <form onSubmit={handleRemarkSubmit} className="space-y-3">
                    <div>
                        <label htmlFor="remark" className="block text-sm font-medium text-content-secondary mb-2">Your Remark</label>
                        <textarea id="remark" value={remark} onChange={(e) => setRemark(e.target.value)} rows={4} className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary" placeholder="e.g., Customer requested re-attempt on weekend."></textarea>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="secondary" onClick={() => setRemarkingParcel(null)}>Cancel</Button>
                        <Button type="submit">Save Remark</Button>
                    </div>
                </form>
            </Modal>
            
            {exchangingParcel && 
                <ExchangeParcelModal 
                    isOpen={!!exchangingParcel} 
                    onClose={() => setExchangingParcel(null)} 
                    originalParcel={exchangingParcel}
                    onExchangeSuccess={handleExchangeSuccess}
                />
            }

            <Modal isOpen={!!exchangeSuccessData} onClose={() => setExchangeSuccessData(null)} title="Exchange Booked Successfully" size="4xl">
                <p className="mb-4 text-content-secondary">Print the new Airway Bill for the exchange parcel.</p>
                <div className="printable-area">
                    {exchangeSuccessData && <ExchangeAirwayBill outboundParcel={exchangeSuccessData.outboundParcel} returnParcel={exchangeSuccessData.returnParcel} />}
                </div>
                <div className="mt-6 flex justify-end gap-2 no-print">
                    <Button variant="secondary" onClick={() => setExchangeSuccessData(null)}>Close</Button>
                    <Button onClick={handlePrintExchangeAWB}>Print</Button>
                </div>
            </Modal>
        </div>
    );
};
