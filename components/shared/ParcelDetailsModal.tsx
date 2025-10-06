

import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Parcel, ParcelStatus, User, UserRole, Item } from '../../types';
import { UserIcon } from '../icons/UserIcon';
import { PackageIcon } from '../icons/PackageIcon';
import { DollarSignIcon } from '../icons/DollarSignIcon';
import { useData } from '../../context/DataContext';
import { TruckIcon } from '../icons/TruckIcon';
import { MapPinIcon } from '../icons/MapPinIcon';
// Fix: Removed unused LahoreMap import, as it's not exported from its module.
import { AlertTriangleIcon } from '../icons/AlertTriangleIcon';
import { Button } from './Button';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { HistoryIcon } from '../icons/HistoryIcon';
import { formatParcelStatus } from '../../constants';

const formatPKT = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatReturnItems = (items: Item[]): string => {
    if (!items || items.length === 0) return 'N/A';
    return items.map(item => `${item.quantity}x ${item.name}`).join(', ');
};

const renderTimeline = (parcel: Parcel) => {
    const timelineStatuses = [
        ParcelStatus.BOOKED, ParcelStatus.PICKED_UP, ParcelStatus.AT_HUB, ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERED
    ];
    const currentStatusIndex = timelineStatuses.indexOf(parcel.status);

    // If parcel is in a return flow, show a different timeline
    const returnStatuses = [ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED, ParcelStatus.PENDING_DELIVERY, ParcelStatus.PENDING_RETURN, ParcelStatus.OUT_FOR_RETURN, ParcelStatus.RETURNED];
    if (returnStatuses.includes(parcel.status)) {
        const returnTimeline = [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERY_FAILED, ParcelStatus.PENDING_DELIVERY, ParcelStatus.OUT_FOR_RETURN, ParcelStatus.RETURNED];
        const currentReturnIndex = returnTimeline.indexOf(parcel.status);
        return (
             <div className="flex items-center mt-4 overflow-x-auto pb-4">
                {returnTimeline.map((status, index) => (
                    <React.Fragment key={status}>
                        <div className="flex flex-col items-center flex-shrink-0">
                           <div className={`w-4 h-4 rounded-full ${index <= currentReturnIndex ? 'bg-orange-400 shadow-lg shadow-orange-400/40' : 'bg-border'} border-4 border-surface box-content`}></div>
                           <p className={`text-xs mt-2 text-center w-24 font-medium ${index <= currentReturnIndex ? 'text-content-primary' : 'text-content-secondary'}`}>{formatParcelStatus(status).replace(/ /g, '\n')}</p>
                        </div>
                        {index < returnTimeline.length - 1 && <div className={`flex-1 h-1 mx-1 min-w-[20px] ${index < currentReturnIndex ? 'bg-orange-400' : 'bg-border'}`}></div>}
                    </React.Fragment>
                ))}
            </div>
        )
    }

    return (
        <div className="flex items-center mt-4 overflow-x-auto pb-4">
            {timelineStatuses.map((status, index) => (
                <React.Fragment key={status}>
                    <div className="flex flex-col items-center flex-shrink-0">
                       <div className={`w-4 h-4 rounded-full ${index <= currentStatusIndex ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-border'} border-4 border-surface box-content`}></div>
                       <p className={`text-xs mt-2 text-center w-24 font-medium ${index <= currentStatusIndex ? 'text-content-primary' : 'text-content-secondary'}`}>{formatParcelStatus(status).replace(/ /g, '\n')}</p>
                    </div>
                    {index < timelineStatuses.length - 1 && <div className={`flex-1 h-1 mx-1 min-w-[20px] ${index < currentStatusIndex ? 'bg-primary' : 'bg-border'}`}></div>}
                </React.Fragment>
            ))}
        </div>
    );
};

