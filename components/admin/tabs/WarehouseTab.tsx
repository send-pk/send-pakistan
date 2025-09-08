import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useData } from '../../../context/DataContext';
import { Parcel, ParcelStatus, User, UserRole } from '../../../types';
import { Card } from '../../shared/Card';
import { TruckIcon } from '../../icons/TruckIcon';
import { Button } from '../../shared/Button';
import { Modal } from '../../shared/Modal';
import { StatCard } from '../shared/StatCards';
import { BuildingOfficeIcon } from '../../icons/BuildingOfficeIcon';
import { CameraIcon } from '../../icons/CameraIcon';
import { ScanSuccessFeedback } from '../../shared/ScanSuccessFeedback';
import { DELIVERY_ZONES } from '../../../constants';

declare var Html5Qrcode: any;

const FormSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${props.className}`} />;
const FormLabel = ({ children, htmlFor }: { children: React.ReactNode, htmlFor?: string }) => <label htmlFor={htmlFor} className="block mb-2 text-sm text-content-secondary font-medium">{children}</label>;

const getValidWarehouseStatuses = (parcel: Parcel | null): ParcelStatus[] => {
    if (!parcel) return [];
    switch (parcel.status) {
        case ParcelStatus.PICKED_UP: return [ParcelStatus.AT_HUB];
        case ParcelStatus.AT_HUB: return [ParcelStatus.OUT_FOR_DELIVERY];
        case ParcelStatus.DELIVERY_FAILED:
        case ParcelStatus.CUSTOMER_REFUSED:
            return [ParcelStatus.PENDING_DELIVERY];
        case ParcelStatus.PENDING_RETURN: return [ParcelStatus.OUT_FOR_RETURN];
        default: return [];
    }
};

interface WarehouseTabProps {
    user: User;
}

export const WarehouseTab: React.FC<WarehouseTabProps> = ({ user }) => {
    const { parcels, users, updateParcelStatus } = useData();
    const [scannedParcel, setScannedParcel] = useState<Parcel | null>(null);
    const [newStatus, setNewStatus] = useState<ParcelStatus | ''>('');
    const [selectedZone, setSelectedZone] = useState<string>('');
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');

    const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const scannerRef = useRef<any>(null);
    const processingScan = useRef(false);
    const scanRegionId = "warehouse-scan-region";
    const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);

    const parcelsRef = useRef(parcels);
    useEffect(() => {
        parcelsRef.current = parcels;
    }, [parcels]);

    const stats = useMemo(() => {
        const inbound = parcels.filter(p => p.status === ParcelStatus.PICKED_UP).length;
        const atWarehouseParcels = parcels.filter(p => [ParcelStatus.AT_HUB, ParcelStatus.PENDING_DELIVERY, ParcelStatus.PENDING_RETURN].includes(p.status));
        return { inbound, atWarehouse: atWarehouseParcels.length };
    }, [parcels]);

    const availableDrivers = useMemo(() => {
        if (!scannedParcel?.deliveryZone) return [];
        return users.filter(u => 
            u.role === UserRole.DRIVER && 
            u.status === 'ACTIVE' && 
            u.deliveryZones?.includes(scannedParcel.deliveryZone!)
        );
    }, [users, scannedParcel]);
    
    const handleCloseScannerModal = useCallback(() => {
        setIsScannerModalOpen(false);
        setScanError(null);
    }, []);

    const onScanSuccess = useCallback((decodedText: string) => {
        if (processingScan.current) return;
        processingScan.current = true;
        
        try {
            const foundParcel = parcelsRef.current.find(p => p.trackingNumber.toLowerCase() === decodedText.toLowerCase());
            if (foundParcel) {
                const validNextSteps = getValidWarehouseStatuses(foundParcel);
                if (validNextSteps.length > 0) {
                    setShowSuccessFeedback(true);
                    handleCloseScannerModal(); 
                    setScannedParcel(foundParcel);
                    setNewStatus(validNextSteps[0]);
                    setSelectedZone(foundParcel.deliveryZone || '');
                    setSelectedDriverId(''); // Reset driver selection
                } else {
                    setScanError(`Invalid Scan: Parcel status (${foundParcel.status}) cannot be updated at the warehouse.`);
                }
            } else {
                setScanError("Parcel not found in the system.");
            }
        } finally {
            processingScan.current = false;
        }
    }, [handleCloseScannerModal]);

    useEffect(() => {
        if (!isScannerModalOpen) {
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
                    () => {} // onScanFailure
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
    }, [isScannerModalOpen, onScanSuccess, handleCloseScannerModal]);
    
    const handleModalClose = () => {
        setScannedParcel(null);
        setNewStatus('');
        setSelectedZone('');
        setSelectedDriverId('');
    };

    const handleUpdateSubmit = () => {
        if (scannedParcel && newStatus) {
            if(newStatus === ParcelStatus.AT_HUB && !selectedZone) {
                alert('Please assign a delivery zone.');
                return;
            }
            if(newStatus === ParcelStatus.OUT_FOR_DELIVERY && !selectedDriverId) {
                alert('Please assign a delivery driver.');
                return;
            }
            const details = {
                deliveryZone: newStatus === ParcelStatus.AT_HUB ? selectedZone : undefined,
                driverId: newStatus === ParcelStatus.OUT_FOR_DELIVERY ? selectedDriverId : undefined
            };
            updateParcelStatus(scannedParcel.id, newStatus, user, details);
            handleModalClose();
        }
    };

    return (
        <div className="space-y-6">
            <ScanSuccessFeedback show={showSuccessFeedback} onEnd={() => setShowSuccessFeedback(false)} />
            <h2 className="text-2xl font-bold text-content-primary">Warehouse Operations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Total Inbound" value={stats.inbound} icon={TruckIcon} onClick={() => {}} colorClass="text-blue-500" />
                <StatCard title="Total At Warehouse" value={stats.atWarehouse} icon={BuildingOfficeIcon} onClick={() => {}} colorClass="text-sky-500" />
            </div>
            <Card className="text-center">
                <h2 className="text-xl font-bold mb-2">Warehouse Scanner</h2>
                <p className="text-content-secondary mb-4">Scan parcels to check them in or dispatch them for delivery.</p>
                <Button onClick={() => setIsScannerModalOpen(true)} className="inline-flex items-center gap-2">
                    <CameraIcon className="w-5 h-5" />
                    Open Scanner
                </Button>
            </Card>

            <Modal isOpen={isScannerModalOpen} onClose={handleCloseScannerModal} title="Scan Parcel Barcode">
                <div id={scanRegionId} className="w-full border border-dashed border-border rounded-lg bg-surface min-h-[250px] flex items-center justify-center text-content-muted">
                    Camera will appear here
                </div>
                {scanError && (
                    <div className="mt-4 p-3 rounded-md text-sm text-center bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300">
                        {scanError}
                    </div>
                )}
                <div className="mt-4 flex justify-end">
                    <Button variant="secondary" onClick={handleCloseScannerModal}>Cancel</Button>
                </div>
            </Modal>

            <Modal isOpen={!!scannedParcel} onClose={handleModalClose} title={`Update Parcel ${scannedParcel?.trackingNumber}`}>
                {scannedParcel && (
                    <div className="space-y-4">
                        <div>
                            <p><strong>Recipient:</strong> {scannedParcel.recipientName}</p>
                            <p><strong>Address:</strong> {scannedParcel.recipientAddress}</p>
                            <p><strong>Current Status:</strong> {scannedParcel.status}</p>
                        </div>
                        <div>
                            <FormLabel htmlFor="newStatus">Select New Status</FormLabel>
                            <FormSelect id="newStatus" value={newStatus} onChange={e => setNewStatus(e.target.value as ParcelStatus)}>
                                {getValidWarehouseStatuses(scannedParcel).map(s => <option key={s} value={s}>{s}</option>)}
                            </FormSelect>
                        </div>

                        {newStatus === ParcelStatus.AT_HUB && (
                             <div>
                                <FormLabel htmlFor="deliveryZone">Assign Delivery Zone</FormLabel>
                                <FormSelect id="deliveryZone" value={selectedZone} onChange={e => setSelectedZone(e.target.value)} required>
                                    <option value="">Select a zone</option>
                                    {DELIVERY_ZONES.map(zone => <option key={zone} value={zone}>{zone}</option>)}
                                </FormSelect>
                            </div>
                        )}

                        {newStatus === ParcelStatus.OUT_FOR_DELIVERY && (
                            <div>
                                <FormLabel htmlFor="deliveryDriver">Assign Delivery Driver</FormLabel>
                                <FormSelect id="deliveryDriver" value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)} required>
                                    <option value="">Select a driver for {scannedParcel.deliveryZone}</option>
                                    {availableDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </FormSelect>
                                {availableDrivers.length === 0 && <p className="text-xs text-red-500 mt-1">No active drivers found for this parcel's zone.</p>}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="secondary" onClick={handleModalClose}>Cancel</Button>
                            <Button onClick={handleUpdateSubmit}>Confirm Update</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}