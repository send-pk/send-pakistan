import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { Parcel, User, ParcelStatus, UserRole, Invoice, DataContextType, ParcelHistoryEvent, ReconciliationDetails, DutyLogEvent, Item, SalaryPayment } from '../types';
import { PARCELS, USERS } from '../constants';

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [parcels, setParcels] = useState<Parcel[]>(PARCELS);
    const [users, setUsers] = useState<User[]>(USERS);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const updateParcelStatus = useCallback(async (parcelId: string, status: ParcelStatus, currentUser?: User, details?: { reason?: string; proof?: string; deliveryZone?: string; driverId?: string; weight?: number; }) => {
        setParcels(currentParcels => {
            const newParcels = [...currentParcels];
            const mainParcelIndex = newParcels.findIndex(p => p.id === parcelId);
            if (mainParcelIndex === -1) return currentParcels;

            const mainParcel = newParcels[mainParcelIndex];

            if (status === ParcelStatus.DELIVERED_EXCHANGE_COMPLETE) {
                const deliveredHistoryEvent: ParcelHistoryEvent = {
                    status: ParcelStatus.DELIVERED,
                    createdAt: new Date().toISOString(),
                    updatedBy: currentUser?.name || 'System',
                    notes: 'Exchange outbound delivered.',
                };
                newParcels[mainParcelIndex] = { ...mainParcel, status: ParcelStatus.DELIVERED, updatedAt: new Date().toISOString(), history: [...mainParcel.history, deliveredHistoryEvent] };
                
                if (mainParcel.linkedParcelId) {
                    const linkedParcelIndex = newParcels.findIndex(p => p.id === mainParcel.linkedParcelId);
                    if (linkedParcelIndex !== -1) {
                        const linkedParcel = newParcels[linkedParcelIndex];
                        const pickedUpHistoryEvent: ParcelHistoryEvent = {
                            status: ParcelStatus.PICKED_UP,
                            createdAt: new Date().toISOString(),
                            updatedBy: currentUser?.name || 'System',
                            notes: 'Exchange return collected.',
                        };
                        newParcels[linkedParcelIndex] = { ...linkedParcel, status: ParcelStatus.PICKED_UP, updatedAt: new Date().toISOString(), history: [...linkedParcel.history, pickedUpHistoryEvent] };
                    }
                }
            } else {
                const isNowDelivered = status === ParcelStatus.DELIVERED;
                const updateData: Partial<Parcel> = {
                    status,
                    updatedAt: new Date().toISOString(),
                    isCodReconciled: isNowDelivered ? false : mainParcel.isCodReconciled,
                    deliveryZone: details?.deliveryZone || mainParcel.deliveryZone,
                };
                
                if (details?.weight !== undefined) {
                    updateData.weight = details.weight;
                }
                
                const notes: string[] = [];
                if (details?.reason) notes.push(`Reason: ${details.reason}`);
                if (details?.deliveryZone) notes.push(`Assigned to Delivery Zone: ${details.deliveryZone}`);
                if (details?.weight !== undefined && details.weight !== mainParcel.weight) {
                    notes.push(`Weight updated from ${mainParcel.weight.toFixed(1)}kg to ${details.weight.toFixed(1)}kg.`);
                }
                
                if (status === ParcelStatus.OUT_FOR_DELIVERY && details?.driverId) {
                    updateData.deliveryDriverId = details.driverId;
                    const driver = users.find(u => u.id === details.driverId);
                    notes.push(`Dispatched and assigned to driver: ${driver?.name || 'Unknown'}.`);
                }

                const newHistoryEvent: ParcelHistoryEvent = {
                    status: status,
                    createdAt: new Date().toISOString(),
                    updatedBy: currentUser?.name || 'System',
                    notes: notes.join(' ') || undefined,
                };

                if (status === ParcelStatus.DELIVERY_FAILED) {
                    updateData.failedAttemptReason = details?.reason;
                    newHistoryEvent.proofOfAttempt = details?.proof;
                } else {
                    updateData.failedAttemptReason = undefined;
                }


                if ([ParcelStatus.PENDING_DELIVERY, ParcelStatus.DELIVERED, ParcelStatus.RETURNED].includes(status)) {
                    updateData.deliveryDriverId = undefined;
                }
                
                if (status === ParcelStatus.PENDING_RETURN) {
                    const brand = users.find(u => u.id === mainParcel.brandId);
                    const defaultPickupLocation = brand?.pickupLocations?.[0];
                    updateData.pickupDriverId = defaultPickupLocation?.assignedDriverId;
                    updateData.deliveryDriverId = undefined;
                }


                newParcels[mainParcelIndex] = { ...mainParcel, ...updateData, history: [...mainParcel.history, newHistoryEvent] };
            }
            return newParcels;
        });
    }, [users]);
    
    const updateMultipleParcelStatuses = useCallback(async (parcelIds: string[], status: ParcelStatus, currentUser: User, details?: { adminRemark?: string }) => {
        setParcels(currentParcels => {
            return currentParcels.map(p => {
                if (parcelIds.includes(p.id)) {
                    const newHistoryEvent: ParcelHistoryEvent = {
                        status: status,
                        createdAt: new Date().toISOString(),
                        updatedBy: currentUser.name,
                        notes: details?.adminRemark || `Status updated by ${currentUser.name}.`
                    };
                    
                    const updatedParcel: Parcel = { 
                        ...p, 
                        status, 
                        updatedAt: new Date().toISOString(),
                        history: [...p.history, newHistoryEvent] 
                    };
                    
                    return updatedParcel;
                }
                return p;
            });
        });
    }, []);

    const bookNewParcel = useCallback(async (newParcelData: Omit<Parcel, 'id' | 'trackingNumber' | 'createdAt' | 'updatedAt' | 'status' | 'pickupDriverId' | 'deliveryDriverId' | 'deliveryCharge' | 'tax' | 'isCodReconciled' | 'invoiceId' | 'failedAttemptReason' | 'proofOfAttempt' | 'history' | 'returnItemDetails' | 'pickupAddress'> & { pickupLocationId: string }): Promise<Parcel | null> => {
        const brand = users.find(u => u.id === newParcelData.brandId);
        if (!brand) return null;
        
        const pickupLocation = brand.pickupLocations?.find(loc => loc.id === newParcelData.pickupLocationId);
        if (!pickupLocation) {
            console.error("Selected pickup location not found for the brand.");
            return null;
        }

        // Calculate delivery charge based on brand's tier-based settings
        const weightKey = String(newParcelData.weight);
        const chargeForWeight = brand?.weightCharges?.[weightKey] ?? 100; // Default to 100 if tier not found
        const fuelSurchargePercent = brand?.fuelSurcharge ?? 10;
        
        const fuelCharge = chargeForWeight * (fuelSurchargePercent / 100);
        const finalDeliveryCharge = chargeForWeight + fuelCharge;
        const tax = finalDeliveryCharge * 0.16;
        
        const trackingNumber = `SD${Date.now().toString().slice(-6)}`;
        
        const parcelToAdd: Parcel = {
            ...newParcelData,
            id: `p${Date.now()}`,
            trackingNumber,
            status: ParcelStatus.BOOKED,
            pickupDriverId: pickupLocation.assignedDriverId,
            pickupAddress: pickupLocation.address,
            deliveryDriverId: undefined,
            deliveryCharge: finalDeliveryCharge, 
            tax, 
            isCodReconciled: newParcelData.codAmount > 0 ? false : true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            history: [{
                status: ParcelStatus.BOOKED,
                createdAt: new Date().toISOString(),
                updatedBy: newParcelData.brandName,
                notes: `Parcel booked from: ${pickupLocation.address}`
            }],
        };
        
        setParcels(prev => [...prev, parcelToAdd]);
        return parcelToAdd;
    }, [users]);
    
    const initiateExchange = useCallback(async (originalParcelId: string, newOutboundDetails: { orderId: string; itemDetails: string; codAmount: number; deliveryInstructions?: string; }, returnItemDetails: Item[]): Promise<{ outboundParcel: Parcel; returnParcel: Parcel; } | null> => {
        const originalParcel = parcels.find(p => p.id === originalParcelId);
        if (!originalParcel) return null;

        const brand = users.find(u => u.id === originalParcel.brandId);
        // Use a default weight and find its charge for exchange parcels
        const defaultWeight = 1.0;
        const weightKey = String(defaultWeight);
        const chargeForWeight = brand?.weightCharges?.[weightKey] ?? 100;
        const fuelSurchargePercent = brand?.fuelSurcharge ?? 10;
        const fuelCharge = chargeForWeight * (fuelSurchargePercent / 100);
        const deliveryCharge = chargeForWeight + fuelCharge;
        const tax = deliveryCharge * 0.16;

        const defaultPickupLocation = brand?.pickupLocations?.[0];
        
        const now = new Date().toISOString();
        const outboundId = `p${Date.now()}`;
        const returnId = `p${Date.now() + 1}`;
        const sharedTrackingNumber = `SDEX${outboundId.slice(-6).toUpperCase()}`;

        const outboundParcel: Parcel = {
            id: outboundId,
            brandId: originalParcel.brandId, brandName: originalParcel.brandName, recipientName: originalParcel.recipientName,
            recipientAddress: originalParcel.recipientAddress, recipientPhone: originalParcel.recipientPhone,
            status: ParcelStatus.BOOKED, pickupDriverId: defaultPickupLocation?.assignedDriverId,
            pickupAddress: defaultPickupLocation?.address,
            deliveryDriverId: undefined,
            weight: defaultWeight,
            isCodReconciled: newOutboundDetails.codAmount > 0 ? false : true, createdAt: now, updatedAt: now,
            isExchange: true, orderId: newOutboundDetails.orderId, itemDetails: newOutboundDetails.itemDetails,
            codAmount: newOutboundDetails.codAmount, deliveryCharge, tax,
            deliveryInstructions: newOutboundDetails.deliveryInstructions, linkedParcelId: returnId,
            trackingNumber: sharedTrackingNumber,
            history: [{
                status: ParcelStatus.BOOKED,
                createdAt: now,
                updatedBy: originalParcel.brandName,
                notes: `Outbound exchange parcel booked for order ${originalParcel.orderId}.`
            }],
        };

        const returnParcel: Parcel = {
            id: returnId,
            orderId: `${originalParcel.orderId}-EX-RTN`, brandId: originalParcel.brandId, brandName: originalParcel.brandName, 
            recipientName: originalParcel.recipientName, recipientAddress: originalParcel.recipientAddress, recipientPhone: originalParcel.recipientPhone,
            status: ParcelStatus.PENDING_EXCHANGE_PICKUP, pickupDriverId: undefined,
            deliveryDriverId: undefined,
            codAmount: 0, weight: 1.0, deliveryCharge: 0, tax: 0, createdAt: now, updatedAt: now,
            itemDetails: `Return items for order ${originalParcel.orderId}`, 
            returnItemDetails: returnItemDetails,
            isCodReconciled: true, isExchange: true, linkedParcelId: outboundId,
            trackingNumber: sharedTrackingNumber, // Use the same tracking number
            history: [{
                status: ParcelStatus.PENDING_EXCHANGE_PICKUP,
                createdAt: now,
                updatedBy: originalParcel.brandName,
                notes: `Return parcel created for exchange against order ${originalParcel.orderId}.`
            }],
        };
        
        setParcels(prev => [...prev, outboundParcel, returnParcel]);
        return { outboundParcel, returnParcel };
    }, [parcels, users]);

    const reassignDriverJobs = useCallback(async (fromDriverId: string, toDriverId: string, currentUser: User, jobType: 'pickup' | 'delivery') => {
        setParcels(currentParcels => {
            const fromDriver = users.find(u => u.id === fromDriverId);
            const toDriver = users.find(u => u.id === toDriverId);
            if (!fromDriver || !toDriver) return currentParcels;

            const activePickupStatuses = [ParcelStatus.BOOKED, ParcelStatus.OUT_FOR_RETURN];
            const activeDeliveryStatuses = [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED, ParcelStatus.PENDING_DELIVERY];

            return currentParcels.map(p => {
                let updatedParcel = { ...p };
                let wasReassigned = false;
                let historyNote = '';

                if (jobType === 'pickup' && p.pickupDriverId === fromDriverId && activePickupStatuses.includes(p.status)) {
                    updatedParcel.pickupDriverId = toDriverId;
                    wasReassigned = true;
                    historyNote = `Pickup job reassigned from ${fromDriver.name} to ${toDriver.name} by admin.`;
                }
                
                if (jobType === 'delivery' && p.deliveryDriverId === fromDriverId && activeDeliveryStatuses.includes(p.status)) {
                    updatedParcel.deliveryDriverId = toDriverId;
                    wasReassigned = true;
                    historyNote = `Delivery job reassigned from ${fromDriver.name} to ${toDriver.name} by admin.`;
                }

                if (wasReassigned) {
                    const newHistoryEvent: ParcelHistoryEvent = {
                        status: p.status,
                        createdAt: new Date().toISOString(),
                        updatedBy: currentUser.name,
                        notes: historyNote
                    };
                    updatedParcel.history = [...p.history, newHistoryEvent];
                    updatedParcel.updatedAt = new Date().toISOString();
                }

                return updatedParcel;
            });
        });
    }, [users]);

    const addNewBrand = useCallback(async (brandData: Omit<User, 'id' | 'role' | 'status'>) => {
        const newBrand: User = { ...brandData, id: `brand-${Date.now()}`, role: UserRole.BRAND, status: 'ACTIVE' };
        setUsers(prev => [...prev, newBrand]);
    }, []);

    const updateBrand = useCallback(async (brandId: string, updatedData: Partial<Omit<User, 'id' | 'role'>>) => {
        const cleanData: any = { ...updatedData };
        // Clean up unassigned drivers from pickup locations before saving
        if (cleanData.pickupLocations) {
            cleanData.pickupLocations = cleanData.pickupLocations.map((loc: any) => {
                if (loc.assignedDriverId === 'unassigned') {
                    return { ...loc, assignedDriverId: undefined };
                }
                return loc;
            });
        }
        setUsers(prev => prev.map(u => u.id === brandId ? { ...u, ...cleanData } : u));
    }, []);
    
    const addNewDriver = useCallback(async (driverData: Omit<User, 'id' | 'role' | 'status'>) => {
        const newDriver: User = { ...driverData, id: `driver-${Date.now()}`, role: UserRole.DRIVER, status: 'ACTIVE', dutyLog: [] };
        setUsers(prev => [...prev, newDriver]);
    }, []);

    const updateDriver = useCallback(async (driverId: string, updatedData: Partial<Omit<User, 'id' | 'role'>>) => {
        setUsers(prev => prev.map(u => u.id === driverId ? { ...u, ...updatedData } : u));
    }, []);
    
    const addNewSalesManager = useCallback(async (managerData: Omit<User, 'id' | 'role' | 'status'>) => {
        const newManager: User = { ...managerData, id: `sm-${Date.now()}`, role: UserRole.SALES_MANAGER, status: 'ACTIVE' };
        setUsers(prev => [...prev, newManager]);
    }, []);

    const updateSalesManager = useCallback(async (managerId: string, updatedData: Partial<Omit<User, 'id' | 'role'>>) => {
        setUsers(prev => prev.map(u => u.id === managerId ? { ...u, ...updatedData } : u));
    }, []);

    const addNewDirectSales = useCallback(async (salesData: Omit<User, 'id' | 'role' | 'status'>) => {
        const newSales: User = { ...salesData, id: `ds-${Date.now()}`, role: UserRole.DIRECT_SALES, status: 'ACTIVE' };
        setUsers(prev => [...prev, newSales]);
    }, []);

    const updateDirectSales = useCallback(async (salesId: string, updatedData: Partial<Omit<User, 'id' | 'role'>>) => {
        setUsers(prev => prev.map(u => u.id === salesId ? { ...u, ...updatedData } : u));
    }, []);

    const toggleUserStatus = useCallback(async (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        
        setUsers(prevUsers =>
            prevUsers.map(u => (u.id === userId ? { ...u, status: newStatus } : u))
        );

        // If deactivating a driver, unassign their active parcels
        if (user.role === UserRole.DRIVER && newStatus === 'INACTIVE') {
            setParcels(prevParcels =>
                prevParcels.map(p => {
                    const newP = { ...p };
                    let updated = false;
                    if (p.pickupDriverId === userId && [ParcelStatus.BOOKED, ParcelStatus.OUT_FOR_RETURN].includes(p.status)) {
                        newP.pickupDriverId = undefined;
                        updated = true;
                    }
                    if (p.deliveryDriverId === userId && [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.PENDING_DELIVERY, ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED].includes(p.status)) {
                        newP.deliveryDriverId = undefined;
                        newP.status = ParcelStatus.AT_HUB;
                        updated = true;
                    }
                    if (updated) {
                         newP.history = [...p.history, {
                            status: newP.status,
                            createdAt: new Date().toISOString(),
                            updatedBy: 'System',
                            notes: `Driver ${user.name} deactivated, parcel unassigned.`
                        }];
                    }
                    return updated ? newP : p;
                })
            );
        }
    }, [users]);

    const toggleDriverDutyStatus = useCallback(async (driverId: string) => {
        setUsers(prevUsers => prevUsers.map(user => {
            if (user.id === driverId && user.role === UserRole.DRIVER) {
                const newOnDutyStatus = !user.onDuty;
                const newLogEntry: DutyLogEvent = {
                    status: newOnDutyStatus ? 'ON_DUTY' : 'OFF_DUTY',
                    timestamp: new Date().toISOString()
                };
                const newDutyLog = [...(user.dutyLog || []), newLogEntry];
                return { ...user, onDuty: newOnDutyStatus, dutyLog: newDutyLog };
            }
            return user;
        }));
    }, []);
    
    const deleteParcel = useCallback(async (parcelIds: string[]) => {
        setParcels(prev => prev.map(p => {
            if (parcelIds.includes(p.id) && p.status === ParcelStatus.BOOKED) {
                return { ...p, status: ParcelStatus.CANCELED, updatedAt: new Date().toISOString() };
            }
            return p;
        }));
    }, []);

    const generateInvoiceForPayout = useCallback(async (brandId: string, parcelIds: string[]) => {
        const brand = users.find(u => u.id === brandId);
        if (!brand) return;

        const parcelsToInvoice = parcels.filter(p => parcelIds.includes(p.id));
        const totalCOD = parcelsToInvoice.reduce((sum, p) => sum + p.codAmount, 0);
        const totalCharges = parcelsToInvoice.reduce((sum, p) => sum + p.deliveryCharge, 0);
        const totalTax = parcelsToInvoice.reduce((sum, p) => sum + p.tax, 0);

        const newInvoice: Invoice = {
          id: `inv-${Date.now()}`,
          brandId: brand.id, brandName: brand.name, generatedAt: new Date().toISOString(),
          parcelIds, totalCOD, totalCharges, totalTax, netPayout: totalCOD - totalCharges - totalTax, status: 'PENDING',
        };
        
        setInvoices(prev => [...prev, newInvoice]);
        setParcels(prev => prev.map(p => parcelIds.includes(p.id) ? { ...p, invoiceId: newInvoice.id } : p));
    }, [users, parcels]);

    const markInvoiceAsPaid = useCallback(async (invoiceId: string, transactionId: string) => {
        setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'PAID', transactionId, paidAt: new Date().toISOString() } : inv));
    }, []);

    const reconcileDriverCod = useCallback(async (driverId: string, parcelIds: string[], details: ReconciliationDetails) => {
        let notes = `COD Reconciled. Method: ${details.method}.`;
        if (details.method === 'Mixed' || details.method === 'Cash') {
            notes += `\nCash Amount: PKR ${details.cashAmount?.toLocaleString()}`;
        }
        if (details.method === 'Mixed' || details.method === 'Online') {
            details.transfers?.forEach(t => {
                notes += `\nOnline Transfer: PKR ${t.amount.toLocaleString()}`;
                if (t.transactionId) {
                    notes += ` (Ref: ${t.transactionId})`;
                }
            });
        }

        setParcels(prev => prev.map(p => {
            if (parcelIds.includes(p.id)) {
                const newHistoryEvent: ParcelHistoryEvent = {
                    status: p.status, // Keep current status, just add a note
                    createdAt: new Date().toISOString(),
                    updatedBy: 'Admin', // Assume admin is reconciling
                    notes: notes
                };
                return { ...p, isCodReconciled: true, history: [...p.history, newHistoryEvent] };
            }
            return p;
        }));
    }, []);

    const markSalaryAsPaid = useCallback(async (paymentData: Omit<SalaryPayment, 'id' | 'status' | 'paidAt'>) => {
        setSalaryPayments(prev => {
            const existingIndex = prev.findIndex(p => 
                p.userId === paymentData.userId && 
                p.periodStartDate === paymentData.periodStartDate && 
                p.periodEndDate === paymentData.periodEndDate
            );

            if (existingIndex > -1) {
                // This case should ideally not happen if UI only allows paying unpaid salaries, but it's safe to handle.
                const updatedPayments = [...prev];
                updatedPayments[existingIndex] = {
                    ...updatedPayments[existingIndex],
                    ...paymentData,
                    status: 'PAID',
                    paidAt: new Date().toISOString(),
                };
                return updatedPayments;
            } else {
                const newPayment: SalaryPayment = {
                    ...paymentData,
                    id: `sal-${Date.now()}`,
                    status: 'PAID',
                    paidAt: new Date().toISOString(),
                };
                return [...prev, newPayment];
            }
        });
    }, []);

    const addBrandRemark = useCallback(async (parcelId: string, remark: string) => {
        setParcels(prev => prev.map(p => p.id === parcelId ? { ...p, brandRemark: remark, updatedAt: new Date().toISOString() } : p));
    }, []);
    
    const addShipperAdvice = useCallback(async (parcelId: string, advice: string) => {
        setParcels(prev => prev.map(p => p.id === parcelId ? { ...p, shipperAdvice: advice, updatedAt: new Date().toISOString() } : p));
    }, []);

    const manuallyAssignDriver = useCallback(async (parcelId: string, driverId: string | null, type: 'pickup' | 'delivery') => {
        setParcels(prev => prev.map(p => {
            if (p.id === parcelId) {
                const update: Partial<Parcel> = { updatedAt: new Date().toISOString() };
                if (type === 'pickup') update.pickupDriverId = driverId || undefined;
                else update.deliveryDriverId = driverId || undefined;
                return { ...p, ...update };
            }
            return p;
        }));
    }, []);

    const updateDriverLocation = useCallback(async (driverId: string, location: { lat: number, lng: number }) => {
        setUsers(prev => prev.map(u => u.id === driverId ? { ...u, currentLocation: location } : u));
    }, []);

    const value = useMemo(() => ({
        parcels, users, invoices, salaryPayments, loading,
        updateParcelStatus, bookNewParcel, addNewBrand, updateBrand, 
        addNewDriver, updateDriver, deleteParcel,
        generateInvoiceForPayout, markInvoiceAsPaid, reconcileDriverCod,
        addBrandRemark, updateDriverLocation, updateMultipleParcelStatuses,
        addShipperAdvice, manuallyAssignDriver, initiateExchange, reassignDriverJobs,
        toggleDriverDutyStatus, toggleUserStatus,
        addNewSalesManager, updateSalesManager,
        addNewDirectSales, updateDirectSales,
        markSalaryAsPaid,
    }), [
        parcels, users, invoices, salaryPayments, loading,
        updateParcelStatus, bookNewParcel, addNewBrand, updateBrand, 
        addNewDriver, updateDriver, deleteParcel,
        generateInvoiceForPayout, markInvoiceAsPaid, reconcileDriverCod,
        addBrandRemark, updateDriverLocation, updateMultipleParcelStatuses,
        addShipperAdvice, manuallyAssignDriver, initiateExchange, reassignDriverJobs,
        toggleDriverDutyStatus, toggleUserStatus,
        addNewSalesManager, updateSalesManager,
        addNewDirectSales, updateDirectSales,
        markSalaryAsPaid,
    ]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};