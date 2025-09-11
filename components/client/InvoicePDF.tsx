
import React from 'react';
import { Invoice, Parcel, User } from '../../types';
import { Logo } from '../shared/Logo';

interface InvoicePDFProps {
    invoice: Invoice;
    parcels: Parcel[];
    brandDetails: User;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, parcels, brandDetails }) => {
    const invoiceParcels = parcels.filter(p => invoice.parcelIds.includes(p.id));

    const Stamp = () => {
        const isPaid = invoice.status === 'PAID';
        const text = isPaid ? 'PAID' : 'UNPAID';
        const colorClass = isPaid ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600';

        return (
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-30 opacity-15 pointer-events-none`}>
                <div className={`text-6xl font-bold border-8 rounded-lg py-2 px-8 ${colorClass}`}>
                    {text}
                </div>
            </div>
        )
    };

    return (
        <div className="relative bg-white text-black p-6 font-sans text-sm">
            <Stamp />
            <header className="flex justify-between items-start pb-4 border-b border-gray-300">
                <div>
                    <Logo textClassName="text-3xl" iconClassName="w-7 h-7" />
                    <p className="mt-2 text-gray-600 text-xs">Lahore, Pakistan</p>
                    <p className="text-gray-600 text-xs">hello@send.com.pk</p>
                </div>
                <div className="text-right">
                    <h1 className="text-3xl font-bold text-gray-800">INVOICE</h1>
                    <p className="mt-1 text-gray-600 text-xs"><strong>Invoice #:</strong> {invoice.id.toUpperCase()}</p>
                    <p className="text-gray-600 text-xs"><strong>Date:</strong> {new Date(invoice.generatedAt).toLocaleDateString()}</p>
                </div>
            </header>

            <section className="my-6">
                <h2 className="text-xs font-semibold text-gray-500 mb-1">BILL TO</h2>
                <p className="font-bold text-base text-gray-800">{invoice.brandName}</p>
                <p className="text-gray-600 text-xs">{brandDetails?.email}</p>
            </section>

            <section>
                <table className="w-full text-left table-auto">
                    <thead className="bg-gray-100 text-gray-600 text-xs">
                        <tr>
                            <th className="p-2 font-semibold">Tracking #</th>
                            <th className="p-2 font-semibold">Order ID</th>
                            <th className="p-2 font-semibold">Recipient</th>
                            <th className="p-2 font-semibold text-right">Weight</th>
                            <th className="p-2 font-semibold text-right">COD</th>
                            <th className="p-2 font-semibold text-right">Charge</th>
                            <th className="p-2 font-semibold text-right">Tax</th>
                            <th className="p-2 font-semibold text-right">Net Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {invoiceParcels.map(p => {
                             const netAmount = p.codAmount - p.deliveryCharge - p.tax;
                             return (
                                <tr key={p.id} className="text-xs">
                                    <td className="p-2 font-mono">{p.trackingNumber}</td>
                                    <td className="p-2">{p.orderId}</td>
                                    <td className="p-2">{p.recipientName}</td>
                                    <td className="p-2 text-right">{p.weight.toFixed(1)} kg</td>
                                    <td className="p-2 text-right">{p.codAmount.toFixed(2)}</td>
                                    <td className="p-2 text-right text-red-600">-{p.deliveryCharge.toFixed(2)}</td>
                                    <td className="p-2 text-right text-red-600">-{p.tax.toFixed(2)}</td>
                                    <td className="p-2 text-right font-semibold">{netAmount.toFixed(2)}</td>
                                </tr>
                             )
                        })}
                    </tbody>
                </table>
            </section>
            
            <section className="mt-6 flex justify-end">
                <div className="w-full max-w-xs">
                    <div className="bg-gray-50 p-3 rounded-lg text-xs">
                        <div className="flex justify-between text-gray-700 mb-1">
                            <span>Total COD Collected</span>
                            <span className="font-semibold">PKR {invoice.totalCOD.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-red-600 mb-1">
                            <span>Less: Delivery Charges & Tax</span>
                            <span className="font-semibold">- PKR {(invoice.totalCharges + invoice.totalTax).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-900 font-bold text-base pt-2 mt-1 border-t border-gray-300">
                            <span>Net Payout</span>
                            <span>PKR {invoice.netPayout.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </section>
            
             <footer className="mt-8 pt-4 border-t border-gray-300 text-center text-gray-500 text-xs">
                <p>Thank you for your business!</p>
                <p>Payment to be made to the following account: {brandDetails?.bankName} - {brandDetails?.accountNumber}</p>
            </footer>
        </div>
    );
};