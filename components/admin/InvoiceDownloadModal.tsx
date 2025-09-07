
import React from 'react';
import { Invoice, Parcel, User } from '../../types';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { InvoicePDF } from '../client/InvoicePDF';

interface InvoiceDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    parcels: Parcel[];
    brandDetails: User | null;
}

export const InvoiceDownloadModal: React.FC<InvoiceDownloadModalProps> = ({ isOpen, onClose, invoice, parcels, brandDetails }) => {
    if (!isOpen || !invoice || !brandDetails) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Invoice #${invoice.id.toUpperCase()}`} size="3xl">
            <div className="printable-area max-h-[70vh] overflow-y-auto border border-border bg-gray-50 dark:bg-gray-900">
                <InvoicePDF invoice={invoice} parcels={parcels} brandDetails={brandDetails} />
            </div>
            <div className="mt-6 flex justify-end no-print gap-2">
                <Button variant="secondary" onClick={onClose}>Close</Button>
                <Button onClick={handlePrint}>Print / Save as PDF</Button>
            </div>
        </Modal>
    );
};
