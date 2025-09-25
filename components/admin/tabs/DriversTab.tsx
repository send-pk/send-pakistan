



import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../../context/DataContext';
import { User, UserRole, Parcel, ParcelStatus } from '../../../types';
import { Card } from '../../shared/Card';
import { Button } from '../../shared/Button';
import { Modal } from '../../shared/Modal';
import { DELIVERY_ZONES } from '../../../constants';
import { PlusIcon } from '../../icons/PlusIcon';
import { EditIcon } from '../../icons/EditIcon';
import { SwitchHorizontalIcon } from '../../icons/SwitchHorizontalIcon';
import { UserIcon } from '../../icons/UserIcon';
import { ToggleSwitch } from '../../shared/ToggleSwitch';
import { ListBulletIcon } from '../../icons/ListBulletIcon';

const FormInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:bg-border ${props.className}`} />;
const FormLabel = ({ children, htmlFor }: { children: React.ReactNode, htmlFor?: string }) => <label htmlFor={htmlFor} className="block mb-1 text-sm text-content-secondary font-medium">{children}</label>;
const FormSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${props.className}`} />;
const FormTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:bg-border ${props.className}`} />;


const ReassignJobsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    fromDriver: User;
    allDrivers: User[];
    parcels: Parcel[];
    onConfirm: (toDriverId: string, jobType: 'pickup' | 'delivery') => void;
}> = ({ isOpen, onClose, fromDriver, allDrivers, parcels, onConfirm }) => {
    const [toDriverPickup, setToDriverPickup] = useState('');
    const [toDriverDelivery, setToDriverDelivery] = useState('');
    
    const otherDrivers = useMemo(() => allDrivers.filter(d => d.id !== fromDriver.id && d.status === 'ACTIVE'), [allDrivers, fromDriver]);

    const { pickupJobsCount, deliveryJobsCount } = useMemo(() => {
        const activePickupStatuses = [ParcelStatus.BOOKED, ParcelStatus.OUT_FOR_RETURN];
        const activeDeliveryStatuses = [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED, ParcelStatus.PENDING_DELIVERY];
        
        let pickupCount = 0;
        let deliveryCount = 0;

        parcels.forEach(p => {
            if (p.pickupDriverId === fromDriver.id && activePickupStatuses.includes(p.status)) {
                pickupCount++;
            }
            if (p.deliveryDriverId === fromDriver.id && activeDeliveryStatuses.includes(p.status)) {
                deliveryCount++;
            }
        });
        return { pickupJobsCount: pickupCount, deliveryJobsCount: deliveryCount };
    }, [parcels, fromDriver]);

    useEffect(() => {
        if (!isOpen) {
            setToDriverPickup('');
            setToDriverDelivery('');
        }
    }, [isOpen]);

    const handleReassign = (jobType: 'pickup' | 'delivery') => {
        const toDriverId = jobType === 'pickup' ? toDriverPickup : toDriverDelivery;
        if (toDriverId) {
            onConfirm(toDriverId, jobType);
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reassign Jobs from ${fromDriver.name}`} size="lg">
            <div className="space-y-3">
                {/* Pickup Section */}
                <div className="p-3 bg-background rounded-lg border border-border">
                    <h3 className="font-semibold text-content-primary">
                        Reassign Pickup Jobs ({pickupJobsCount})
                    </h3>
                    <p className="text-sm text-content-secondary mb-2">
                        Reassigns parcels waiting for pickup or return to brand.
                    </p>
                    {pickupJobsCount > 0 ? (
                        <div className="flex items-end gap-2">
                            <div className="flex-grow">
                                {/* FIX: Add children to FormLabel component. */}
                                <FormLabel htmlFor="toDriverPickup">Assign To</FormLabel>
                                <FormSelect id="toDriverPickup" value={toDriverPickup} onChange={e => setToDriverPickup(e.target.value)}>
                                    <option value="" disabled>Select a driver</option>
                                    {otherDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </FormSelect>
                            </div>
                            <Button onClick={() => handleReassign('pickup')} disabled={!toDriverPickup}>Reassign Pickups</Button>
                        </div>
                    ) : <p className="text-sm text-content-muted">No active pickup jobs to reassign.</p>}
                </div>

                {/* Delivery Section */}
                <div className="p-3 bg-background rounded-lg border border-border">
                    <h3 className="font-semibold text-content-primary">
                        Reassign Delivery Jobs ({deliveryJobsCount})
                    </h3>
                    <p className="text-sm text-content-secondary mb-2">
                        Reassigns parcels currently out for delivery.
                    </p>
                    {deliveryJobsCount > 0 ? (
                        <div className="flex items-end gap-2">
                            <div className="flex-grow">
                                {/* FIX: Add children to FormLabel component. */}
                                <FormLabel htmlFor="toDriverDelivery">Assign To</FormLabel>
                                <FormSelect id="toDriverDelivery" value={toDriverDelivery} onChange={e => setToDriverDelivery(e.target.value)}>
                                    <option value="" disabled>Select a driver</option>
                                    {otherDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </FormSelect>
                            </div>
                            <Button onClick={() => handleReassign('delivery')} disabled={!toDriverDelivery}>Reassign Deliveries</Button>
                        </div>
                    ) : <p className="text-sm text-content-muted">No active delivery jobs to reassign.</p>}
                </div>

                <div className="flex justify-end pt-2">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </div>
        </Modal>
    );
};


