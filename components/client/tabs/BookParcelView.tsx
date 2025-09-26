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
            orderId: newParcel.orderId,
            recipientName: newParcel.recipientName,
            recipientAddress: newParcel.recipientAddress,
            recipientPhone: newParcel.recipientPhone,
            codAmount: parseFloat(newParcel.codAmount),
            weight: parseFloat(newParcel.weight),
            itemDetails: newParcel.itemDetails,
            deliveryInstructions: newParcel.deliveryInstructions,
            isOpenParcel: newParcel.isOpenParcel,
            brandId: user.id,
            brandName: user.name,
            pickupLocationId: newParcel.pickupLocationId, // Pass the ID
        }).then(bookedParcel => {
            if (bookedParcel) {
                onBookingSuccess();
                setNewParcel(initialParcelState); // Reset form
            } else {
                alert('There was an error booking the parcel. Please try again.');
            }
        });
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-content-primary">Book a New Parcel</h2>
            <Card>
                <form onSubmit={handleBookParcel} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            {/* FIX: Added children to FormLabel components to resolve missing prop errors. */}
                            <FormLabel htmlFor="orderId">Order ID</FormLabel>
                            <FormInput id="orderId" name="orderId" value={newParcel.orderId} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <FormLabel htmlFor="recipientName">Recipient Name</FormLabel>
                            <FormInput id="recipientName" name="recipientName" value={newParcel.recipientName} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <FormLabel htmlFor="recipientAddress">Recipient Address</FormLabel>
                            <FormInput id="recipientAddress" name="recipientAddress" value={newParcel.recipientAddress} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <FormLabel htmlFor="recipientPhone">Recipient Phone</FormLabel>
                            <FormInput id="recipientPhone" name="recipientPhone" value={newParcel.recipientPhone} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <FormLabel htmlFor="codAmount">Cash on Delivery Amount (PKR)</FormLabel>
                            <FormInput id="codAmount" name="codAmount" type="number" min="0" value={newParcel.codAmount} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <FormLabel htmlFor="weight">Weight (kg)</FormLabel>
                            <FormSelect id="weight" name="weight" value={newParcel.weight} onChange={handleInputChange} required>
                                {WEIGHT_TIERS.map(w => <option key={w} value={w}>{w.toFixed(1)} kg</option>)}
                            </FormSelect>
                        </div>
                         <div>
                            <FormLabel htmlFor="pickupLocationId">Pickup Location</FormLabel>
                            <FormSelect id="pickupLocationId" name="pickupLocationId" value={newParcel.pickupLocationId} onChange={handleInputChange} required>
                                <option value="">Select a location</option>
                                {user.pickupLocations?.map(loc => <option key={loc.id} value={loc.id}>{loc.address}</option>)}
                            </FormSelect>
                             {(!user.pickupLocations || user.pickupLocations.length === 0) && <p className="text-xs text-red-500 mt-1">No pickup locations configured. Please contact support.</p>}
                        </div>
                        <div>
                            <FormLabel htmlFor="itemDetails">Item Details</FormLabel>
                            <FormInput id="itemDetails" name="itemDetails" value={newParcel.itemDetails} onChange={handleInputChange} placeholder="e.g., 2x Lawn Suits" required />
                        </div>
                    </div>
                    <div>
                        <FormLabel htmlFor="deliveryInstructions">Delivery Instructions (Optional)</FormLabel>
                        <FormTextarea id="deliveryInstructions" name="deliveryInstructions" value={newParcel.deliveryInstructions} onChange={handleInputChange} rows={2} />
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="isOpenParcel" name="isOpenParcel" checked={newParcel.isOpenParcel} onChange={handleInputChange} className="h-4 w-4 rounded border-border text-primary focus:ring-primary"/>
                        <FormLabel htmlFor="isOpenParcel" className="mb-0">This is an "Open Parcel"</FormLabel>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" size="lg">Book Parcel</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};