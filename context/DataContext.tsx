import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { Parcel, User, ParcelStatus, UserRole, Invoice, DataContextType, ParcelHistoryEvent, ReconciliationDetails, DutyLogEvent, Item, SalaryPayment } from '../types';
import { supabase } from '../supabase';
import { PENDING_PARCEL_STATUSES, WEIGHT_TIERS } from '../constants';

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

    const fetchData = useCallback(async () => {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: parcelData, error: parcelError } = await supabase
                .from('parcels')
                .select('*')
                .or(`status.in.(${PENDING_PARCEL_STATUSES.map(s => `'${s}'`).join(',')}),updated_at.gte.${thirtyDaysAgo.toISOString()}`);
            if (parcelError) throw new Error(`Error fetching parcels:\n${parcelError.message}`);

            const { data: userData, error: userError } = await supabase.from('users').select('*');
            if (userError) throw new Error(`Error fetching users:\n${userError.message}`);

            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const { data: invoiceData, error: invoiceError } = await supabase.from('invoices').select('*').gte('created_at', ninetyDaysAgo.toISOString());
            if (invoiceError) throw new Error(`Error fetching invoices:\n${invoiceError.message}`);
            
            const { data: salaryData, error: salaryError } = await supabase.from('salary_payments').select('*');
            if (salaryError) throw new Error(`Error fetching salary payments:\n${salaryError.message}`);
            
            const convertedParcels = keysToCamel(parcelData || []).map((p: Parcel) => ({ ...p, createdAt: p.createdAt || p.updatedAt }));
            setParcels(convertedParcels);
            setUsers(keysToCamel(userData || []));
            setInvoices(keysToCamel(invoiceData || []));
            setSalaryPayments(keysToCamel(salaryData || []));
            
        } catch (error) {
            console.error("Data fetching error:", error);
        }
    }, []);

    useEffect(() => {
        setLoading(true);

        const channel = supabase.channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                console.log('Realtime change received!', payload);
                // Refetch data only if there's an active session
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session) {
                        fetchData();
                    }
                });
            })
            .subscribe();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session) {
                // A session exists, show loader and fetch data.
                setLoading(true);
                await fetchData();
                setLoading(false);
            } else {
                // No session, clear all data and stop loading.
                setParcels([]);
                setUsers([]);
                setInvoices([]);
                setSalaryPayments([]);
                setLoading(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    const addHistoryEvent = (history: ParcelHistoryEvent[], status: ParcelStatus, currentUser?: User, notes?: string, proof?: string): ParcelHistoryEvent[] => {
        const newEvent: ParcelHistoryEvent = {
            status,
            createdAt: new Date().toISOString(),
            notes,
            proofOfAttempt: proof,
            updatedBy: currentUser?.name || 'System',
        };
        return [...(history || []), newEvent];
    };

    const updateParcelStatus = useCallback(async (parcelId: string, status: ParcelStatus, currentUser?: User, details?: { reason?: string; proof?: string; deliveryZone?: string; driverId?: string; weight?: number; }) => {
        const parcel = parcels.find(p => p.id === parcelId);
        if (!parcel) return;

        let notes = details?.reason;
        if (details?.deliveryZone) notes = (notes ? `${notes}\n` : '') + `Zone assigned: ${details.deliveryZone}.`;
        if (details?.driverId) {
            const driver = users.find(u => u.id === details.driverId);
            notes = (notes ? `${notes}\n` : '') + `Driver assigned: ${driver?.name || 'Unknown'}.`;
        }
        if (details?.weight) notes = (notes ? `${notes}\n` : '') + `Weight verified: ${details.weight}kg.`;

        const newHistory = addHistoryEvent(parcel.history, status, currentUser, notes, details?.proof);

        let updateData: any = {
            status: status,
            history: newHistory,
            updated_at: new Date().toISOString(),
        };

        if (status === ParcelStatus.DELIVERY_FAILED) {
            updateData.failed_attempt_reason = details?.reason;
            updateData.proof_of_attempt = details?.proof;
        }
        if (status === ParcelStatus.AT_HUB && details?.deliveryZone) {
            updateData.delivery_zone = details.deliveryZone;
            if (details.weight) {
                updateData.weight = details.weight;
                const brand = users.find(u => u.id === parcel.brandId);
                if (brand?.weightCharges) {
                    const applicableWeight = WEIGHT_TIERS.find(w => details.weight! <= w) || WEIGHT_TIERS[WEIGHT_TIERS.length - 1];
                    const charge = brand.weightCharges[String(applicableWeight)] || 0;
                    const surcharge = charge * ((brand.fuelSurcharge || 0) / 100);
                    const finalCharge = charge + surcharge;
                    const tax = finalCharge * 0.16;
                    updateData.delivery_charge = finalCharge;
                    updateData.tax = tax;
                }
            }
        }
        if (status === ParcelStatus.OUT_FOR_DELIVERY && details?.driverId) {
            updateData.delivery_driver_id = details.driverId;
        }

        if (status === ParcelStatus.DELIVERED_EXCHANGE_COMPLETE) {
            // This is a special transient status from the driver app.
            // We need to update BOTH parcels in the exchange.
            const linkedParcel = parcels.find(p => p.id === parcel.linkedParcelId);
            if (linkedParcel) {
                // Main parcel is delivered
                const { error: mainError } = await supabase.from('parcels').update({
                    status: ParcelStatus.DELIVERED,
                    history: addHistoryEvent(parcel.history, ParcelStatus.DELIVERED, currentUser, "Exchange completed."),
                    updated_at: new Date().toISOString(),
                }).eq('id', parcel.id);
                if (mainError) console.error("Error updating main exchange parcel:", mainError);

                // Linked parcel (return) is picked up
                const { error: linkedError } = await supabase.from('parcels').update({
                    status: ParcelStatus.PICKED_UP,
                    history: addHistoryEvent(linkedParcel.history, ParcelStatus.PICKED_UP, currentUser, "Exchanged item collected from customer."),
                    updated_at: new Date().toISOString(),
                    delivery_driver_id: parcel.deliveryDriverId, // The same driver brings it back
                }).eq('id', linkedParcel.id);
                if (linkedError) console.error("Error updating linked exchange parcel:", linkedError);
                await fetchData();
                return;
            }
        }

        const { error } = await supabase.from('parcels').update(updateData).eq('id', parcelId);
        if (error) console.error("Error updating parcel status:", error.message);
        else await fetchData();
    }, [parcels, users, fetchData]);
    
    const value: DataContextType = useMemo(() => ({
        parcels, users, invoices, salaryPayments, loading,
        updateParcelStatus,
        updateMultipleParcelStatuses: async (parcelIds, status, currentUser, details) => {
            const updates = parcelIds.map(id => {
                const parcel = parcels.find(p => p.id === id);
                if (!parcel) return null;
                const notes = `Bulk update by ${currentUser.name}.${details?.adminRemark ? ` Note: ${details.adminRemark}` : ''}`;
                return {
                    id: id,
                    status: status,
                    history: addHistoryEvent(parcel.history, status, currentUser, notes),
                    updated_at: new Date().toISOString(),
                };
            }).filter(Boolean);

            if(updates.length > 0) {
                const { error } = await supabase.from('parcels').upsert(updates);
                if (error) console.error("Error bulk updating parcels:", error.message);
                else await fetchData();
            }
        },
        bookNewParcel: async (parcelData) => {
            const { pickupLocationId, ...restOfData } = parcelData;
            const brand = users.find(u => u.id === parcelData.brandId);
            const pickupLocation = brand?.pickupLocations?.find(loc => loc.id === pickupLocationId);

            if (!brand || !pickupLocation) {
                console.error("Brand or pickup location not found for new parcel.");
                return null;
            }

            const applicableWeight = WEIGHT_TIERS.find(w => parcelData.weight <= w) || WEIGHT_TIERS[WEIGHT_TIERS.length - 1];
            const charge = brand.weightCharges?.[String(applicableWeight)] || 0;
            const surcharge = charge * ((brand.fuelSurcharge || 0) / 100);
            const finalCharge = charge + surcharge;
            const tax = finalCharge * 0.16;

            const trackingNumber = `SD${Math.floor(1000 + Math.random() * 9000)}`;
            const newParcel: Omit<Parcel, 'id'> = {
                ...restOfData,
                trackingNumber,
                status: ParcelStatus.BOOKED,
                deliveryCharge: finalCharge,
                tax,
                pickupDriverId: pickupLocation.assignedDriverId,
                pickupAddress: pickupLocation.address,
                isCodReconciled: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                history: [
                    { status: ParcelStatus.BOOKED, createdAt: new Date().toISOString(), updatedBy: brand.name, notes: "Parcel booked by brand." }
                ]
            };
            
            const { data, error } = await supabase.from('parcels').insert(keysToSnake(newParcel)).select().single();
            if (error) console.error("Error booking parcel:", error.message);
            else await fetchData();
            return keysToCamel(data);
        },
        deleteParcel: async (parcelIds) => {
             const { error } = await supabase.from('parcels').delete().in('id', parcelIds);
             if (error) console.error("Error deleting parcels:", error);
             else await fetchData();
        },
        addBrandRemark: async (parcelId, remark) => {
            const parcel = parcels.find(p => p.id === parcelId);
            const brand = users.find(u => u.id === parcel?.brandId);
            if (!parcel || !brand) return;
            const newHistory = addHistoryEvent(parcel.history, parcel.status, brand, `Brand Remark: ${remark}`);
            const { error } = await supabase.from('parcels').update({ history: newHistory, brand_remark: remark, updated_at: new Date().toISOString() }).eq('id', parcelId);
            if (error) console.error("Error adding remark:", error); else await fetchData();
        },
        addNewBrand: async (brandData) => {
            const { data: { user }, error: authError } = await supabase.auth.signUp({ email: brandData.email, password: brandData.password });
            if (authError || !user) { console.error("Error creating brand user:", authError); return; }
            
            const { password, ...profileData } = brandData;
            const { error: profileError } = await supabase.from('users').insert({ ...keysToSnake(profileData), id: user.id, role: UserRole.BRAND, status: 'ACTIVE' });
            if (profileError) console.error("Error creating brand profile:", profileError); else await fetchData();
        },
        updateBrand: async (brandId, updatedData) => {
            const { error } = await supabase.from('users').update(keysToSnake(updatedData)).eq('id', brandId);
            if (error) console.error("Error updating brand:", error); else await fetchData();
        },
        // All other user types use the same logic, just different roles
        addNewDriver: async (driverData) => {
            const { data: { user }, error: authError } = await supabase.auth.signUp({ email: driverData.email, password: driverData.password });
            if (authError || !user) { console.error("Error creating driver user:", authError); return; }

            const { password, ...profileData } = driverData;
            const { error: profileError } = await supabase.from('users').insert({ ...keysToSnake(profileData), id: user.id, role: UserRole.DRIVER, status: 'ACTIVE', on_duty: true, duty_log: [{ status: 'ON_DUTY', timestamp: new Date().toISOString() }] });
            if (profileError) console.error("Error creating driver profile:", profileError); else await fetchData();
        },
        updateDriver: async (driverId, updatedData) => {
            const { error } = await supabase.from('users').update(keysToSnake(updatedData)).eq('id', driverId);
            if (error) console.error("Error updating driver:", error); else await fetchData();
        },
        addNewSalesManager: async (managerData) => {
            const { data: { user }, error: authError } = await supabase.auth.signUp({ email: managerData.email, password: managerData.password });
            if (authError || !user) { console.error("Error creating sales manager user:", authError); return; }

            const { password, ...profileData } = managerData;
            const { error: profileError } = await supabase.from('users').insert({ ...keysToSnake(profileData), id: user.id, role: UserRole.SALES_MANAGER, status: 'ACTIVE' });
            if (profileError) console.error("Error creating sales manager profile:", profileError); else await fetchData();
        },
        updateSalesManager: async (managerId, updatedData) => {
            const { error } = await supabase.from('users').update(keysToSnake(updatedData)).eq('id', managerId);
            if (error) console.error("Error updating sales manager:", error); else await fetchData();
        },
        addNewDirectSales: async (salesData) => {
             const { data: { user }, error: authError } = await supabase.auth.signUp({ email: salesData.email, password: salesData.password });
            if (authError || !user) { console.error("Error creating direct sales user:", authError); return; }

            const { password, ...profileData } = salesData;
            const { error: profileError } = await supabase.from('users').insert({ ...keysToSnake(profileData), id: user.id, role: UserRole.DIRECT_SALES, status: 'ACTIVE' });
            if (profileError) console.error("Error creating direct sales profile:", profileError); else await fetchData();
        },
        updateDirectSales: async (salesId, updatedData) => {
            const { error } = await supabase.from('users').update(keysToSnake(updatedData)).eq('id', salesId);
            if (error) console.error("Error updating direct sales:", error); else await fetchData();
        },
        toggleUserStatus: async (userId) => {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', userId);
            if (error) console.error("Error toggling user status:", error); else await fetchData();
        },
        generateInvoiceForPayout: async (brandId, parcelIds) => {
            const brand = users.find(u => u.id === brandId);
            if (!brand) return;
            const parcelsToInvoice = parcels.filter(p => parcelIds.includes(p.id));

            const totalCOD = parcelsToInvoice.reduce((sum, p) => sum + p.codAmount, 0);
            const totalCharges = parcelsToInvoice.reduce((sum, p) => sum + p.deliveryCharge, 0);
            const totalTax = parcelsToInvoice.reduce((sum, p) => sum + p.tax, 0);
            
            const newInvoice = {
                brand_id: brandId,
                brand_name: brand.name,
                parcel_ids: parcelIds,
                total_cod: totalCOD,
                total_charges: totalCharges,
                total_tax: totalTax,
                net_payout: totalCOD - totalCharges - totalTax,
                status: 'PENDING',
                created_at: new Date().toISOString(),
            };

            const { data, error } = await supabase.from('invoices').insert(newInvoice).select().single();
            if (error || !data) { console.error("Error creating invoice:", error); return; }
            
            const { error: parcelUpdateError } = await supabase.from('parcels').update({ invoice_id: data.id }).in('id', parcelIds);
            if (parcelUpdateError) console.error("Error updating parcels with invoice ID:", parcelUpdateError);
            else await fetchData();
        },
        markInvoiceAsPaid: async (invoiceId, transactionId) => {
            const { error } = await supabase.from('invoices').update({ status: 'PAID', transaction_id: transactionId, paid_at: new Date().toISOString() }).eq('id', invoiceId);
            if (error) console.error("Error marking invoice as paid:", error); else await fetchData();
        },
        reconcileDriverCod: async (driverId, parcelIds, details) => {
            const notes = `Reconciled by admin. Method: ${details.method}. Cash: ${details.cashAmount || 0}. Transfers: ${details.transfers?.length || 0}.`;
            const parcelsToUpdate = parcels.filter(p => parcelIds.includes(p.id)).map(p => ({
                ...keysToSnake(p),
                is_cod_reconciled: true,
                history: addHistoryEvent(p.history, p.status, undefined, notes),
                updated_at: new Date().toISOString(),
            }));
            const { error } = await supabase.from('parcels').upsert(parcelsToUpdate);
            if (error) console.error("Error reconciling COD:", error); else await fetchData();
        },
        updateDriverLocation: async (driverId, location) => {
            const { error } = await supabase.from('users').update({ current_location: location }).eq('id', driverId);
            if (error) console.error("Error updating driver location:", error.message);
            // No fetchData here to avoid screen flashing on frequent updates
        },
        addShipperAdvice: async (parcelId, advice) => {
            const { error } = await supabase.from('parcels').update({ shipper_advice: advice }).eq('id', parcelId);
            if (error) console.error("Error adding shipper advice:", error); else await fetchData();
        },
        manuallyAssignDriver: async (parcelId, driverId, type) => {
            const update: any = {};
            if (type === 'pickup') update.pickup_driver_id = driverId;
            else update.delivery_driver_id = driverId;
            const { error } = await supabase.from('parcels').update(update).eq('id', parcelId);
            if (error) console.error("Error manually assigning driver:", error); else await fetchData();
        },
        initiateExchange: async (originalParcelId, newOutboundDetails, returnItemDetails) => {
            const originalParcel = parcels.find(p => p.id === originalParcelId);
            if (!originalParcel) return null;

            // 1. Create the new outbound parcel
            const outboundResult = await value.bookNewParcel({
                ...newOutboundDetails,
                brandId: originalParcel.brandId,
                brandName: originalParcel.brandName,
                recipientName: originalParcel.recipientName,
                recipientAddress: originalParcel.recipientAddress,
                recipientPhone: originalParcel.recipientPhone,
                weight: originalParcel.weight,
                pickupLocationId: users.find(u => u.id === originalParcel.brandId)?.pickupLocations?.[0].id || '', // Fallback
                isExchange: true,
                isOpenParcel: false, // Exchanges are not open parcels by default
            });
            if (!outboundResult) { console.error("Failed to create outbound exchange parcel"); return null; }
            
            // 2. Create the return parcel
            const returnTrackingNumber = `RTN-${outboundResult.trackingNumber}`;
            const returnParcelData: Omit<Parcel, 'id'> = {
                orderId: originalParcel.orderId,
                trackingNumber: returnTrackingNumber,
                brandId: originalParcel.brandId,
                brandName: originalParcel.brandName,
                recipientName: originalParcel.brandName,
                recipientAddress: users.find(u => u.id === originalParcel.brandId)?.officeAddress || 'Return to Office',
                recipientPhone: users.find(u => u.id === originalParcel.brandId)?.companyPhone || '',
                status: ParcelStatus.PENDING_EXCHANGE_PICKUP,
                codAmount: 0,
                weight: 0.5, // Default return weight
                deliveryCharge: 0,
                tax: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                itemDetails: `Return for ${originalParcel.orderId}`,
                returnItemDetails,
                isCodReconciled: true,
                isExchange: true,
                linkedParcelId: outboundResult.id,
                history: [{ status: ParcelStatus.PENDING_EXCHANGE_PICKUP, createdAt: new Date().toISOString(), updatedBy: originalParcel.brandName, notes: 'Awaiting pickup from customer during exchange.' }],
            };
            const { data: returnResult, error: returnError } = await supabase.from('parcels').insert(keysToSnake(returnParcelData)).select().single();
            if (returnError || !returnResult) { console.error("Failed to create return exchange parcel", returnError); return null; }

            // 3. Link them together
            await supabase.from('parcels').update({ linked_parcel_id: returnResult.id }).eq('id', outboundResult.id);
            
            await fetchData();
            return { outboundParcel: keysToCamel(outboundResult), returnParcel: keysToCamel(returnResult) };
        },
        reassignDriverJobs: async (fromDriverId, toDriverId, currentUser, jobType) => {
            const updates = [];
            const activePickupStatuses = [ParcelStatus.BOOKED, ParcelStatus.OUT_FOR_RETURN];
            const activeDeliveryStatuses = [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED, ParcelStatus.PENDING_DELIVERY];
            const toDriver = users.find(u => u.id === toDriverId);
            
            for (const p of parcels) {
                if (jobType === 'pickup' && p.pickupDriverId === fromDriverId && activePickupStatuses.includes(p.status)) {
                    updates.push({ id: p.id, pickup_driver_id: toDriverId, history: addHistoryEvent(p.history, p.status, currentUser, `Pickup reassigned to ${toDriver?.name}`) });
                }
                if (jobType === 'delivery' && p.deliveryDriverId === fromDriverId && activeDeliveryStatuses.includes(p.status)) {
                    updates.push({ id: p.id, delivery_driver_id: toDriverId, history: addHistoryEvent(p.history, p.status, currentUser, `Delivery reassigned to ${toDriver?.name}`) });
                }
            }

            if (updates.length > 0) {
                const { error } = await supabase.from('parcels').upsert(updates);
                if (error) console.error("Error reassigning jobs:", error); else await fetchData();
            }
        },
        toggleDriverDutyStatus: async (driverId) => {
            const driver = users.find(u => u.id === driverId);
            if (!driver) return;
            const newStatus = !driver.onDuty;
            const newLogEvent: DutyLogEvent = { status: newStatus ? 'ON_DUTY' : 'OFF_DUTY', timestamp: new Date().toISOString() };
            const updatedLog = [...(driver.dutyLog || []), newLogEvent];
            const { error } = await supabase.from('users').update({ on_duty: newStatus, duty_log: updatedLog }).eq('id', driverId);
            if (error) console.error("Error toggling duty status:", error); else await fetchData();
        },
        markSalaryAsPaid: async (paymentData) => {
            const { error } = await supabase.from('salary_payments').insert(keysToSnake({ ...paymentData, status: 'PAID', paidAt: new Date().toISOString() }));
            if (error) console.error("Error marking salary as paid:", error); else await fetchData();
        }
    }), [parcels, users, invoices, salaryPayments, loading, fetchData, updateParcelStatus]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
