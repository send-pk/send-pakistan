import React, { useState, useEffect } from 'react';
import { User, Item } from '../../../types';
import { useData } from '../../../context/DataContext';
import { Card } from '../../shared/Card';
import { Button } from '../../shared/Button';
import { TrashIcon } from '../../icons/TrashIcon';
import { PlusIcon } from '../../icons/PlusIcon';
import { WEIGHT_TIERS } from '../../../constants';

const FormInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:bg-border ${props.className}`} />;
const FormLabel = ({ children, htmlFor, className }: { children: React.ReactNode, htmlFor?: string, className?: string }) => <label htmlFor={htmlFor} className={`block mb-2 text-sm text-content-secondary font-medium ${className || ''}`}>{children}</label>;
const FormSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${props.className}`} />;
const FormTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${props.className}`} />;

interface BookParcelViewProps {
    user: User;
    onBookingSuccess: () => void;
}

const initialParcelState = {
    orderId: '',
    recipientName: '',
    recipientAddress: '',
    recipientPhone: '',
    codAmount: '0',
    weight: '0.5',
    itemDetails: '',
    deliveryInstructions: '',
    isOpenParcel: false,
    pickupLocationId: '',
};

export const BookParcelView: React.FC<BookParcelViewProps> = ({ user, onBookingSuccess }) => {
    const { bookNewParcel } = useData();
    const [newParcel, setNewParcel] = useState(initialParcelState);

    useEffect(() => {
        // Pre-select the first pickup location if available
        if (user.pickupLocations && user.pickupLocations.length > 0) {
            setNewParcel(prev => ({ ...prev, pickupLocationId: user.pickupLocations![0].id }));
        }
    }, [user.pickupLocations]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        setNewParcel(prev => ({ ...prev, [target.name]: value }));
    }
    
    const handleBookParcel = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newParcel.pickupLocationId) {
            alert('Please select a pickup location.');
            return;
        }

        bookNewParcel({ 
            brandId: user.id, 
            brandName: user.name, 
            orderId: newParcel.orderId,
            recipientName: newParcel.recipientName, 
            recipientAddress: newParcel.recipientAddress, 
            recipientPhone: newParcel.recipientPhone, 
            codAmount: parseFloat(newParcel.codAmount), 
            weight: parseFloat(newParcel.weight),
            itemDetails: newParcel.itemDetails,
            deliveryInstructions: newParcel.deliveryInstructions,
            isOpenParcel: newParcel.isOpenParcel,
            pickupLocationId: newParcel.pickupLocationId,
        });
        setNewParcel(initialParcelState);
        onBookingSuccess();
    };

    return (
        <Card className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-content-primary">Book a New Parcel</h2>
            <form onSubmit={handleBookParcel} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* FIX: Add children to all FormLabel components. */}
                    <div> <FormLabel htmlFor="orderId">Order ID</FormLabel> <FormInput id="orderId" name="orderId" value={newParcel.orderId} onChange={handleInputChange} required /> </div>
                    <div> <FormLabel htmlFor="codAmount">Total COD Amount (PKR)</FormLabel> <FormInput id="codAmount" name="codAmount" type="number" min="0" value={newParcel.codAmount} onChange={handleInputChange} required /> </div>
                    <div> <FormLabel htmlFor="recipientName">Recipient Name</FormLabel> <FormInput id="recipientName" name="recipientName" value={newParcel.recipientName} onChange={handleInputChange} required /> </div>
                    <div> <FormLabel htmlFor="recipientPhone">Recipient Phone</FormLabel> <FormInput id="recipientPhone" name="recipientPhone" value={newParcel.recipientPhone} onChange={handleInputChange} required /> </div>
                    <div className="md:col-span-2"> <FormLabel htmlFor="recipientAddress">Recipient Address</FormLabel> <FormInput id="recipientAddress" name="recipientAddress" value={newParcel.recipientAddress} onChange={handleInputChange} required /> </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <FormLabel htmlFor="weight">Parcel Weight (kg)</FormLabel>
                        <FormSelect id="weight" name="weight" value={newParcel.weight} onChange={handleInputChange} required>
                           {WEIGHT_TIERS.map(w => <option key={w} value={w}>{w.toFixed(1)} kg</option>)}
                        </FormSelect>
                    </div>
                     <div>
                        <FormLabel htmlFor="pickupLocationId">Pickup Location</FormLabel>
                        <FormSelect id="pickupLocationId" name="pickupLocationId" value={newParcel.pickupLocationId} onChange={handleInputChange} required>
                           <option value="" disabled>Select a location</option>
                           {user.pickupLocations?.map(loc => <option key={loc.id} value={loc.id}>{loc.address}</option>)}
                        </FormSelect>
                        {(!user.pickupLocations || user.pickupLocations.length === 0) && <p className="text-xs text-red-500 mt-1">No pickup locations configured. Please contact admin.</p>}
                    </div>
                    <div className="md:col-span-2">
                        <FormLabel htmlFor="itemDetails">Item Details (optional)</FormLabel>
                        <FormInput id="itemDetails" name="itemDetails" value={newParcel.itemDetails} onChange={handleInputChange} placeholder="e.g., 2x Lawn Suit, 1x Perfume" />
                    </div>
                </div>
                
                <div>
                    <FormLabel htmlFor="deliveryInstructions">Delivery Instructions (optional)</FormLabel>
                    <FormTextarea id="deliveryInstructions" name="deliveryInstructions" value={newParcel.deliveryInstructions} onChange={handleInputChange} rows={2} />
                </div>

                <div className="pt-2">
                    <div className="relative flex items-start">
                        <div className="flex h-6 items-center">
                            <input
                                id="isOpenParcel"
                                name="isOpenParcel"
                                type="checkbox"
                                checked={newParcel.isOpenParcel}
                                onChange={handleInputChange}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                            <label htmlFor="isOpenParcel" className="font-medium text-content-primary">
                                Enable Open Parcel Delivery
                            </label>
                            <p className="text-content-secondary text-xs">Allow customer to check products upon delivery before payment.</p>
                        </div>
                    </div>
                     {newParcel.isOpenParcel && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-500/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
                            <p><strong>Instruction:</strong> Add an extra flyer in the parcel to bring back the products intact if customer refuses the product.</p>
                            <p><strong>CAUTION:</strong> Open parcels have a higher tendency of returns, only use this feature if you are confident about your product.</p>
                        </div>
                    )}
                </div>
                
                <div className="flex justify-end mt-6">
                    <Button type="submit" size="lg" disabled={!user.pickupLocations || user.pickupLocations.length === 0}>Book Parcel</Button>
                </div>
            </form>
        </Card>
    );
};