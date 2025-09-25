import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { User, UserRole, PickupLocation } from '../../../types';
import { Card } from '../../shared/Card';
import { Button } from '../../shared/Button';
import { Modal } from '../../shared/Modal';
import { PlusIcon } from '../../icons/PlusIcon';
import { EditIcon } from '../../icons/EditIcon';
import { TrashIcon } from '../../icons/TrashIcon';
import { WEIGHT_TIERS } from '../../../constants';

const FormInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:bg-border ${props.className}`} />;
const FormSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${props.className}`} />;
const FormLabel = ({ children, htmlFor }: { children: React.ReactNode, htmlFor?: string }) => <label htmlFor={htmlFor} className="block mb-2 text-sm text-content-secondary font-medium">{children}</label>;

const getDefaultWeightCharges = (): { [key: string]: string } => {
    const charges: { [key: string]: string } = {};
    WEIGHT_TIERS.forEach(tier => {
        charges[String(tier)] = '100';
    });
    return charges;
}

const initialFormState = { 
    name: '', email: '', username: '', password: '',
    bankName: '', 
    accountTitle: '', accountNumber: '', companyPhone: '', 
    correspondentName: '', correspondentPhone: '',
    officeAddress: '',
    pickupLocations: [] as PickupLocation[],
    weightCharges: getDefaultWeightCharges(),
    fuelSurcharge: '10'
};

