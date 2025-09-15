import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { Parcel, User, ParcelStatus, UserRole, Invoice, DataContextType, ParcelHistoryEvent, ReconciliationDetails, DutyLogEvent, Item, SalaryPayment } from '../types';
import { supabase } from '../supabase';
import { PENDING_PARCEL_STATUSES } from '../constants';

// Case conversion helpers to map between JS camelCase and Postgres snake_case
const toCamel = (s: string): string => {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase().replace('-', '').replace('_', '');
  });
};
const isObject = (obj: any): boolean => obj === Object(obj) && !Array.isArray(obj) && typeof obj !== 'function';
const keysToCamel = (obj: any): any => {
  if (isObject(obj)) {
    const n: { [key: string]: any } = {};
    Object.keys(obj).forEach((k) => {
      n[toCamel(k)] = keysToCamel(obj[k]);
    });
    return n;
  } else if (Array.isArray(obj)) {
    return obj.map((i) => keysToCamel(i));
  }
  return obj;
};
const toSnake = (str: string): string => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const keysToSnake = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => keysToSnake(v));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((acc, key) => ({
            ...acc,
            [toSnake(key)]: keysToSnake(obj[key]),
        }), {});
    }
    return obj;
};


const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [parcels, setParcels] = useState<Parcel[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            if (!isMounted) return;
            setLoading(true);
            try {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const pendingStatuses = PENDING_PARCEL_STATUSES.map(s => `"${s}"`).join(',');

                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

                const [parcelsRes, usersRes, invoicesRes, salaryPaymentsRes] = await Promise.all([
                    supabase.from('parcels').select('*').or(`status.in.(${pendingStatuses}),updated_at.gte.${thirtyDaysAgo.toISOString()}`),
                    supabase.from('users').select('*'),
                    supabase.from('invoices').select('*').or(`status.eq.PENDING,created_at.gte.${ninetyDaysAgo.toISOString()}`),
                    supabase.from('salary_payments').select('*')
                ]);

                if (!isMounted) return;

                if (parcelsRes.error) {
                    console.error("Error fetching parcels:", parcelsRes.error.message);
                } else {
                    const camelCasedParcels = keysToCamel(parcelsRes.data || []) as Parcel[];
                    // If createdAt is missing from fetched data (due to DB schema), use updatedAt as a fallback.
                    // This ensures components that rely on a creation timestamp don't break.
                    setParcels(camelCasedParcels.map(p => ({
                        ...p,
                        createdAt: p.createdAt || p.updatedAt,
                    })));
                }
    
                if (usersRes.error) {
                    console.error("Error fetching users:", usersRes.error.message);
                } else {
                    setUsers(keysToCamel(usersRes.data || []));
                }
    
                if (invoicesRes.error) {
                    console.error("Error fetching invoices:", invoicesRes.error.message);
                } else {
                    setInvoices(keysToCamel(invoicesRes.data || []));
                }
    
                if (salaryPaymentsRes.error) {
                    console.error("Error fetching salary payments:", salaryPaymentsRes.error.message);
                } else {
                    setSalaryPayments(keysToCamel(salaryPaymentsRes.data || []));
                }

            } catch (error) {
                if (isMounted) console.error("A critical error occurred while fetching data from Supabase:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        
        fetchData();

        const handleParcelChange = (payload: any) => {
            switch(payload.eventType) {
                case 'INSERT': setParcels(current => [...current, keysToCamel(payload.new)]); break;
                case 'UPDATE': setParcels(current => current.map(p => p.id === payload.new.id ? keysToCamel(payload.new) : p)); break;
                case 'DELETE': setParcels(current => current.filter(p => p.id !== payload.old.id)); break;
                default: break;
            }
        };

        const handleUserChange = (payload: any) => {
             switch(payload.eventType) {
                case 'INSERT': setUsers(current => [...current, keysToCamel(payload.new)]); break;
                case 'UPDATE': setUsers(current => current.map(u => u.id === payload.new.id ? keysToCamel(payload.new) : u)); break;
                case 'DELETE': setUsers(current => current.filter(u => u.id !== payload.old.id)); break;
                default: break;
            }
        };

        const parcelsSubscription = supabase
            .channel('parcels-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'parcels' }, handleParcelChange)
            .subscribe();
            
        const usersSubscription = supabase
            .channel('users-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, handleUserChange)
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(parcelsSubscription);
            supabase.removeChannel(usersSubscription);
        };
    }, []);

    const updateParcelStatus = useCallback(async (parcelId: string, status: ParcelStatus, currentUser?: User, details?: { reason?: string; proof?: string; deliveryZone?: string; driverId?: string; weight?: number; }) => {
        const mainParcel = parcels.find(p => p.id === parcelId);
        if (!mainParcel) return;
        
        const handleError = (error: any, context: string) => console.error(`Error ${context}:`, error);

        if (status === ParcelStatus.DELIVERED_EXCHANGE_COMPLETE) {
            const deliveredHistoryEvent: ParcelHistoryEvent = { status: ParcelStatus.DELIVERED, createdAt: new Date().toISOString(), updatedBy: currentUser?.name || 'System', notes: 'Exchange outbound delivered.' };
            const mainUpdate = { status: ParcelStatus.DELIVERED, updatedAt: new Date().toISOString(), history: [...mainParcel.history, deliveredHistoryEvent] };
            
            const { error: mainError } = await supabase.from('parcels').update(keysToSnake(mainUpdate)).eq('id', parcelId);
            if (mainError) return handleError(mainError, 'updating main exchange parcel');
            
            // Local update will be handled by the real-time subscription

            if (mainParcel.linkedParcelId) {
                const linkedParcel = parcels.find(p => p.id === mainParcel.linkedParcelId);
                if (linkedParcel) {
                    const pickedUpHistoryEvent: ParcelHistoryEvent = { status: ParcelStatus.PICKED_UP, createdAt: new Date().toISOString(), updatedBy: currentUser?.name || 'System', notes: 'Exchange return collected.' };
                    const linkedUpdate = { status: ParcelStatus.PICKED_UP, updatedAt: new Date().toISOString(), history: [...linkedParcel.history, pickedUpHistoryEvent] };
                    
                    const { error: linkedError } = await supabase.from('parcels').update(keysToSnake(linkedUpdate)).eq('id', mainParcel.linkedParcelId);
                    if (linkedError) return handleError(linkedError, 'updating linked exchange parcel');
                    
                    // Local update will be handled by the real-time subscription
                }
            }
        } else {
            const isNowDelivered = status === ParcelStatus.DELIVERED;
            const updateData: Partial<Parcel> = { status, updatedAt: new Date().toISOString(), isCodReconciled: isNowDelivered ? false : mainParcel.isCodReconciled, deliveryZone: details?.deliveryZone || mainParcel.deliveryZone };
            
            if (details?.weight !== undefined) updateData.weight = details.weight;
            
            const notes: string[] = [];
            if (details?.reason) notes.push(`Reason: ${details.reason}`);
            if (details?.deliveryZone) notes.push(`Assigned to Delivery Zone: ${details.deliveryZone}`);
            if (details?.weight !== undefined && details.weight !== mainParcel.weight) notes.push(`Weight updated from ${mainParcel.weight.toFixed(1)}kg to ${details.weight.toFixed(1)}kg.`);
            
            if (status === ParcelStatus.OUT_FOR_DELIVERY && details?.driverId) {
                updateData.deliveryDriverId = details.driverId;
                const driver = users.find(u => u.id === details.driverId);
                notes.push(`Dispatched and assigned to driver: ${driver?.name || 'Unknown'}.`);
            }

            const newHistoryEvent: ParcelHistoryEvent = { status: status, createdAt: new Date().toISOString(), updatedBy: currentUser?.name || 'System', notes: notes.join(' ') || undefined };

            if (status === ParcelStatus.DELIVERY_FAILED) {
                updateData.failedAttemptReason = details?.reason;
                newHistoryEvent.proofOfAttempt = details?.proof;
            } else { updateData.failedAttemptReason = undefined; }

            if ([ParcelStatus.PENDING_DELIVERY, ParcelStatus.DELIVERED, ParcelStatus.RETURNED].includes(status)) updateData.deliveryDriverId = undefined;
            
            if (status === ParcelStatus.PENDING_RETURN) {
                const brand = users.find(u => u.id === mainParcel.brandId);
                const defaultPickupLocation = brand?.pickupLocations?.[0];
                updateData.pickupDriverId = defaultPickupLocation?.assignedDriverId;
                updateData.deliveryDriverId = undefined;
            }

            const finalUpdate = { ...mainParcel, ...updateData, history: [...mainParcel.history, newHistoryEvent] };
            const { error } = await supabase.from('parcels').update(keysToSnake(finalUpdate)).eq('id', parcelId);

            if (error) return handleError(error, 'updating parcel status');
            // Local update will be handled by the real-time subscription
        }
    }, [parcels, users]);
    
    const updateMultipleParcelStatuses = useCallback(async (parcelIds: string[], status: ParcelStatus, currentUser: User, details?: { adminRemark?: string }) => {
        const updates: any[] = [];
        const localUpdates: Parcel[] = [];

        parcels.forEach(p => {
            if (parcelIds.includes(p.id)) {
                const newHistoryEvent: ParcelHistoryEvent = { status, createdAt: new Date().toISOString(), updatedBy: currentUser.name, notes: details?.adminRemark || `Status updated by ${currentUser.name}.` };
                const updatedParcel: Parcel = { ...p, status, updatedAt: new Date().toISOString(), history: [...p.history, newHistoryEvent] };
                updates.push(keysToSnake(updatedParcel));
                localUpdates.push(updatedParcel);
            }
        });
        
        const { error } = await supabase.from('parcels').upsert(updates);
        if (error) return console.error('Error batch updating parcels:', error);

        // Local update will be handled by the real-time subscription
    }, [parcels]);

    const bookNewParcel = useCallback(async (newParcelData: Omit<Parcel, 'id' | 'trackingNumber' | 'createdAt' | 'updatedAt' | 'status' | 'pickupDriverId' | 'deliveryDriverId' | 'deliveryCharge' | 'tax' | 'isCodReconciled' | 'invoiceId' | 'failedAttemptReason' | 'proofOfAttempt' | 'history' | 'returnItemDetails' | 'pickupAddress'> & { pickupLocationId: string }): Promise<Parcel | null> => {
        const brand = users.find(u => u.id === newParcelData.brandId);
        if (!brand) return null;
        
        const pickupLocation = brand.pickupLocations?.find(loc => loc.id === newParcelData.pickupLocationId);
        if (!pickupLocation) return null;

        const weightKey = String(newParcelData.weight);
        const chargeForWeight = brand?.weightCharges?.[weightKey] ?? 100;
        const fuelSurchargePercent = brand?.fuelSurcharge ?? 10;
        const fuelCharge = chargeForWeight * (fuelSurchargePercent / 100);
        const finalDeliveryCharge = chargeForWeight + fuelCharge;
        const tax = finalDeliveryCharge * 0.16;
        const trackingNumber = `SD${Date.now().toString().slice(-6)}`;
        
        const parcelToAdd: Parcel = {
            id: crypto.randomUUID(),
            ...newParcelData,
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
            history: [{ status: ParcelStatus.BOOKED, createdAt: new Date().toISOString(), updatedBy: newParcelData.brandName, notes: `Parcel booked from: ${pickupLocation.address}` }],
        };
        
        const { data, error } = await supabase.from('parcels').insert(keysToSnake(parcelToAdd)).select().single();

        if(error || !data) {
             console.error('Error booking parcel:', error);
             return null;
        }

        // Local update will be handled by the real-time subscription
        return keysToCamel(data) as Parcel;
    }, [users]);
    
    const initiateExchange = useCallback(async (originalParcelId: string, newOutboundDetails: { orderId: string; itemDetails: string; codAmount: number; deliveryInstructions?: string; }, returnItemDetails: Item[]): Promise<{ outboundParcel: Parcel; returnParcel: Parcel; } | null> => {
        const originalParcel = parcels.find(p => p.id === originalParcelId);
        if (!originalParcel) return null;

        const brand = users.find(u => u.id === originalParcel.brandId);
        const defaultWeight = 1.0;
        const weightKey = String(defaultWeight);
        const chargeForWeight = brand?.weightCharges?.[weightKey] ?? 100;
        const fuelSurchargePercent = brand?.fuelSurcharge ?? 10;
        const fuelCharge = chargeForWeight * (fuelSurchargePercent / 100);
        const deliveryCharge = chargeForWeight + fuelCharge;
        const tax = deliveryCharge * 0.16;
        const defaultPickupLocation = brand?.pickupLocations?.[0];
        
        const now = new Date().toISOString();
        const sharedTrackingNumber = `SDEX${Date.now().toString().slice(-6).toUpperCase()}`;

        const outboundParcel: Parcel = { id: crypto.randomUUID(), brandId: originalParcel.brandId, brandName: originalParcel.brandName, recipientName: originalParcel.recipientName, recipientAddress: originalParcel.recipientAddress, recipientPhone: originalParcel.recipientPhone, status: ParcelStatus.BOOKED, pickupDriverId: defaultPickupLocation?.assignedDriverId, pickupAddress: defaultPickupLocation?.address, deliveryDriverId: undefined, weight: defaultWeight, isCodReconciled: newOutboundDetails.codAmount > 0 ? false : true, createdAt: now, updatedAt: now, isExchange: true, orderId: newOutboundDetails.orderId, itemDetails: newOutboundDetails.itemDetails, codAmount: newOutboundDetails.codAmount, deliveryCharge, tax, deliveryInstructions: newOutboundDetails.deliveryInstructions, trackingNumber: sharedTrackingNumber, history: [{ status: ParcelStatus.BOOKED, createdAt: now, updatedBy: originalParcel.brandName, notes: `Outbound exchange parcel booked for order ${originalParcel.orderId}.` }] };
        const returnParcel: Parcel = { id: crypto.randomUUID(), orderId: `${originalParcel.orderId}-EX-RTN`, brandId: originalParcel.brandId, brandName: originalParcel.brandName, recipientName: originalParcel.recipientName, recipientAddress: originalParcel.recipientAddress, recipientPhone: originalParcel.recipientPhone, status: ParcelStatus.PENDING_EXCHANGE_PICKUP, pickupDriverId: undefined, deliveryDriverId: undefined, codAmount: 0, weight: 1.0, deliveryCharge: 0, tax: 0, createdAt: now, updatedAt: now, itemDetails: `Return items for order ${originalParcel.orderId}`, returnItemDetails: returnItemDetails, isCodReconciled: true, isExchange: true, trackingNumber: sharedTrackingNumber, history: [{ status: ParcelStatus.PENDING_EXCHANGE_PICKUP, createdAt: now, updatedBy: originalParcel.brandName, notes: `Return parcel created for exchange against order ${originalParcel.orderId}.` }]};

        const { data: insertedParcels, error } = await supabase.from('parcels').insert([keysToSnake(outboundParcel), keysToSnake(returnParcel)]).select();
        
        if (error || !insertedParcels || insertedParcels.length !== 2) {
            console.error('Error initiating exchange:', error);
            return null;
        }

        const [newOutbound, newReturn] = keysToCamel(insertedParcels) as Parcel[];
        // Link them up
        const { error: linkError } = await supabase.from('parcels').upsert([
            { id: newOutbound.id, linked_parcel_id: newReturn.id },
            { id: newReturn.id, linked_parcel_id: newOutbound.id }
        ]);

        if (linkError) { console.error('Error linking exchange parcels:', linkError); /* Might need to delete them here */ return null; }

        newOutbound.linkedParcelId = newReturn.id;
        newReturn.linkedParcelId = newOutbound.id;

        // Local update will be handled by the real-time subscription
        return { outboundParcel: newOutbound, returnParcel: newReturn };
    }, [parcels, users]);

    const reassignDriverJobs = useCallback(async (fromDriverId: string, toDriverId: string, currentUser: User, jobType: 'pickup' | 'delivery') => {
        const fromDriver = users.find(u => u.id === fromDriverId);
        const toDriver = users.find(u => u.id === toDriverId);
        if (!fromDriver || !toDriver) return;

        const activePickupStatuses = [ParcelStatus.BOOKED, ParcelStatus.OUT_FOR_RETURN];
        const activeDeliveryStatuses = [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED, ParcelStatus.PENDING_DELIVERY];

        const parcelsToUpdate = parcels.filter(p => {
            return (jobType === 'pickup' && p.pickupDriverId === fromDriverId && activePickupStatuses.includes(p.status)) ||
                   (jobType === 'delivery' && p.deliveryDriverId === fromDriverId && activeDeliveryStatuses.includes(p.status));
        });

        if (parcelsToUpdate.length === 0) return;

        const historyNote = `${jobType.charAt(0).toUpperCase() + jobType.slice(1)} job reassigned from ${fromDriver.name} to ${toDriver.name} by admin.`;
        const newHistoryEvent: ParcelHistoryEvent = { status: parcelsToUpdate[0].status, createdAt: new Date().toISOString(), updatedBy: currentUser.name, notes: historyNote };
        
        const updates = parcelsToUpdate.map(p => ({
            id: p.id,
            [jobType === 'pickup' ? 'pickup_driver_id' : 'delivery_driver_id']: toDriverId,
            history: [...p.history, newHistoryEvent],
            updated_at: new Date().toISOString(),
        }));
        
        const { error } = await supabase.from('parcels').upsert(updates);
        if (error) return console.error('Error reassigning jobs:', error);

        // Local update will be handled by the real-time subscription
    }, [parcels, users]);

    const createUserWithProfile = async (email: string, password: string, role: UserRole, profileData: Omit<User, 'id' | 'role' | 'status' | 'email'>): Promise<User | null> => {
        // Check for existing username or email before anything else
        const { username } = profileData;
        const existingUser = users.find(u => 
            u.email.toLowerCase() === email.toLowerCase() || 
            (username && u.username && u.username.toLowerCase() === username.toLowerCase())
        );
    
        if (existingUser) {
            alert(`Error: A user with that ${existingUser.email.toLowerCase() === email.toLowerCase() ? 'email' : 'username'} already exists.`);
            return null;
        }

        // First, create the authenticated user
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError || !authData.user) {
            console.error(`Error creating auth user for ${role}:`, authError?.message);
            alert(`Failed to create user: ${authError?.message}`);
            return null;
        }

        // Then, create the user profile in the public 'users' table
        const newUserProfile: User = {
            id: authData.user.id,
            ...profileData,
            email,
            role,
            status: 'ACTIVE',
        };

        const { data: profile, error: profileError } = await supabase.from('users').insert(keysToSnake(newUserProfile)).select().single();
        if (profileError || !profile) {
            console.error(`Error creating profile for ${role}:`, profileError?.message);
            // Consider deleting the auth user here for cleanup
            alert(`User account was created, but failed to save profile. Please contact support.`);
            return null;
        }
        
        // Local update will be handled by the real-time subscription
        return keysToCamel(profile) as User;
    };

    const addNewBrand = useCallback(async (brandData: any) => {
        await createUserWithProfile(brandData.email, brandData.password, UserRole.BRAND, brandData);
    }, [users]);

    const updateBrand = useCallback(async (brandId: string, updatedData: Partial<Omit<User, 'id' | 'role'>>) => {
        if (updatedData.pickupLocations) {
            updatedData.pickupLocations = updatedData.pickupLocations.map((loc: any) => ({ ...loc, assignedDriverId: loc.assignedDriverId === 'unassigned' ? undefined : loc.assignedDriverId }));
        }
        const { data, error } = await supabase.from('users').update(keysToSnake(updatedData)).eq('id', brandId).select().single();
        if (error || !data) return console.error('Error updating brand:', error);
        // Local update will be handled by the real-time subscription
    }, []);
    
    const addNewDriver = useCallback(async (driverData: any) => {
        await createUserWithProfile(driverData.email, driverData.password, UserRole.DRIVER, driverData);
    }, [users]);

    const updateDriver = useCallback(async (driverId: string, updatedData: Partial<Omit<User, 'id' | 'role'>>) => {
        const { data, error } = await supabase.from('users').update(keysToSnake(updatedData)).eq('id', driverId).select().single();
        if (error || !data) return console.error('Error updating driver:', error);
        // Local update will be handled by the real-time subscription
    }, []);
    
    const addNewSalesManager = useCallback(async (managerData: any) => {
        await createUserWithProfile(managerData.email, managerData.password, UserRole.SALES_MANAGER, managerData);
    }, [users]);

    const updateSalesManager = useCallback(async (managerId: string, updatedData: Partial<Omit<User, 'id' | 'role'>>) => {
        const { data, error } = await supabase.from('users').update(keysToSnake(updatedData)).eq('id', managerId).select().single();
        if(error || !data) return console.error('Error updating sales manager:', error);
        // Local update will be handled by the real-time subscription
    }, []);

    const addNewDirectSales = useCallback(async (salesData: any) => {
        await createUserWithProfile(salesData.email, salesData.password, UserRole.DIRECT_SALES, salesData);
    }, [users]);

    const updateDirectSales = useCallback(async (salesId: string, updatedData: Partial<Omit<User, 'id' | 'role'>>) => {
        const { data, error } = await supabase.from('users').update(keysToSnake(updatedData)).eq('id', salesId).select().single();
        if(error || !data) return console.error('Error updating direct sales:', error);
        // Local update will be handled by the real-time subscription
    }, []);

    const toggleUserStatus = useCallback(async (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const { data, error } = await supabase.from('users').update({ status: newStatus }).eq('id', userId).select().single();
        if (error || !data) return console.error('Error toggling user status:', error);
        // Local update will be handled by the real-time subscription
    }, [users]);

    const toggleDriverDutyStatus = useCallback(async (driverId: string) => {
        const user = users.find(u => u.id === driverId);
        if (!user || user.role !== UserRole.DRIVER) return;
        const newOnDutyStatus = !user.onDuty;
        const newLogEntry: DutyLogEvent = { status: newOnDutyStatus ? 'ON_DUTY' : 'OFF_DUTY', timestamp: new Date().toISOString() };
        const newDutyLog = [...(user.dutyLog || []), newLogEntry];
        const { data, error } = await supabase.from('users').update({ on_duty: newOnDutyStatus, duty_log: newDutyLog }).eq('id', driverId).select().single();
        if (error || !data) return console.error('Error toggling duty status:', error);
        // Local update will be handled by the real-time subscription
    }, [users]);
    
    const deleteParcel = useCallback(async (parcelIds: string[]) => {
        // This is a soft delete, updating status to Canceled
        const updates = parcelIds.map(id => ({ id, status: ParcelStatus.CANCELED, updated_at: new Date().toISOString() }));
        const { error } = await supabase.from('parcels').upsert(updates);
        if (error) return console.error('Error canceling parcels:', error);
        // Local update will be handled by the real-time subscription
    }, []);

    const generateInvoiceForPayout = useCallback(async (brandId: string, parcelIds: string[]) => {
        const brand = users.find(u => u.id === brandId);
        if (!brand) return;
        const parcelsToInvoice = parcels.filter(p => parcelIds.includes(p.id));
        const totalCOD = parcelsToInvoice.reduce((sum, p) => sum + p.codAmount, 0);
        const totalCharges = parcelsToInvoice.reduce((sum, p) => sum + p.deliveryCharge, 0);
        const totalTax = parcelsToInvoice.reduce((sum, p) => sum + p.tax, 0);

        const newInvoiceData: Invoice = { id: crypto.randomUUID(), brandId: brand.id, brandName: brand.name, createdAt: new Date().toISOString(), parcelIds, totalCOD, totalCharges, totalTax, netPayout: totalCOD - totalCharges - totalTax, status: 'PENDING' };
        
        const { data: newInvoice, error: invoiceError } = await supabase.from('invoices').insert(keysToSnake(newInvoiceData)).select().single();
        if(invoiceError || !newInvoice) return console.error('Error generating invoice:', invoiceError);

        const { error: parcelUpdateError } = await supabase.from('parcels').update({ invoice_id: newInvoice.id }).in('id', parcelIds);
        if(parcelUpdateError) return console.error('Error updating parcels with invoice ID:', parcelUpdateError);

        setInvoices(prev => [...prev, keysToCamel(newInvoice)]);
        // Local parcel updates will be handled by the real-time subscription
    }, [users, parcels]);

    const markInvoiceAsPaid = useCallback(async (invoiceId: string, transactionId: string) => {
        const update = { status: 'PAID', transaction_id: transactionId, paid_at: new Date().toISOString() };
        const { data, error } = await supabase.from('invoices').update(update).eq('id', invoiceId).select().single();
        if(error || !data) return console.error('Error marking invoice as paid:', error);
        setInvoices(prev => prev.map(inv => inv.id === invoiceId ? keysToCamel(data) : inv));
    }, []);

    const reconcileDriverCod = useCallback(async (driverId: string, parcelIds: string[], details: ReconciliationDetails) => {
        const parcelsToUpdate = parcels.filter(p => parcelIds.includes(p.id));
        const historyNote = `COD Reconciled. Method: ${details.method}.`; // Simplified for DB update
        const newHistoryEvent = { status: ParcelStatus.DELIVERED, createdAt: new Date().toISOString(), updatedBy: 'Admin', notes: historyNote };
        const updates = parcelsToUpdate.map(p => ({ id: p.id, is_cod_reconciled: true, history: [...p.history, newHistoryEvent] }));
        
        const { error } = await supabase.from('parcels').upsert(keysToSnake(updates));
        if (error) return console.error('Error reconciling COD:', error);

        // Local update will be handled by the real-time subscription
    }, [parcels]);

    const markSalaryAsPaid = useCallback(async (paymentData: Omit<SalaryPayment, 'id' | 'status' | 'paidAt'> & { transactionId: string }) => {
        const newPayment: SalaryPayment = { id: crypto.randomUUID(), ...paymentData, status: 'PAID', paidAt: new Date().toISOString() };
        const { data, error } = await supabase.from('salary_payments').insert(keysToSnake(newPayment)).select().single();
        if(error || !data) return console.error('Error marking salary as paid:', error);
        setSalaryPayments(prev => [...prev, keysToCamel(data)]);
    }, []);

    const addBrandRemark = useCallback(async (parcelId: string, remark: string) => {
        const { data, error } = await supabase.from('parcels').update({ brand_remark: remark, updated_at: new Date().toISOString() }).eq('id', parcelId).select().single();
        if(error || !data) return console.error('Error adding brand remark:', error);
        // Local update will be handled by the real-time subscription
    }, []);
    
    const addShipperAdvice = useCallback(async (parcelId: string, advice: string) => {
        const { data, error } = await supabase.from('parcels').update({ shipper_advice: advice, updated_at: new Date().toISOString() }).eq('id', parcelId).select().single();
        if(error || !data) return console.error('Error adding shipper advice:', error);
        // Local update will be handled by the real-time subscription
    }, []);

    const manuallyAssignDriver = useCallback(async (parcelId: string, driverId: string | null, type: 'pickup' | 'delivery') => {
        const key = type === 'pickup' ? 'pickup_driver_id' : 'delivery_driver_id';
        const { data, error } = await supabase.from('parcels').update({ [key]: driverId || null, updated_at: new Date().toISOString() }).eq('id', parcelId).select().single();
        if (error || !data) return console.error('Error manually assigning driver:', error);
        // Local update will be handled by the real-time subscription
    }, []);

    const updateDriverLocation = useCallback(async (driverId: string, location: { lat: number, lng: number }) => {
        const { error } = await supabase.from('users').update({ current_location: location }).eq('id', driverId);
        if (error) return console.error('Error updating driver location:', error);
        // Local update will be handled by the real-time subscription
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