const DriverAssigner: React.FC<{
    parcel: Parcel;
    type: 'pickup' | 'delivery';
    currentDriver: User | undefined;
    isAdmin: boolean;
}> = ({ parcel, type, currentDriver, isAdmin }) => {
    const { users, manuallyAssignDriver } = useData();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedDriverId, setSelectedDriverId] = useState(currentDriver?.id || 'unassigned');
    
    const drivers = useMemo(() => {
        const allDrivers = users.filter(u => u.role === UserRole.DRIVER);
        if (type === 'delivery' && parcel.deliveryZone) {
            return allDrivers.filter(d => d.deliveryZones?.includes(parcel.deliveryZone!));
        }
        return allDrivers;
    }, [users, type, parcel.deliveryZone]);


    const handleSave = () => {
        manuallyAssignDriver(parcel.id, selectedDriverId === 'unassigned' ? null : selectedDriverId, type);
        setIsEditing(false);
    };

    if (!isAdmin) {
        return <span className="text-content-primary">{currentDriver?.name || (type === 'delivery' ? 'Pending assignment at hub' : 'N/A')}</span>;
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <select 
                    value={selectedDriverId} 
                    onChange={e => setSelectedDriverId(e.target.value)}
                    className="flex-grow bg-surface border border-border rounded-md px-2 py-1 text-sm text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                >
                    <option value="unassigned">Unassigned</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <Button size="sm" onClick={handleSave}>Save</Button>
                <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-content-primary">{currentDriver?.name || (type === 'delivery' ? 'Pending assignment at hub' : 'N/A')}</span>
            <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>Change</Button>
        </div>
    );
}

