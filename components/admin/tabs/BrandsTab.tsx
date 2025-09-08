import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { User, UserRole } from '../../../types';
import { Card } from '../../shared/Card';
import { Button } from '../../shared/Button';
import { Modal } from '../../shared/Modal';
import { PlusIcon } from '../../icons/PlusIcon';
import { EditIcon } from '../../icons/EditIcon';

const FormInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:bg-border ${props.className}`} />;
const FormSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${props.className}`} />;
const FormLabel = ({ children, htmlFor }: { children: React.ReactNode, htmlFor?: string }) => <label htmlFor={htmlFor} className="block mb-2 text-sm text-content-secondary font-medium">{children}</label>;

const initialFormState = { name: '', email: '', deliveryCharge: '0', assignedPickupDriverId: 'unassigned', bankName: '', accountTitle: '', accountNumber: '', companyPhone: '', correspondentName: '', correspondentPhone: '' };

export const BrandsTab: React.FC = () => {
    const { users, addNewBrand, updateBrand, toggleUserStatus } = useData();
    const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<User | null>(null);
    const [brandFormData, setBrandFormData] = useState(initialFormState);

    const brands = useMemo(() => users.filter(u => u.role === UserRole.BRAND).sort((a, b) => (a.status === 'INACTIVE' ? 1 : -1) - (b.status === 'INACTIVE' ? 1 : -1) || a.name.localeCompare(b.name)), [users]);
    const activeDrivers = useMemo(() => users.filter(u => u.role === UserRole.DRIVER && u.status === 'ACTIVE'), [users]);

    useEffect(() => {
        if (isBrandModalOpen && editingBrand) {
            setBrandFormData({ 
                name: editingBrand.name, 
                email: editingBrand.email, 
                deliveryCharge: String(editingBrand.deliveryCharge || 0), 
                assignedPickupDriverId: editingBrand.assignedPickupDriverId || 'unassigned',
                bankName: editingBrand.bankName || '',
                accountTitle: editingBrand.accountTitle || '',
                accountNumber: editingBrand.accountNumber || '',
                companyPhone: editingBrand.companyPhone || '',
                correspondentName: editingBrand.correspondentName || '',
                correspondentPhone: editingBrand.correspondentPhone || '',
            });
        } else {
            setBrandFormData(initialFormState);
        }
    }, [isBrandModalOpen, editingBrand]);

    const handleBrandFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setBrandFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleBrandFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { name, email, deliveryCharge, assignedPickupDriverId, bankName, accountTitle, accountNumber, companyPhone, correspondentName, correspondentPhone } = brandFormData;
        const dataToSave = { name, email, deliveryCharge: parseFloat(deliveryCharge), assignedPickupDriverId, bankName, accountTitle, accountNumber, companyPhone, correspondentName, correspondentPhone };

        if (editingBrand) {
            if (name && email) updateBrand(editingBrand.id, dataToSave);
        } else {
            if (name && email) addNewBrand(dataToSave);
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
                                <th className="p-2 font-semibold">Pickup Driver</th>
                                <th className="p-2 font-semibold">Bank Name</th>
                                <th className="p-2 font-semibold">Account #</th>
                                <th className="p-2 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-content-primary">
                            {brands.map(b => {
                                const assignedDriver = users.find(d => d.id === b.assignedPickupDriverId); // Find from all users to show name even if inactive
                                return (
                                <tr key={b.id} className={`border-b border-border last:border-b-0 ${b.status === 'INACTIVE' ? 'opacity-50 bg-red-50 dark:bg-red-900/10' : ''}`}>
                                    <td className="p-2 font-semibold">
                                        {b.name}
                                        {b.status === 'INACTIVE' && <span className="ml-2 text-xs font-bold text-red-500">(Inactive)</span>}
                                    </td>
                                    <td className="p-2">{assignedDriver?.name || <span className="text-content-muted">Unassigned</span>}</td>
                                    <td className="p-2">{b.bankName || 'N/A'}</td>
                                    <td className="p-2">{b.accountNumber || 'N/A'}</td>
                                    <td className="p-2">
                                        <Button size="sm" variant="secondary" onClick={() => { setEditingBrand(b); setIsBrandModalOpen(true); }} aria-label={`Edit brand ${b.name}`}><EditIcon className="w-4 h-4" /></Button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Modal isOpen={isBrandModalOpen} onClose={handleModalClose} title={editingBrand ? 'Edit Brand' : 'Add New Brand'} size="lg">
                <form onSubmit={handleBrandFormSubmit}>
                    <div className="max-h-[70vh] overflow-y-auto p-1 pr-2 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><FormLabel htmlFor="name">Brand Name</FormLabel><FormInput id="name" name="name" value={brandFormData.name} onChange={handleBrandFormInputChange} required /></div>
                            <div><FormLabel htmlFor="email">Email Address</FormLabel><FormInput id="email" name="email" type="email" value={brandFormData.email} onChange={handleBrandFormInputChange} required /></div>
                            
                            <div><FormLabel htmlFor="companyPhone">Company Phone</FormLabel><FormInput id="companyPhone" name="companyPhone" value={brandFormData.companyPhone} onChange={handleBrandFormInputChange} /></div>
                            <div></div> {/* Spacer */}
                            <div><FormLabel htmlFor="correspondentName">Correspondent Name</FormLabel><FormInput id="correspondentName" name="correspondentName" value={brandFormData.correspondentName} onChange={handleBrandFormInputChange} /></div>
                            <div><FormLabel htmlFor="correspondentPhone">Correspondent Phone</FormLabel><FormInput id="correspondentPhone" name="correspondentPhone" value={brandFormData.correspondentPhone} onChange={handleBrandFormInputChange} /></div>

                            <div><FormLabel htmlFor="deliveryCharge">Delivery Charge (PKR)</FormLabel><FormInput id="deliveryCharge" name="deliveryCharge" type="number" min="0" value={brandFormData.deliveryCharge} onChange={handleBrandFormInputChange} required /></div>
                            <div><FormLabel htmlFor="assignedPickupDriverId">Assigned Pickup Driver</FormLabel><FormSelect id="assignedPickupDriverId" name="assignedPickupDriverId" value={brandFormData.assignedPickupDriverId} onChange={handleBrandFormInputChange}><option value="unassigned">Unassigned</option>{activeDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</FormSelect></div>
                            
                            <div className="md:col-span-2 border-t border-border pt-3"><h3 className="font-semibold text-content-primary mb-2">Bank Details</h3></div>
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