import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { User, Parcel, ParcelStatus, Item } from '../../types';
import { useData } from '../../context/DataContext';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { ThemeToggle } from '../shared/ThemeToggle';
import { Logo } from '../shared/Logo';
import { TruckIcon } from '../icons/TruckIcon';
import { PackageIcon } from '../icons/PackageIcon';
import { CheckBadgeIcon } from '../icons/CheckBadgeIcon';
import { FAILED_ATTEMPT_REASONS, PENDING_PARCEL_STATUSES } from '../../constants';
import { CameraIcon } from '../icons/CameraIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { LogoutIcon } from '../icons/LogoutIcon';
import { DateFilter } from '../shared/DateFilter';
import { StatCard } from '../admin/shared/StatCards';
import { MapPinIcon } from '../icons/MapPinIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ScanSuccessFeedback } from '../shared/ScanSuccessFeedback';
import { ArrowUturnLeftIcon } from '../icons/ArrowUturnLeftIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { UserIcon } from '../icons/UserIcon';

declare var Html5Qrcode: any;

interface DriverAppProps {
  user: User;
  onLogout: () => void;
}

const toInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const FormSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${props.className}`} />;
const FormLabel = ({ children, htmlFor }: { children: React.ReactNode, htmlFor?: string }) => <label htmlFor={htmlFor} className="block mb-2 text-sm text-content-secondary font-medium">{children}</label>;

const formatReturnItems = (items?: Item[]): string => {
    if (!items || items.length === 0) return 'item';
    return items.map(item => `${item.quantity}x ${item.name}`).join(', ');
};


const DriverApp: React.FC<DriverAppProps> = ({ user, onLogout }) => {
    const { parcels: allParcels, users, updateParcelStatus, updateDriverLocation } = useData();
    const [activeFilter, setActiveFilter] = useState<'toPick' | 'pickedUp' | 'outForDelivery' | 'delivered' | 'outForReturn' | 'returned'>('toPick');
    
    const [dateFilter, setDateFilter] = useState('today');
    const [customStartDate, setCustomStartDate] = useState(toInputDate(new Date()));
    const [customEndDate, setCustomEndDate] = useState(toInputDate(new Date()));
    
    const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
    const [newStatus, setNewStatus] = useState<ParcelStatus | ''>('');
    const [failedAttemptReason, setFailedAttemptReason] = useState('');
    const [proofOfAttempt, setProofOfAttempt] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const scannerRef = useRef<any>(null);
    const processingScan = useRef(false);
    const scanRegionId = "driver-scan-region";
    const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);

    const assignedParcels = useMemo(() => {
        return allParcels
            .filter(p => p.pickupDriverId === user.id || p.deliveryDriverId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allParcels, user.id]);

    const assignedParcelsRef = useRef(assignedParcels);
    useEffect(() => {
        assignedParcelsRef.current = assignedParcels;
    }, [assignedParcels]);

    const parcelsInDateRange = useMemo(() => {
        if (dateFilter === 'all') {
            return assignedParcels;
        }

        if (dateFilter === 'today') {
            const today = new Date();
            const startOfToday = new Date(today.setHours(0, 0, 0, 0));
            const endOfToday = new Date(today.setHours(23, 59, 59, 999));

            return assignedParcels.filter(p => {
                const createdAt = new Date(p.createdAt);
                const isCreatedToday = createdAt >= startOfToday && createdAt <= endOfToday;
                
                // An active parcel is one that is operationally or financially pending for the driver.
                const isOperationallyPending = PENDING_PARCEL_STATUSES.includes(p.status);
                const isFinanciallyPending = p.status === ParcelStatus.DELIVERED && p.codAmount > 0 && !p.isCodReconciled;
                const isActive = isOperationallyPending || isFinanciallyPending;

                // Show a parcel if it's active OR if it was created today.
                return isActive || isCreatedToday;
            });
        }

        // Custom date range logic
        if (!customStartDate || !customEndDate) return assignedParcels;
        const start = new Date(new Date(customStartDate).setHours(0, 0, 0, 0));
        const end = new Date(new Date(customEndDate).setHours(23, 59, 59, 999));
        return assignedParcels.filter(p => {
            const createdAt = new Date(p.createdAt);
            return createdAt >= start && createdAt <= end;
        });
    }, [assignedParcels, dateFilter, customStartDate, customEndDate]);

    const searchedParcels = useMemo(() => {
        if (!searchTerm) return parcelsInDateRange;
        const lowerSearch = searchTerm.toLowerCase();
        return parcelsInDateRange.filter(p => 
            p.trackingNumber.toLowerCase().includes(lowerSearch) ||
            p.orderId.toLowerCase().includes(lowerSearch) ||
            p.recipientName.toLowerCase().includes(lowerSearch) ||
            p.recipientAddress.toLowerCase().includes(lowerSearch) ||
            p.brandName.toLowerCase().includes(lowerSearch)
        );
    }, [parcelsInDateRange, searchTerm]);

    const stats = useMemo(() => {
        const toPick = searchedParcels.filter(p => p.status === ParcelStatus.BOOKED).length;
        const pickedUp = searchedParcels.filter(p => p.status === ParcelStatus.PICKED_UP).length;
        const outForDelivery = searchedParcels.filter(p => [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERY_FAILED].includes(p.status)).length;
        const delivered = searchedParcels.filter(p => p.status === ParcelStatus.DELIVERED).length;
        const outForReturn = searchedParcels.filter(p => p.status === ParcelStatus.OUT_FOR_RETURN).length;
        const returned = searchedParcels.filter(p => p.status === ParcelStatus.RETURNED).length;
        return { toPick, pickedUp, outForDelivery, delivered, outForReturn, returned };
    }, [searchedParcels]);

    const filteredParcels = useMemo(() => {
        switch (activeFilter) {
            case 'toPick': return searchedParcels.filter(p => p.status === ParcelStatus.BOOKED);
            case 'pickedUp': return searchedParcels.filter(p => p.status === ParcelStatus.PICKED_UP);
            case 'outForDelivery': return searchedParcels.filter(p => [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERY_FAILED].includes(p.status));
            case 'delivered': return searchedParcels.filter(p => p.status === ParcelStatus.DELIVERED);
            case 'outForReturn': return searchedParcels.filter(p => p.status === ParcelStatus.OUT_FOR_RETURN);
            case 'returned': return searchedParcels.filter(p => p.status === ParcelStatus.RETURNED);
            default: return [];
        }
    }, [searchedParcels, activeFilter]);

    useEffect(() => {
        let watchId: number | null = null;
        if (activeFilter === 'outForDelivery') {
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => { setLocationError(null); const { latitude, longitude } = position.coords; updateDriverLocation(user.id, { lat: latitude, lng: longitude }); },
                    (error: GeolocationPositionError) => {
                        let e = "An unknown location error occurred. Live tracking may be unavailable.";
                        if (error.code === error.PERMISSION_DENIED) e = "Location permission denied. Live tracking for customers is disabled. To enable it, please update your browser settings.";
                        setLocationError(e);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            } else { setLocationError("Geolocation is not supported by this browser."); }
        }
        return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
    }, [activeFilter, user.id, updateDriverLocation]);
    
    const handleCloseModal = () => { setSelectedParcel(null); setNewStatus(''); setFailedAttemptReason(''); setProofOfAttempt(null); setImagePreview(null); };
    const handleUpdateStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedParcel && newStatus) {
             if (newStatus === ParcelStatus.DELIVERY_FAILED) {
                if (!failedAttemptReason || !proofOfAttempt) { alert("Please provide a reason and photo proof of attempt."); return; }
                await updateParcelStatus(selectedParcel.id, newStatus, user, { reason: failedAttemptReason, proof: proofOfAttempt });
            } else { await updateParcelStatus(selectedParcel.id, newStatus, user); }
            handleCloseModal();
            setShowSuccessFeedback(true);
        }
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { const base64String = reader.result as string; setProofOfAttempt(base64String); setImagePreview(base64String); }; reader.readAsDataURL(file); } };
    const getAvailableStatuses = (parcel: Parcel): ParcelStatus[] => {
        if (parcel.isExchange && parcel.status === ParcelStatus.OUT_FOR_DELIVERY) {
            return [ParcelStatus.DELIVERED_EXCHANGE_COMPLETE, ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED];
        }
        if (parcel.status === ParcelStatus.BOOKED) return [ParcelStatus.PICKED_UP];
        if ([ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERY_FAILED].includes(parcel.status)) return [ParcelStatus.DELIVERED, ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED];
        if (parcel.status === ParcelStatus.OUT_FOR_RETURN) return [ParcelStatus.RETURNED];
        return [];
    };

    const handleCloseScannerModal = useCallback(() => {
        setIsScannerOpen(false);
        setScanError(null);
        processingScan.current = false;
    }, []);
    
    const onScanSuccess = useCallback(async (decodedText: string) => {
        if (processingScan.current) return;
        processingScan.current = true;

        const foundParcel = assignedParcelsRef.current.find(p => p.trackingNumber.toLowerCase() === decodedText.toLowerCase());

        if (!foundParcel) {
            setScanError('Scan failed: Parcel not found in your assigned tasks list.');
            processingScan.current = false;
            return;
        }

        const isMyPickupTask = (foundParcel.status === ParcelStatus.BOOKED || foundParcel.status === ParcelStatus.OUT_FOR_RETURN) && foundParcel.pickupDriverId === user.id;
        const isMyDeliveryTask = ([ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERY_FAILED].includes(foundParcel.status)) && foundParcel.deliveryDriverId === user.id;

        if (isMyPickupTask) {
            handleCloseScannerModal();
            const nextStatus = foundParcel.status === ParcelStatus.BOOKED ? ParcelStatus.PICKED_UP : ParcelStatus.RETURNED;
            await updateParcelStatus(foundParcel.id, nextStatus, user);
            setShowSuccessFeedback(true);
        } else if (isMyDeliveryTask) {
            handleCloseScannerModal();
            // Streamlined exchange logic: auto-complete on scan
            if (foundParcel.isExchange) {
                await updateParcelStatus(foundParcel.id, ParcelStatus.DELIVERED_EXCHANGE_COMPLETE, user);
                setShowSuccessFeedback(true);
            } else {
                // For regular deliveries, open the modal for status selection.
                setSelectedParcel(foundParcel);
                const nextStatuses = getAvailableStatuses(foundParcel);
                setNewStatus(nextStatuses.length > 0 ? nextStatuses[0] : '');
            }
        } else {
            setScanError(`Scan invalid: Parcel not ready for your action. Current status: "${foundParcel.status}".`);
            processingScan.current = false;
        }
    }, [handleCloseScannerModal, user, updateParcelStatus]);
    
    useEffect(() => {
        if (!isScannerOpen) {
            return;
        }

        const scanner = new Html5Qrcode(scanRegionId);
        scannerRef.current = scanner;

        const startScanner = async () => {
            setScanError(null);
            try {
                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 150 } },
                    onScanSuccess,
                    () => {}
                );
            } catch (error) {
                console.error("Scanner failed to start:", error);
                setScanError('Camera permission denied or not available.');
                handleCloseScannerModal();
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch((err: any) => {
                    console.error("Failed to stop scanner cleanly.", err);
                });
            }
        };
    }, [isScannerOpen, onScanSuccess, handleCloseScannerModal]);

    const ParcelCard = ({ parcel }: { parcel: Parcel }) => {
        const isPickupTask = [ParcelStatus.BOOKED, ParcelStatus.OUT_FOR_RETURN].includes(parcel.status);
        const isDeliveryTask = [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERY_FAILED].includes(parcel.status);
        const linkedParcel = useMemo(() => parcel.isExchange ? allParcels.find(p => p.id === parcel.linkedParcelId) : null, [allParcels, parcel]);
        const brand = useMemo(() => users.find(u => u.id === parcel.brandId), [users, parcel.brandId]);
        const correspondentPhone = brand?.correspondentPhone;

        const callButtonClasses = 'w-full rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface transition-all duration-200 px-4 py-2 text-sm bg-surface border border-border text-content-secondary hover:bg-border focus:ring-primary inline-flex items-center justify-center gap-2';

        return (
            <Card key={parcel.id} className="p-4 space-y-3">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-mono text-sm text-primary font-semibold">{parcel.trackingNumber}</p>
                        <p className="text-xs text-content-muted">Order ID: {parcel.orderId}</p>
                    </div>
                    <span className={`flex-shrink-0 ml-2 px-2.5 py-1 text-xs font-semibold rounded-full ${parcel.status === ParcelStatus.DELIVERY_FAILED ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{parcel.status}</span>
                </div>

                <hr className="border-border"/>

                {/* Details */}
                <div className="flex items-start gap-3 text-sm">
                    <UserIcon className="w-5 h-5 mt-1 text-content-muted flex-shrink-0" />
                    <div>
                        <p className="font-bold text-lg text-content-primary">
                            {parcel.status === ParcelStatus.OUT_FOR_RETURN ? `Return to: ${parcel.brandName}` : (isPickupTask ? parcel.brandName : parcel.recipientName)}
                        </p>
                        <p className="text-content-secondary">{parcel.recipientAddress}</p>
                        {isDeliveryTask && <p className="font-semibold text-content-secondary mt-1">{parcel.recipientPhone}</p>}
                    </div>
                </div>

                {/* COD Amount */}
                {isDeliveryTask && (
                    <>
                        <hr className="border-border"/>
                        <div className="bg-green-50 dark:bg-green-500/10 p-3 rounded-lg flex justify-between items-center">
                            <p className="text-sm font-semibold text-green-800 dark:text-green-200">COD to Collect</p>
                            <p className="font-bold text-2xl text-green-600 dark:text-green-400">PKR {parcel.codAmount.toLocaleString()}</p>
                        </div>
                    </>
                )}

                {/* Instructions/Warnings */}
                {(parcel.isOpenParcel || parcel.isExchange || parcel.shipperAdvice || parcel.brandRemark) && <hr className="border-border"/>}
                <div className="space-y-2">
                    {parcel.isOpenParcel && (<div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-md text-sm text-orange-800 dark:text-orange-300 flex items-center gap-2"><EyeIcon className="w-5 h-5 flex-shrink-0" /><div><strong>OPEN PARCEL:</strong> Allow customer to check contents before payment.</div></div>)}
                    {parcel.isExchange && (<div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-md text-sm text-purple-800 dark:text-purple-300 flex items-center gap-2"><ArrowPathIcon className="w-5 h-5 flex-shrink-0" /><div><strong>EXCHANGE:</strong> Pick up "{formatReturnItems(linkedParcel?.returnItemDetails)}" from customer.</div></div>)}
                    {parcel.shipperAdvice && (<div className="p-2 bg-yellow-100 dark:bg-yellow-500/20 rounded-md text-sm text-yellow-800 dark:text-yellow-300"><strong>Shipper Advice:</strong> {parcel.shipperAdvice}</div>)}
                    {parcel.brandRemark && (<div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-md text-sm text-blue-800 dark:text-blue-300"><strong>Brand Remark:</strong> {parcel.brandRemark}</div>)}
                </div>

                {/* Actions */}
                <hr className="border-border"/>
                <div className="flex justify-between items-center gap-2">
                     {isPickupTask && correspondentPhone ? (
                        <a href={`tel:${correspondentPhone}`} onClick={(e) => e.stopPropagation()} className={callButtonClasses}>
                            <PhoneIcon className="w-4 h-4" />
                            Call Brand
                        </a>
                    ) : <div />}
                    <Button onClick={() => { setSelectedParcel(parcel); const nextStatuses = getAvailableStatuses(parcel); setNewStatus(nextStatuses.length > 0 ? nextStatuses[0] : ''); }} disabled={getAvailableStatuses(parcel).length === 0} className="flex-shrink-0 w-full sm:w-auto">Update Status</Button>
                </div>
            </Card>
        );
    };

    return (
        <div className="max-w-md mx-auto h-screen flex flex-col bg-background">
            <ScanSuccessFeedback show={showSuccessFeedback} onEnd={() => setShowSuccessFeedback(false)} />
            <header className="bg-surface px-4 py-3 flex justify-between items-center z-20 border-b border-border sticky top-0">
                <div className="flex items-center gap-3">
                    <Logo textClassName="text-xl" iconClassName="w-5 h-5" />
                    <span className="text-content-muted">/</span>
                    <span className="font-semibold text-content-primary">{user.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setIsScannerOpen(true)} className="flex items-center gap-1.5"><CameraIcon className="w-4 h-4" /> Scan</Button>
                    <ThemeToggle />
                    <Button onClick={onLogout} variant="secondary" size="sm" className="flex items-center gap-1.5"><LogoutIcon className="w-4 h-4"/> Logout</Button>
                </div>
            </header>
            
            <div className="px-4 py-3 sticky top-[61px] z-10 bg-background space-y-3 border-b border-border shadow-sm">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted" />
                    <input type="text" placeholder="Search by name, address, tracking..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition" />
                </div>
                <DateFilter dateFilter={dateFilter} setDateFilter={setDateFilter} customStartDate={customStartDate} setCustomStartDate={setCustomStartDate} customEndDate={customEndDate} setCustomEndDate={setCustomEndDate} />
            </div>

            <main className="flex-1 overflow-y-auto">
                <div className="px-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
                        <StatCard title="To Pick" value={stats.toPick} icon={PackageIcon} onClick={() => setActiveFilter('toPick')} isActive={activeFilter === 'toPick'} colorClass="text-yellow-500" />
                        <StatCard title="Picked Up" value={stats.pickedUp} icon={TruckIcon} onClick={() => setActiveFilter('pickedUp')} isActive={activeFilter === 'pickedUp'} colorClass="text-blue-500" />
                        <StatCard title="Out for Delivery" value={stats.outForDelivery} icon={MapPinIcon} onClick={() => setActiveFilter('outForDelivery')} isActive={activeFilter === 'outForDelivery'} colorClass="text-cyan-500" />
                        <StatCard title="Delivered" value={stats.delivered} icon={CheckCircleIcon} onClick={() => setActiveFilter('delivered')} isActive={activeFilter === 'delivered'} colorClass="text-green-500" />
                        <StatCard title="Out for Return" value={stats.outForReturn} icon={ArrowUturnLeftIcon} onClick={() => setActiveFilter('outForReturn')} isActive={activeFilter === 'outForReturn'} colorClass="text-orange-500" />
                        <StatCard title="Returned" value={stats.returned} icon={CheckBadgeIcon} onClick={() => setActiveFilter('returned')} isActive={activeFilter === 'returned'} colorClass="text-gray-500" />
                    </div>

                    {locationError && <div className="mb-4 p-3 rounded-md text-sm text-center bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300">{locationError}</div>}
                    
                    <div className="space-y-4 pb-4">
                        {filteredParcels.length > 0 ? (
                            filteredParcels.map(p => <ParcelCard key={p.id} parcel={p} />)
                        ) : (
                            <p className="text-center text-content-muted py-8">No tasks found for the current filter.</p>
                        )}
                    </div>
                </div>
            </main>

            <Modal isOpen={!!selectedParcel} onClose={handleCloseModal} title={`Update Status for ${selectedParcel?.trackingNumber}`}>
                {selectedParcel && (
                    <form onSubmit={handleUpdateStatus} className="space-y-3">
                        <div><FormLabel htmlFor="newStatus">New Status</FormLabel><FormSelect id="newStatus" value={newStatus} onChange={e => setNewStatus(e.target.value as ParcelStatus)}>{getAvailableStatuses(selectedParcel).map(s => <option key={s} value={s}>{s}</option>)}</FormSelect></div>
                        {newStatus === ParcelStatus.DELIVERY_FAILED && (<>
                            <div><FormLabel htmlFor="failedAttemptReason">Reason for Failure</FormLabel><FormSelect id="failedAttemptReason" value={failedAttemptReason} onChange={e => setFailedAttemptReason(e.target.value)} required><option value="">Select a reason</option>{FAILED_ATTEMPT_REASONS.map(reason => <option key={reason} value={reason}>{reason}</option>)}</FormSelect></div>
                            <div><FormLabel>Proof of Attempt (Photo)</FormLabel><Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2"><CameraIcon className="w-5 h-5"/> {imagePreview ? "Change Photo" : "Take Photo"}</Button><input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} className="hidden" required/>{imagePreview && <img src={imagePreview} alt="Proof of attempt" className="mt-4 rounded-lg max-h-48 w-auto mx-auto"/>}</div>
                        </>)}
                        <div className="flex justify-end gap-2 pt-3"><Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button><Button type="submit">Confirm Update</Button></div>
                    </form>
                )}
            </Modal>
            
            <Modal isOpen={isScannerOpen} onClose={handleCloseScannerModal} title="Scan Parcel Barcode">
                <div id={scanRegionId} className="w-full border border-dashed border-border rounded-lg bg-surface min-h-[250px] flex items-center justify-center text-content-muted">Camera will appear here</div>
                {scanError && <div className="mt-4 p-3 rounded-md text-sm text-center bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300">{scanError}</div>}
                <div className="mt-4 flex justify-end"><Button variant="secondary" onClick={handleCloseScannerModal}>Cancel</Button></div>
            </Modal>
        </div>
    );
};
export default DriverApp;