import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { Parcel, Item } from '../../types';
import { useData } from '../../context/DataContext';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';

const FormInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:bg-border ${props.className}`} />;
const FormLabel = ({ children, htmlFor, className }: { children: React.ReactNode, htmlFor?: string, className?: string }) => <label htmlFor={htmlFor} className={`block mb-2 text-sm text-content-secondary font-medium ${className || ''}`}>{children}</label>;
const FormTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${props.className}`} />;

interface ExchangeParcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalParcel: Parcel;
    onExchangeSuccess: (parcels: { outboundParcel: Parcel; returnParcel: Parcel; }) => void;
}

const DynamicItemList: React.FC<{
    items: Item[];
    onItemChange: (index: number, field: 'name' | 'quantity', value: string | number) => void;
    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
}> = ({ items, onItemChange, onAddItem, onRemoveItem }) => {
    return (
        <div className="space-y-2">
            {items.map((item, index) => (
                <div key={index} className="flex items-end gap-2">
                    <div className="w-24">
                        {/* FIX: Added children to FormLabel component. */}
                        <FormLabel htmlFor={`itemQty-${index}`} className="text-xs">Qty</FormLabel>
                        <FormInput id={`itemQty-${index}`} type="number" min="1" value={item.quantity} onChange={(e) => onItemChange(index, 'quantity', parseInt(e.target.value, 10) || 1)} required />
                    </div>
                    <div className="flex-grow">
                        {/* FIX: Added children to FormLabel component. */}
                        <FormLabel htmlFor={`itemName-${index}`} className="text-xs">Item Name</FormLabel>
                        <FormInput id={`itemName-${index}`} value={item.name} onChange={(e) => onItemChange(index, 'name', e.target.value)} placeholder="e.g., Lawn Suit" required />
                    </div>
                    <Button type="button" variant="danger" size="sm" onClick={() => onRemoveItem(index)} disabled={items.length === 1} aria-label="Remove Item">
                        <TrashIcon className="w-4 h-4" />
                    </Button>
                </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={onAddItem} className="w-full flex items-center justify-center gap-1.5 text-xs py-1">
                <PlusIcon className="w-3 h-3" /> Add Item
            </Button>
        </div>
    );
};


export const ExchangeParcelModal: React.FC<ExchangeParcelModalProps> = ({ isOpen, onClose, originalParcel, onExchangeSuccess }) => {
    const { initiateExchange } = useData();
    const [formData, setFormData] = useState({
        orderId: '',
        codAmount: '0',
        deliveryInstructions: '',
        outboundItemDetails: '',
        returnItems: [{ name: '', quantity: 1 }] as Item[],
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleItemChange = (index: number, field: 'name' | 'quantity', value: string | number) => {
        setFormData(prev => {
            const items = [...prev.returnItems];
            items[index] = { ...items[index], [field]: value };
            return { ...prev, returnItems: items };
        });
    };
    
    const handleAddItem = () => {
        setFormData(prev => ({ ...prev, returnItems: [...prev.returnItems, { name: '', quantity: 1 }] }));
    };
    
    const handleRemoveItem = (index: number) => {
        setFormData(prev => ({ ...prev, returnItems: prev.returnItems.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const validReturnItems = formData.returnItems.filter(item => item.name.trim() !== '' && item.quantity > 0);

        if (validReturnItems.length === 0) {
            alert('Please add at least one valid return item.');
            return;
        }

        const newParcels = await initiateExchange(
            originalParcel.id,
            {
                orderId: formData.orderId,
                itemDetails: formData.outboundItemDetails,
                codAmount: parseFloat(formData.codAmount),
                deliveryInstructions: formData.deliveryInstructions,
            },
            validReturnItems
        );
        if (newParcels) {
            onExchangeSuccess(newParcels);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Initiate Exchange for ${originalParcel.orderId}`} size="2xl">
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    {/* Left Column */}
                    <div className="space-y-3">
                        <div className="space-y-3 p-3 bg-background rounded-lg border border-border">
                            <h3 className="font-semibold text-lg">New Outbound Parcel</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    {/* FIX: Added children to FormLabel component. */}
                                    <FormLabel htmlFor="orderId">New Order ID</FormLabel>
                                    <FormInput id="orderId" name="orderId" value={formData.orderId} onChange={handleInputChange} required autoFocus/>
                                </div>
                                <div>
                                    {/* FIX: Added children to FormLabel component. */}
                                    <FormLabel htmlFor="codAmount">New COD Amount</FormLabel>
                                    <FormInput id="codAmount" name="codAmount" type="number" min="0" value={formData.codAmount} onChange={handleInputChange} required />
                                </div>
                            </div>
                             <div>
                                {/* FIX: Added children to FormLabel component. */}
                                <FormLabel htmlFor="outboundItemDetails">Item(s) to Deliver</FormLabel>
                                <FormInput id="outboundItemDetails" name="outboundItemDetails" value={formData.outboundItemDetails} onChange={handleInputChange} placeholder="e.g., 2x Lawn Suit" required />
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                         <div className="space-y-3 p-3 bg-background rounded-lg border border-border">
                            <h3 className="font-semibold text-lg">Return Item(s)</h3>
                             <div>
                                {/* FIX: Added children to FormLabel component. */}
                                <FormLabel>Items to Collect</FormLabel>
                                <DynamicItemList 
                                    items={formData.returnItems}
                                    onItemChange={handleItemChange}
                                    onAddItem={handleAddItem}
                                    onRemoveItem={handleRemoveItem}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                 <div>
                    {/* FIX: Added children to FormLabel component. */}
                    <FormLabel htmlFor="deliveryInstructions">Delivery Instructions (optional)</FormLabel>
                    <FormTextarea id="deliveryInstructions" name="deliveryInstructions" value={formData.deliveryInstructions} onChange={handleInputChange} rows={2} />
                </div>

                <div className="p-3 bg-yellow-50 dark:bg-yellow-500/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                    <p><strong>Instruction:</strong> Add an additional flyer in the parcel for customer to return the products.</p>
                    <p><strong>Disclaimer:</strong> SEND is not responsible for exchanged product/s condition received from the customer.</p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border mt-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Initiate Exchange</Button>
                </div>
            </form>
        </Modal>
    );
};