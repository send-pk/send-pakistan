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
    <Card className="flex items-center p-4">
        <div className="p-3 rounded-full bg-primary/10 text-primary mr-4">
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-sm text-content-secondary">{title}</p>
            <p className="text-xl font-bold text-content-primary">{value}</p>
        </div>
    </Card>
);

export const DashboardView: React.FC<DashboardViewProps> = ({ user, parcelsInDateRange, setViewingParcel, setParcelsForAwb, setIsAwbModalOpen }) => {
    const { addBrandRemark, deleteParcel, updateParcelStatus, addShipperAdvice } = useData();
    const [filterStatus, setFilterStatus] = useState<ParcelStatus | 'all'>('all');
    const [selectedParcels, setSelectedParcels] = useState<Set<string>>(new Set());
    
    const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
    const [remarkingParcel, setRemarkingParcel] = useState<Parcel | null>(null);
    const [remarkText, setRemarkText] = useState('');

    const [isAdviceModalOpen, setIsAdviceModalOpen] = useState(false);
    const [advisingParcel, setAdvisingParcel] = useState<Parcel | null>(null);
    const [adviceText, setAdviceText] = useState('');

    const [exchangingParcel, setExchangingParcel] = useState<Parcel | null>(null);
    const [parcelsForExchangeAwb, setParcelsForExchangeAwb] = useState<{ outboundParcel: Parcel; returnParcel: Parcel; } | null>(null);

    const dashboardStats = useMemo(() => {
        const totalShipments = parcelsInDateRange.length;
        const totalCod = parcelsInDateRange.reduce((sum, p) => sum + p.codAmount, 0);
        const totalCharges = parcelsInDateRange.reduce((sum, p) => sum + p.deliveryCharge + p.tax, 0);
        return { totalShipments, totalCod, totalCharges };
    }, [parcelsInDateRange]);

    const filteredParcels = useMemo(() => {
        if (filterStatus === 'all') return parcelsInDateRange;
        if (filterStatus === ParcelStatus.DELIVERY_FAILED) {
            return parcelsInDateRange.filter(p => [ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED].includes(p.status));
        }
        return parcelsInDateRange.filter(p => p.status === filterStatus);
    }, [parcelsInDateRange, filterStatus]);

    const statusCounts = useMemo(() => {
        return parcelsInDateRange.reduce((acc, parcel) => {
            const status = parcel.status;
            if (status === ParcelStatus.CUSTOMER_REFUSED) {
                acc[ParcelStatus.DELIVERY_FAILED] = (acc[ParcelStatus.DELIVERY_FAILED] || 0) + 1;
            } else {
                acc[status] = (acc[status] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [parcelsInDateRange]);
    
    const displayedStatuses = useMemo(() => {
        return Object.keys(statusCounts)
            .filter(status => statusCounts[status] > 0)
            .sort((a, b) => STATUS_ORDER.indexOf(a as ParcelStatus) - STATUS_ORDER.indexOf(b as ParcelStatus));
    }, [statusCounts]);

    const selectedBookedParcels = useMemo(() => Array.from(selectedParcels).filter(id => { const p = parcelsInDateRange.find(p => p.id === id); return p && p.status === ParcelStatus.BOOKED; }), [selectedParcels, parcelsInDateRange]);

    const handleSelectParcel = (parcelId: string) => setSelectedParcels(prev => { const newSelection = new Set(prev); newSelection.has(parcelId) ? newSelection.delete(parcelId) : newSelection.add(parcelId); return newSelection; });
    const handlePrintSelected = () => { if (selectedParcels.size === 0 || selectedParcels.size > 3) return; const selected = parcelsInDateRange.filter(p => selectedParcels.has(p.id)); if (selected.length > 0) { setParcelsForAwb(selected); setIsAwbModalOpen(true); } };
    const handleCancelSelected = () => { if (selectedBookedParcels.length === 0) return; if (window.confirm(`Cancel ${selectedBookedParcels.length} selected parcel(s)?`)) { deleteParcel(selectedBookedParcels); setSelectedParcels(new Set()); } };

    const handleOpenRemarkModal = (parcel: Parcel) => {
        setRemarkingParcel(parcel);
        setRemarkText(parcel.brandRemark || '');
        setIsRemarkModalOpen(true);
    };
    
    const handleRemarkSubmit = () => {
        if (remarkingParcel) {
            addBrandRemark(remarkingParcel.id, remarkText);
            setIsRemarkModalOpen(false);
            setRemarkingParcel(null);
        }
    };
    
    const handleOpenAdviceModal = (parcel: Parcel) => {
        setAdvisingParcel(parcel);
        setAdviceText(parcel.shipperAdvice || '');
        setIsAdviceModalOpen(true);
    };

    const handleAdviceSubmit = () => {
        if (advisingParcel) {
            addShipperAdvice(advisingParcel.id, adviceText);
            setIsAdviceModalOpen(false);
            setAdvisingParcel(null);
        }
    };

    const handleReturnRequest = (parcel: Parcel) => {
        if (window.confirm('Are you sure you want to request this parcel back to your address?')) {
            updateParcelStatus(parcel.id, ParcelStatus.PENDING_RETURN, user);
        }
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
    
    const handleExchangeSuccess = (newParcels: { outboundParcel: Parcel; returnParcel: Parcel; }) => {
        setExchangingParcel(null); // Close the creation modal
        setParcelsForExchangeAwb(newParcels); // Open the printing modal
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SimpleStatCard title="Total Shipments" value={dashboardStats.totalShipments} icon={PackageIcon} />
                <SimpleStatCard title="Total COD Value" value={`PKR ${dashboardStats.totalCod.toLocaleString()}`} icon={DollarSignIcon} />
                <SimpleStatCard title="Total Charges" value={`PKR ${dashboardStats.totalCharges.toLocaleString()}`} icon={TruckIcon} />
            </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                 {displayedStatuses.map((status) => {
                    const statusKey = status as ParcelStatus;
                    const count = statusCounts[statusKey] || 0;
                    const info = STATUS_PANEL_CONFIG[statusKey];
                    
                    if (!info) return null;
                    
                    const { icon: Icon, color, textColor, name } = info;
                     
                     return (
                         <div key={status} onClick={() => setFilterStatus(prev => prev === status ? 'all' : statusKey)}
                             className={`p-4 rounded-xl flex items-center gap-4 cursor-pointer transition-all duration-300 ${filterStatus === status ? 'ring-2 ring-primary' : 'hover:scale-105'}`}
                             style={{ backgroundColor: color }}>
                             <Icon className="w-8 h-8" style={{color: textColor}} />
                             <div>
                                 <p className="text-2xl font-bold" style={{color: textColor}}>{count}</p>
                                 <p className="text-xs font-semibold" style={{color: textColor}}>{name}</p>
                             </div>
                         </div>
                     )
                 })}
             </div>
             
             <Card>
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                     <h2 className="text-xl font-bold text-content-primary">Parcels ({filteredParcels.length})</h2>
                     <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto transition-all duration-300 ${selectedParcels.size > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                         <Button size="sm" variant="secondary" onClick={handlePrintSelected} disabled={selectedParcels.size === 0 || selectedParcels.size > 3} className="flex items-center justify-center gap-1.5"><PrinterIcon className="w-4 h-4"/> Print AWB ({selectedParcels.size})</Button>
                         <Button size="sm" variant="danger" onClick={handleCancelSelected} disabled={selectedBookedParcels.length === 0}>Cancel Selected ({selectedBookedParcels.length})</Button>
                     </div>
                 </div>
                 <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                         <thead className="border-b-2 border-border bg-surface/50 text-content-secondary">
                             <tr>
                                 <th className="p-3 w-10"><Checkbox checked={allVisibleSelected} onChange={handleSelectAllVisible} aria-label="Select all visible parcels" /></th>
                                 <th className="p-4 font-semibold">Order ID</th>
                                 <th className="p-4 font-semibold">Recipient</th>
                                 <th className="p-4 font-semibold">Last Update</th>
                                 <th className="p-4 font-semibold">Status</th>
                                 <th className="p-4 font-semibold">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="text-content-primary">
                            {filteredParcels.map(p => {
                                const info = statusBadgeInfo[p.status];
                                return (
                                    <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-surface">
                                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox checked={selectedParcels.has(p.id)} onChange={() => handleSelectParcel(p.id)} aria-label={`Select parcel ${p.trackingNumber}`} />
                                        </td>
                                        <td className="p-4 font-mono text-primary flex items-center gap-1.5 cursor-pointer" onClick={() => setViewingParcel(p)}>
                                            {p.orderId}
                                            {p.isExchange && <span title="Exchange Parcel"><ArrowPathIcon className="w-4 h-4 text-purple-500" /></span>}
                                        </td>
                                        <td className="p-4 cursor-pointer" onClick={() => setViewingParcel(p)}>{p.recipientName}</td>
                                        <td className="p-4 cursor-pointer" onClick={() => setViewingParcel(p)}>{formatPKT(p.updatedAt)}</td>
                                        <td className="p-4 cursor-pointer" onClick={() => setViewingParcel(p)}>
                                            {info ? (
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${info.colorClasses}`}>
                                                    <info.icon className="w-3 h-3" />
                                                    {p.status}
                                                </span>
                                            ) : p.status}
                                        </td>
                                        <td className="p-4">
                                            {p.status === ParcelStatus.DELIVERED && (
                                                <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setExchangingParcel(p); }}>
                                                    Exchange
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                     </table>
                 </div>
             </Card>

             <Modal isOpen={isRemarkModalOpen} onClose={() => setIsRemarkModalOpen(false)} title={`Add/Edit Remark for ${remarkingParcel?.trackingNumber}`}>
                <textarea
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                    rows={3}
                    className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="e.g., Please re-attempt tomorrow after 5 PM."
                />
                <div className="flex justify-end gap-2 mt-3">
                    <Button variant="secondary" onClick={() => setIsRemarkModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleRemarkSubmit}>Save Remark</Button>
                </div>
            </Modal>

            <Modal isOpen={isAdviceModalOpen} onClose={() => setIsAdviceModalOpen(false)} title={`Add/Edit Shipper Advice for ${advisingParcel?.trackingNumber}`}>
                <textarea
                    value={adviceText}
                    onChange={(e) => setAdviceText(e.target.value)}
                    rows={3}
                    className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="e.g., Fragile item, handle with care."
                />
                <div className="flex justify-end gap-2 mt-3">
                    <Button variant="secondary" onClick={() => setIsAdviceModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdviceSubmit}>Send Advice</Button>
                </div>
            </Modal>

            {exchangingParcel && (
                <ExchangeParcelModal
                    isOpen={!!exchangingParcel}
                    onClose={() => setExchangingParcel(null)}
                    originalParcel={exchangingParcel}
                    onExchangeSuccess={handleExchangeSuccess}
                />
            )}

            <Modal 
                isOpen={!!parcelsForExchangeAwb} 
                onClose={() => setParcelsForExchangeAwb(null)} 
                title="Print Exchange Airway Bills" 
                size="4xl"
            >
                {parcelsForExchangeAwb && (
                    <>
                        <div className="printable-area">
                            <div className="joint-awb-container">
                                <div className="single-awb-wrapper">
                                    <ExchangeAirwayBill 
                                        outboundParcel={parcelsForExchangeAwb.outboundParcel}
                                        returnParcel={parcelsForExchangeAwb.returnParcel}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end no-print">
                            <Button onClick={() => window.print()}>Print Labels</Button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
};