interface DriversTabProps {
    parcels: Parcel[]; // Date-filtered for stats
    allParcels: Parcel[]; // All parcels for reassignment
    user: User; // Current admin user for logging history
}

const initialFormState = {
    name: '', phone: '', email: '', username: '', password: '', deliveryZones: [] as string[],
    photoUrl: '', whatsappNumber: '', currentAddress: '',
    permanentAddress: '', guardianContact: '', idCardNumber: ''
};

const formatDutyLogTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
        timeZone: 'Asia/Karachi',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const DriversTab: React.FC<DriversTabProps> = ({ parcels, allParcels, user }) => {
    const { users, addNewDriver, updateDriver, reassignDriverJobs, toggleDriverDutyStatus, toggleUserStatus } = useData();
    const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<User | null>(null);
    const [driverFormData, setDriverFormData] = useState(initialFormState);
    const [reassigningDriver, setReassigningDriver] = useState<User | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const drivers = useMemo(() => users.filter(u => u.role === UserRole.DRIVER).sort((a, b) => (a.status === 'INACTIVE' ? 1 : -1) - (b.status === 'INACTIVE' ? 1 : -1) || a.name.localeCompare(b.name)), [users]);

    useEffect(() => {
        if (isDriverModalOpen && editingDriver) {
            setDriverFormData({ 
                name: editingDriver.name, 
                phone: editingDriver.phone || '', 
                email: editingDriver.email || '',
                username: editingDriver.username || '',
                password: '', // Never pre-fill password
                deliveryZones: editingDriver.deliveryZones || [],
                photoUrl: editingDriver.photoUrl || '',
                whatsappNumber: editingDriver.whatsappNumber || '',
                currentAddress: editingDriver.currentAddress || '',
                permanentAddress: editingDriver.permanentAddress || '',
                guardianContact: editingDriver.guardianContact || '',
                idCardNumber: editingDriver.idCardNumber || '',
            });
            setImagePreview(editingDriver.photoUrl || null);
        } else {
            setDriverFormData(initialFormState);
            setImagePreview(null);
        }
    }, [isDriverModalOpen, editingDriver]);
    
    const handleDriverFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDriverFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleZoneChange = (zone: string) => {
        setDriverFormData(prev => {
            const newZones = prev.deliveryZones.includes(zone)
                ? prev.deliveryZones.filter(z => z !== zone)
                : [...prev.deliveryZones, zone];
            return { ...prev, deliveryZones: newZones };
        });
    };
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setDriverFormData(prev => ({ ...prev, photoUrl: base64String }));
                setImagePreview(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDriverFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDriver) {
            const { password, ...updateData } = driverFormData;
            if (updateData.name) updateDriver(editingDriver.id, updateData);
        } else {
            if (driverFormData.name && driverFormData.email && driverFormData.password && driverFormData.username) {
                addNewDriver(driverFormData);
            }
        }
        setIsDriverModalOpen(false);
        setEditingDriver(null);
    };
    
    const handleModalClose = () => {
        setIsDriverModalOpen(false);
        setEditingDriver(null);
    };
    
    const handleToggleStatus = async () => {
        if (!editingDriver) return;
        const action = editingDriver.status === 'ACTIVE' ? 'deactivate' : 'reactivate';
        const confirmMessage = action === 'deactivate'
            ? `Deactivating this driver will unassign all their active jobs. Are you sure you want to proceed?`
            : `Are you sure you want to reactivate driver "${editingDriver.name}"?`;
        
        if (window.confirm(confirmMessage)) {
            await toggleUserStatus(editingDriver.id);
            handleModalClose();
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-content-primary">Driver Performance</h2>
                    <Button onClick={() => setIsDriverModalOpen(true)} className="flex items-center gap-2"><PlusIcon className="w-4 h-4" /> Add Driver</Button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {drivers.map(driver => {
                        const jobs = parcels.filter(p => p.pickupDriverId === driver.id || p.deliveryDriverId === driver.id);
                        
                        // New, more dynamic stats
                        const pendingPickups = jobs.filter(p => p.pickupDriverId === driver.id && [ParcelStatus.BOOKED, ParcelStatus.OUT_FOR_RETURN].includes(p.status)).length;
                        const pendingDeliveries = jobs.filter(p => p.deliveryDriverId === driver.id && [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED, ParcelStatus.PENDING_DELIVERY].includes(p.status)).length;
                        
                        const completedDeliveries = jobs.filter(p => p.deliveryDriverId === driver.id && p.status === ParcelStatus.DELIVERED).length;
                        const completedPickups = jobs.filter(p => p.pickupDriverId === driver.id && (p.status === ParcelStatus.PICKED_UP || p.status === ParcelStatus.RETURNED)).length;
                        const completedToday = completedDeliveries + completedPickups;

                        const successfulJobs = completedDeliveries + completedPickups;
                        const failedJobs = jobs.filter(p => p.deliveryDriverId === driver.id && [ParcelStatus.DELIVERY_FAILED, ParcelStatus.CUSTOMER_REFUSED].includes(p.status)).length;
                        const totalJobsForRate = successfulJobs + failedJobs;
                        const successRate = totalJobsForRate > 0 ? Math.round((successfulJobs / totalJobsForRate) * 100) : 100;

                        return (
                            <Card key={driver.id} className={`p-3 flex flex-col bg-surface shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${driver.status === 'INACTIVE' ? 'opacity-50 hover:shadow-md hover:-translate-y-0' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-3">
                                        {driver.photoUrl ? (
                                            <img src={driver.photoUrl} alt={driver.name} className="w-12 h-12 rounded-full object-cover border-2 border-border" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-background flex-shrink-0 flex items-center justify-center border-2 border-border">
                                                <UserIcon className="w-6 h-6 text-content-muted" />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-bold text-base text-content-primary">{driver.name}</h3>
                                            <p className="text-sm text-content-muted">{driver.deliveryZones?.join(', ') || 'No Zones'}</p>
                                            {driver.status === 'INACTIVE' && <span className="text-xs font-bold text-red-500">(Inactive)</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button size="sm" variant="secondary" onClick={() => { setEditingDriver(driver); setIsDriverModalOpen(true); }} aria-label={`Edit driver ${driver.name}`}><EditIcon className="w-4 h-4" /></Button>
                                        <Button size="sm" variant="secondary" onClick={() => setReassigningDriver(driver)} aria-label={`Reassign jobs from ${driver.name}`} className="flex items-center gap-1.5" disabled={driver.status === 'INACTIVE'}>
                                            <SwitchHorizontalIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="mt-3 pt-3 border-t border-border flex-grow flex flex-col justify-between">
                                     <div className="flex justify-between text-sm font-bold mb-2 pb-1.5 border-b border-dashed border-border">
                                        <span className="text-content-secondary">Success Rate</span>
                                        <span className="text-green-600 dark:text-green-400">{successRate}%</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-1.5">
                                        <span className="text-content-secondary">Pending Pickups</span>
                                        <span className="font-semibold text-orange-500">{pendingPickups}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-1.5">
                                        <span className="text-content-secondary">Pending Deliveries</span>
                                        <span className="font-semibold text-blue-500">{pendingDeliveries}</span>
                                    </div>
                                     <div className="flex justify-between text-sm mt-1.5">
                                        <span className="text-content-secondary">Completed Today</span>
                                        <span className="font-semibold text-green-600">{completedToday}</span>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-border">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-content-primary">On Duty</span>
                                        <ToggleSwitch 
                                            checked={!!driver.onDuty} 
                                            onChange={() => toggleDriverDutyStatus(driver.id)}
                                            disabled={driver.status === 'INACTIVE'}
                                        />
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                 </div>
            </Card>

            <Modal isOpen={isDriverModalOpen} onClose={handleModalClose} title={editingDriver ? 'Edit Driver' : 'Add New Driver'} size="5xl">
                <form onSubmit={handleDriverFormSubmit}>
                    <div className="max-h-[70vh] overflow-y-auto p-1 pr-2">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                            <div className="lg:col-span-2 space-y-2">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="md:col-span-1 flex flex-col items-center gap-2 pt-2">
                                        {/* FIX: Add children to FormLabel component. */}
                                        <FormLabel>Driver Photo</FormLabel>
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Driver preview" className="w-32 h-32 rounded-full object-cover border-2 border-border" />
                                        ) : (
                                            <div className="w-32 h-32 rounded-full bg-surface flex items-center justify-center border-2 border-border">
                                                <UserIcon className="w-16 h-16 text-content-muted" />
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={handlePhotoChange} ref={fileInputRef} className="hidden" />
                                        <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                                            {imagePreview ? "Change Photo" : "Upload Photo"}
                                        </Button>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {/* FIX: Add children to FormLabel components. */}
                                            <div><FormLabel htmlFor="d_name">Driver Name</FormLabel><FormInput id="d_name" name="name" value={driverFormData.name} onChange={handleDriverFormInputChange} required /></div>
                                            <div><FormLabel htmlFor="d_username">Username</FormLabel><FormInput id="d_username" name="username" value={driverFormData.username} onChange={handleDriverFormInputChange} required disabled={!!editingDriver} /></div>
                                        </div>
                                        <div><FormLabel htmlFor="d_email">Email (for login)</FormLabel><FormInput id="d_email" name="email" type="email" value={driverFormData.email} onChange={handleDriverFormInputChange} required disabled={!!editingDriver} /></div>
                                        {!editingDriver && (<div><FormLabel htmlFor="d_password">Password</FormLabel><FormInput id="d_password" name="password" type="password" value={driverFormData.password} onChange={handleDriverFormInputChange} required /></div>)}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div><FormLabel htmlFor="d_phone">Phone Number</FormLabel><FormInput id="d_phone" name="phone" value={driverFormData.phone} onChange={handleDriverFormInputChange} /></div>
                                            <div><FormLabel htmlFor="d_whatsapp">WhatsApp Number</FormLabel><FormInput id="d_whatsapp" name="whatsappNumber" value={driverFormData.whatsappNumber || ''} onChange={handleDriverFormInputChange} /></div>
                                            <div><FormLabel htmlFor="d_cnic">ID Card (CNIC)</FormLabel><FormInput id="d_cnic" name="idCardNumber" value={driverFormData.idCardNumber || ''} onChange={handleDriverFormInputChange} /></div>
                                            <div><FormLabel htmlFor="d_guardian">Guardian Contact</FormLabel><FormInput id="d_guardian" name="guardianContact" value={driverFormData.guardianContact || ''} onChange={handleDriverFormInputChange} /></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div><FormLabel htmlFor="d_current_address">Current Address</FormLabel><FormTextarea id="d_current_address" name="currentAddress" value={driverFormData.currentAddress || ''} onChange={handleDriverFormInputChange} rows={2} /></div>
                                    <div><FormLabel htmlFor="d_permanent_address">Permanent Address</FormLabel><FormTextarea id="d_permanent_address" name="permanentAddress" value={driverFormData.permanentAddress || ''} onChange={handleDriverFormInputChange} rows={2} /></div>
                                </div>
                                <div>
                                    {/* FIX: Add children to FormLabel component. */}
                                    <FormLabel>Delivery Zones</FormLabel>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 bg-background rounded-md border border-border">
                                        {DELIVERY_ZONES.map(zone => (
                                            <label key={zone} className="flex items-center gap-2 p-2 rounded-md hover:bg-surface transition-colors cursor-pointer">
                                                <input type="checkbox" checked={driverFormData.deliveryZones.includes(zone)} onChange={() => handleZoneChange(zone)} className="w-4 h-4 text-primary rounded border-border focus:ring-primary" />
                                                <span className="text-sm font-medium text-content-primary">{zone}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-1">
                                <h3 className="text-md font-semibold text-content-primary mb-2 flex items-center gap-2">
                                    <ListBulletIcon className="w-5 h-5" />
                                    Duty Log
                                </h3>
                                <div className="space-y-2 p-2 bg-background rounded-lg border border-border h-80 overflow-y-auto">
                                    {(editingDriver?.dutyLog || []).slice().reverse().map((log, index) => (
                                        <div key={index} className={`p-2 rounded-md text-sm flex justify-between items-center ${log.status === 'ON_DUTY' ? 'bg-green-100 dark:bg-green-500/20' : 'bg-red-100 dark:bg-red-500/20'}`}>
                                            <span className={`font-semibold ${log.status === 'ON_DUTY' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                                                {log.status === 'ON_DUTY' ? 'On Duty' : 'Off Duty'}
                                            </span>
                                            <span className="text-xs text-content-secondary">{formatDutyLogTime(log.timestamp)}</span>
                                        </div>
                                    ))}
                                    {(editingDriver?.dutyLog || []).length === 0 && (
                                        <p className="text-center text-content-muted py-4">No duty history recorded.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 mt-3 border-t border-border">
                        <div>
                            {editingDriver && (
                                <Button type="button" variant={editingDriver.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={handleToggleStatus}>
                                    {editingDriver.status === 'ACTIVE' ? 'Deactivate Driver' : 'Reactivate Driver'}
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="secondary" onClick={handleModalClose}>Cancel</Button>
                            <Button type="submit">{editingDriver ? 'Update Driver' : 'Add Driver'}</Button>
                        </div>
                    </div>
                </form>
            </Modal>

            {reassigningDriver && (
                <ReassignJobsModal
                    isOpen={!!reassigningDriver}
                    onClose={() => setReassigningDriver(null)}
                    fromDriver={reassigningDriver}
                    allDrivers={drivers}
                    parcels={allParcels}
                    onConfirm={(toDriverId, jobType) => reassignDriverJobs(reassigningDriver!.id, toDriverId, user, jobType)}
                />
            )}
        </div>
    );
};