export const BrandsTab: React.FC = () => {
    const { users, addNewBrand, updateBrand, toggleUserStatus } = useData();
    const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<User | null>(null);
    const [brandFormData, setBrandFormData] = useState(initialFormState);

    const brands = useMemo(() => users.filter(u => u.role === UserRole.BRAND).sort((a, b) => (a.status === 'INACTIVE' ? 1 : -1) - (b.status === 'INACTIVE' ? 1 : -1) || a.name.localeCompare(b.name)), [users]);
    const activeDrivers = useMemo(() => users.filter(u => u.role === UserRole.DRIVER && u.status === 'ACTIVE'), [users]);

    useEffect(() => {
        if (isBrandModalOpen && editingBrand) {
            const currentCharges: { [key: string]: string } = {};
            WEIGHT_TIERS.forEach(tier => {
                currentCharges[String(tier)] = String(editingBrand.weightCharges?.[String(tier)] ?? '100');
            });

            setBrandFormData({ 
                name: editingBrand.name, 
                email: editingBrand.email,
                username: editingBrand.username || '',
                password: '', // Password is not edited
                bankName: editingBrand.bankName || '',
                accountTitle: editingBrand.accountTitle || '',
                accountNumber: editingBrand.accountNumber || '',
                companyPhone: editingBrand.companyPhone || '',
                correspondentName: editingBrand.correspondentName || '',
                correspondentPhone: editingBrand.correspondentPhone || '',
                officeAddress: editingBrand.officeAddress || '',
                pickupLocations: editingBrand.pickupLocations || [],
                weightCharges: currentCharges,
                fuelSurcharge: String(editingBrand.fuelSurcharge || 10),
            });
        } else {
            setBrandFormData(initialFormState);
        }
    }, [isBrandModalOpen, editingBrand]);

    const handleBrandFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setBrandFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleWeightChargeChange = (weight: string, value: string) => {
        setBrandFormData(prev => ({
            ...prev,
            weightCharges: { ...(prev.weightCharges || {}), [weight]: value }
        }));
    };
    
    // Handlers for pickup locations
    const handleAddPickupLocation = () => {
        setBrandFormData(prev => ({
            ...prev,
            pickupLocations: [...prev.pickupLocations, { id: `new-${Date.now()}`, address: '', assignedDriverId: 'unassigned' }]
        }));
    };
    
    const handleRemovePickupLocation = (id: string) => {
        setBrandFormData(prev => ({
            ...prev,
            pickupLocations: prev.pickupLocations.filter(loc => loc.id !== id)
        }));
    };

    const handlePickupLocationChange = (id: string, field: 'address' | 'assignedDriverId', value: string) => {
        setBrandFormData(prev => ({
            ...prev,
            pickupLocations: prev.pickupLocations.map(loc => loc.id === id ? { ...loc, [field]: value } : loc)
        }));
    };
    
    const handleBrandFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { name, email, username, password, bankName, accountTitle, accountNumber, companyPhone, correspondentName, correspondentPhone, officeAddress, pickupLocations, weightCharges, fuelSurcharge } = brandFormData;
        
        const numericWeightCharges: { [key: string]: number } = {};
        const safeWeightCharges = weightCharges || {};
        for (const weight in safeWeightCharges) {
            numericWeightCharges[weight] = parseFloat(safeWeightCharges[weight]);
        }

        const dataToSave = { 
            name, email, username, password, bankName, accountTitle, 
            accountNumber, companyPhone, correspondentName, correspondentPhone,
            officeAddress, pickupLocations,
            weightCharges: numericWeightCharges,
            fuelSurcharge: parseFloat(fuelSurcharge)
        };

        if (editingBrand) {
            if (name && email) {
                const { password, ...updateData } = dataToSave; // Exclude password on update
                updateBrand(editingBrand.id, updateData);
            }
        } else {
            if (name && email && password && username) {
                addNewBrand(dataToSave);
            }
        }
        setIsBrandModalOpen(false);
        setEditingBrand(null);
    };
    
    const handleModalClose = () => {
        setIsBrandModalOpen(false);
        setEditingBrand(null);
    };

    const handleToggleStatus = async () => {
        if (!editingBrand) return;
        const action = editingBrand.status === 'ACTIVE' ? 'deactivate' : 'reactivate';
        if (window.confirm(`Are you sure you want to ${action} brand "${editingBrand.name}"?`)) {
            await toggleUserStatus(editingBrand.id);
            handleModalClose();
        }
    };

    return (
        <>
            <Card>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-content-primary">Manage Brands</h2>
                    <Button onClick={() => setIsBrandModalOpen(true)} className="flex items-center gap-2"><PlusIcon className="w-4 h-4" /> Add Brand</Button>
                 </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-border bg-surface/50 text-content-secondary">
                            <tr>
                                <th className="p-2 font-semibold">Name</th>
                                <th className="p-2 font-semibold">Pickup Locations</th>
                                <th className="p-2 font-semibold">Bank Name</th>
                                <th className="p-2 font-semibold">Account #</th>
                                <th className="p-2 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-content-primary">
                            {brands.map(b => (
                                <tr key={b.id} className={`border-b border-border last:border-b-0 ${b.status === 'INACTIVE' ? 'opacity-50 bg-red-50 dark:bg-red-900/10' : ''}`}>
                                    <td className="p-2 font-semibold">
                                        {b.name}
                                        {b.status === 'INACTIVE' && <span className="ml-2 text-xs font-bold text-red-500">(Inactive)</span>}
                                    </td>
                                    <td className="p-2">{b.pickupLocations?.length || 0} location(s)</td>
                                    <td className="p-2">{b.bankName || 'N/A'}</td>
                                    <td className="p-2">{b.accountNumber || 'N/A'}</td>
                                    <td className="p-2">
                                        <Button size="sm" variant="secondary" onClick={() => { setEditingBrand(b); setIsBrandModalOpen(true); }} aria-label={`Edit brand ${b.name}`}><EditIcon className="w-4 h-4" /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Modal isOpen={isBrandModalOpen} onClose={handleModalClose} title={editingBrand ? 'Edit Brand' : 'Add New Brand'} size="5xl">
                <form onSubmit={handleBrandFormSubmit}>
                    <div className="max-h-[70vh] overflow-y-auto p-1 pr-2 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                           <div><FormLabel htmlFor="name">Brand Name</FormLabel><FormInput id="name" name="name" value={brandFormData.name} onChange={handleBrandFormInputChange} required /></div>
                           <div><FormLabel htmlFor="username">Username (for login)</FormLabel><FormInput id="username" name="username" value={brandFormData.username} onChange={handleBrandFormInputChange} required disabled={!!editingBrand} /></div>
                           <div><FormLabel htmlFor="email">Email Address (for login)</FormLabel><FormInput id="email" name="email" type="email" value={brandFormData.email} onChange={handleBrandFormInputChange} required disabled={!!editingBrand} /></div>
                           {!editingBrand && <div><FormLabel htmlFor="password">Password</FormLabel><FormInput id="password" name="password" type="password" value={brandFormData.password} onChange={handleBrandFormInputChange} required /></div>}
                           <div><FormLabel htmlFor="companyPhone">Company Phone</FormLabel><FormInput id="companyPhone" name="companyPhone" value={brandFormData.companyPhone} onChange={handleBrandFormInputChange} /></div>
                           <div className="lg:col-span-2"><FormLabel htmlFor="officeAddress">Office Address</FormLabel><FormInput id="officeAddress" name="officeAddress" value={brandFormData.officeAddress} onChange={handleBrandFormInputChange} /></div>
                           <div><FormLabel htmlFor="correspondentName">Correspondent Name</FormLabel><FormInput id="correspondentName" name="correspondentName" value={brandFormData.correspondentName} onChange={handleBrandFormInputChange} /></div>
                           <div><FormLabel htmlFor="correspondentPhone">Correspondent Phone</FormLabel><FormInput id="correspondentPhone" name="correspondentPhone" value={brandFormData.correspondentPhone} onChange={handleBrandFormInputChange} /></div>
                        </div>

                        <div className="border-t border-border pt-3">
                            <h3 className="font-semibold text-content-primary mb-2">Pickup Locations</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {brandFormData.pickupLocations.map((loc) => (
                                    <div key={loc.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-background rounded-lg border border-border items-end">
                                        <div className="md:col-span-2 flex items-center gap-2">
                                            <div className="flex-grow"><FormLabel htmlFor={`loc-addr-${loc.id}`}>Address</FormLabel><FormInput id={`loc-addr-${loc.id}`} value={loc.address} onChange={e => handlePickupLocationChange(loc.id, 'address', e.target.value)} placeholder="Full pickup address" required /></div>
                                            <div className="flex-grow"><FormLabel htmlFor={`loc-driver-${loc.id}`}>Assigned Driver</FormLabel><FormSelect id={`loc-driver-${loc.id}`} value={loc.assignedDriverId || 'unassigned'} onChange={e => handlePickupLocationChange(loc.id, 'assignedDriverId', e.target.value)}><option value="unassigned">Unassigned</option>{activeDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</FormSelect></div>
                                            <Button type="button" variant="danger" size="sm" onClick={() => handleRemovePickupLocation(loc.id)} aria-label="Remove location"><TrashIcon className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="secondary" size="sm" onClick={handleAddPickupLocation} className="mt-2 w-full flex items-center justify-center gap-1.5"><PlusIcon className="w-4 h-4"/> Add Pickup Location</Button>
                        </div>
                        
                        <div className="border-t border-border pt-3"><h3 className="font-semibold text-content-primary mb-2">Pricing Structure</h3></div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {WEIGHT_TIERS.map(tier => (
                                <div key={tier}>
                                    <FormLabel htmlFor={`weight-${tier}`}>{tier.toFixed(1)} kg Price</FormLabel>
                                    <FormInput id={`weight-${tier}`} name={`weight-${tier}`} type="number" min="0" value={brandFormData.weightCharges[String(tier)]} onChange={(e) => handleWeightChargeChange(String(tier), e.target.value)} required />
                                </div>
                            ))}
                             <div>
                                <FormLabel htmlFor="fuelSurcharge">Fuel Surcharge (%)</FormLabel>
                                <FormInput id="fuelSurcharge" name="fuelSurcharge" type="number" min="0" value={brandFormData.fuelSurcharge} onChange={handleBrandFormInputChange} required />
                            </div>
                        </div>

                        <div className="border-t border-border pt-3"><h3 className="font-semibold text-content-primary mb-2">Bank Details</h3></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><FormLabel htmlFor="bankName">Bank Name</FormLabel><FormInput id="bankName" name="bankName" value={brandFormData.bankName} onChange={handleBrandFormInputChange} /></div>
                            <div><FormLabel htmlFor="accountTitle">Account Title</FormLabel><FormInput id="accountTitle" name="accountTitle" value={brandFormData.accountTitle} onChange={handleBrandFormInputChange} /></div>
                            <div className="md:col-span-2"><FormLabel htmlFor="accountNumber">Account Number</FormLabel><FormInput id="accountNumber" name="accountNumber" value={brandFormData.accountNumber} onChange={handleBrandFormInputChange} /></div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 mt-3 border-t border-border">
                        <div>
                            {editingBrand && (
                                <Button type="button" variant={editingBrand.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={handleToggleStatus}>
                                    {editingBrand.status === 'ACTIVE' ? 'Deactivate Brand' : 'Reactivate Brand'}
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="secondary" onClick={handleModalClose}>Cancel</Button>
                            <Button type="submit">{editingBrand ? 'Update' : 'Add'} Brand</Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </>
    );
};