export const ParcelDetailsModal: React.FC<{ isOpen: boolean; onClose: () => void; parcel: Parcel | null; user?: User | null }> = ({ isOpen, onClose, parcel, user }) => {
    const { users, parcels } = useData();
    if (!isOpen || !parcel) return null;
    
    const isAdmin = user?.role === UserRole.ADMIN;
    const pickupDriver = users.find(u => u.id === parcel.pickupDriverId);
    const deliveryDriver = users.find(u => u.id === parcel.deliveryDriverId);
    const linkedParcel = parcel.linkedParcelId ? parcels.find(p => p.id === parcel.linkedParcelId) : null;

    const DetailSection: React.FC<{title: string; icon: React.ReactNode; children: React.ReactNode, className?: string}> = ({title, icon, children, className}) => (
        <section className={className}>
            <h3 className="text-md font-semibold mb-1.5 text-content-primary flex items-center gap-2">{icon} {title}</h3>
            <div className="bg-background p-2 rounded-lg space-y-1 text-content-secondary border border-border text-sm">
                {children}
            </div>
        </section>
    )

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Parcel Details: ${parcel.trackingNumber}`} size="5xl">
            <div className="p-1">
                <section>
                    <h3 className="text-md font-semibold mb-2 text-content-primary">Status Timeline</h3>
                    <div className="bg-background px-4 rounded-lg border border-border">
                        {renderTimeline(parcel)}
                    </div>
                </section>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-4 gap-y-2 mt-2">
                    {/* Details Section */}
                    <div className="lg:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                            <div className="space-y-2">
                                <DetailSection title="Recipient Information" icon={<UserIcon className="w-5 h-5 text-primary" />}>
                                    <p><strong>Name:</strong> <span className="text-content-primary">{parcel.recipientName}</span></p>
                                    <p><strong>Address:</strong> <span className="text-content-primary">{parcel.recipientAddress}</span></p>
                                    <p><strong>Phone:</strong> <span className="text-content-primary">{parcel.recipientPhone}</span></p>
                                </DetailSection>

                                <DetailSection title="Driver Information" icon={<TruckIcon className="w-5 h-5 text-primary" />}>
                                    <p><strong>Pickup Driver:</strong> <DriverAssigner parcel={parcel} type="pickup" currentDriver={pickupDriver} isAdmin={!!isAdmin} /></p>
                                    <p><strong>Delivery Driver:</strong> <DriverAssigner parcel={parcel} type="delivery" currentDriver={deliveryDriver} isAdmin={!!isAdmin} /></p>
                                </DetailSection>
                            </div>

                            <div className="space-y-2">
                                 <DetailSection title="Parcel Information" icon={<PackageIcon className="w-5 h-5 text-primary" />}>
                                    <p><strong>Order ID:</strong> <span className="text-content-primary">{parcel.orderId}</span></p>
                                    <p><strong>Delivery Zone:</strong> <span className="text-content-primary font-semibold">{parcel.deliveryZone || 'N/A'}</span></p>
                                    <p><strong>Weight:</strong> <span className="text-content-primary font-semibold">{parcel.weight.toFixed(1)} kg</span></p>
                                     {parcel.isExchange ? (
                                        <p><strong>Type:</strong> <span className="font-semibold text-content-primary inline-flex items-center gap-1.5">Exchange Shipment <ArrowPathIcon className="w-4 h-4 text-purple-500" /></span></p>
                                    ) : parcel.isOpenParcel ? (
                                        <p><strong>Type:</strong> <span className="font-semibold text-orange-500">Open Parcel Delivery</span></p>
                                    ) : null}
                                    {linkedParcel && (
                                        <p><strong>Linked Parcel:</strong> <span className="font-mono text-primary-dark">{linkedParcel.trackingNumber}</span></p>
                                    )}
                                    <p><strong>Brand:</strong> <span className="text-content-primary">{parcel.brandName}</span></p>
                                    <p><strong>Pickup From:</strong> <span className="text-content-primary font-semibold">{parcel.pickupAddress || 'N/A'}</span></p>
                                    <p><strong>Item Details:</strong> <span className="text-content-primary">{parcel.itemDetails}</span></p>
                                    {parcel.returnItemDetails && <p><strong>Return Items:</strong> <span className="text-content-primary font-semibold">{formatReturnItems(parcel.returnItemDetails)}</span></p>}
                                    {parcel.deliveryInstructions && <p><strong>Instructions:</strong> <span className="text-content-primary">{parcel.deliveryInstructions}</span></p>}
                                    {parcel.shipperAdvice && <p><strong>Shipper Advice:</strong> <span className="text-content-primary font-semibold text-yellow-600 dark:text-yellow-400">{parcel.shipperAdvice}</span></p>}
                                    {parcel.brandRemark && <p><strong>Brand Remark:</strong> <span className="text-content-primary font-semibold text-blue-600 dark:text-blue-400">{parcel.brandRemark}</span></p>}
                                </DetailSection>

                                <DetailSection title="Financials" icon={<DollarSignIcon className="w-5 h-5 text-primary" />}>
                                    <p><strong>COD Amount:</strong> <span className="text-green-600 dark:text-green-400 font-bold">PKR {parcel.codAmount.toFixed(2)}</span></p>
                                    <p><strong>Delivery Charge:</strong> <span className="text-red-600 dark:text-red-400">PKR {parcel.deliveryCharge.toFixed(2)}</span></p>
                                    <p><strong>Tax (16%):</strong> <span className="text-red-600 dark:text-red-400">PKR {parcel.tax.toFixed(2)}</span></p>
                                </DetailSection>
                            </div>
                        </div>
                    </div>

                    {/* History Section */}
                    {parcel.history && parcel.history.length > 0 && (
                        <section className="lg:col-span-1 flex flex-col">
                            <h3 className="text-md font-semibold mb-1.5 text-content-primary flex items-center gap-2"><HistoryIcon className="w-5 h-5 text-primary" /> History & Remarks</h3>
                            <div className="bg-background p-2 rounded-lg text-content-secondary border border-border text-sm flex-grow overflow-y-auto">
                                <div className="space-y-1 pr-2">
                                    {parcel.history.slice().reverse().map((event, index) => (
                                        <div key={index} className="text-sm p-2 bg-surface rounded-md border border-border">
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold text-content-primary">{formatParcelStatus(event.status)}</p>
                                                <p className="text-xs text-content-muted text-right flex-shrink-0 ml-2">
                                                    {formatPKT(event.createdAt)}
                                                </p>
                                            </div>
                                            {event.notes && <p className="text-content-secondary mt-1 text-xs whitespace-pre-wrap">{event.notes}</p>}
                                            {event.proofOfAttempt && (
                                                <a href={event.proofOfAttempt} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
                                                    <img src={event.proofOfAttempt} alt="Proof of attempt" className="rounded-md max-h-24 w-auto border border-border hover:opacity-80 transition-opacity" />
                                                </a>
                                            )}
                                            {event.updatedBy && <p className="text-xs text-content-muted mt-1">by: <strong>{event.updatedBy}</strong></p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </Modal>
    );
};