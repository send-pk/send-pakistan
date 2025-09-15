import React, { useState, useMemo } from 'react';
import { User, Parcel, ParcelStatus, Invoice } from '../../../types';
import { useData } from '../../../context/DataContext';
import { Card } from '../../shared/Card';
import { Button } from '../../shared/Button';
import { Modal } from '../../shared/Modal';
import { DollarSignIcon } from '../../icons/DollarSignIcon';
import { ClockIcon } from '../../icons/ClockIcon';
import { InvoiceDownloadModal } from '../InvoiceDownloadModal';
import { DownloadIcon } from '../../icons/DownloadIcon';

const formatDatePKT = (dateString: string) => new Date(dateString).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });

const FinanceStatCard = ({ title, value, icon: Icon, colorClass = 'text-primary' }: { title: string, value: string | number, icon: React.FC<any>, colorClass?: string }) => (
    <Card className="p-0">
        <div className="p-4 flex items-center">
            <div className={`p-3 rounded-lg bg-primary/10 ${colorClass} mr-4`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm text-content-secondary">{title}</p>
                <p className="text-xl font-bold text-content-primary">{typeof value === 'number' ? `PKR ${value.toLocaleString()}` : value}</p>
            </div>
        </div>
    </Card>
);

interface FinancesViewProps {
    user: User;
    parcelsInDateRange: Parcel[];
}

export const FinancesView: React.FC<FinancesViewProps> = ({ user, parcelsInDateRange }) => {
    const { invoices, parcels: allParcels, users } = useData();
    const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
    const [downloadingInvoice, setDownloadingInvoice] = useState<Invoice | null>(null);

    const brandDetails = useMemo(() => users.find(u => u.id === user.id), [users, user.id]);

    const brandInvoices = useMemo(() => invoices.filter(inv => inv.brandId === user.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [invoices, user.id]);

    const financeStats = useMemo(() => {
        const totalPaymentReceived = brandInvoices
            .filter(inv => inv.status === 'PAID')
            .reduce((sum, inv) => sum + inv.netPayout, 0);
        
        const pendingParcels = parcelsInDateRange.filter(p =>
            p.status === ParcelStatus.DELIVERED && !p.invoiceId
        );
        const pendingPayment = pendingParcels.reduce((sum, p) => sum + (p.codAmount - p.deliveryCharge - p.tax), 0);
        
        return { totalPaymentReceived, pendingPayment };
    }, [brandInvoices, parcelsInDateRange]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-content-primary">Your Finances</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FinanceStatCard title="Total Payment Received" value={financeStats.totalPaymentReceived} icon={DollarSignIcon} colorClass="text-green-500" />
                <FinanceStatCard title="Pending Payment for Delivered Parcels" value={financeStats.pendingPayment} icon={ClockIcon} colorClass="text-yellow-500" />
            </div>
            <Card>
                <h3 className="text-xl font-bold mb-4 text-content-primary">Invoices</h3>
                {brandInvoices.length === 0 ? <p className="text-center py-8 text-content-muted">No invoices found for the selected period.</p> :
                 <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                        <thead className="border-b-2 border-border bg-surface/50 text-content-secondary">
                            <tr>
                                <th className="p-4 font-semibold">Invoice ID</th>
                                <th className="p-4 font-semibold">Date</th>
                                <th className="p-4 font-semibold text-right">Net Payout</th>
                                <th className="p-4 font-semibold text-center">Status</th>
                                <th className="p-4 font-semibold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-content-primary">
                            {brandInvoices.map(inv => (
                                <tr key={inv.id} className="border-b border-border last:border-b-0">
                                    <td className="p-4 font-mono text-primary">{inv.id.slice(-8)}</td>
                                    <td className="p-4">{formatDatePKT(inv.createdAt)}</td>
                                    <td className="p-4 text-right font-semibold">PKR {inv.netPayout.toFixed(0)}</td>
                                    <td className="p-4 text-center">
                                        {inv.status === 'PAID' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300">Paid</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300">Pending</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <Button size="sm" variant="secondary" onClick={() => setViewingInvoice(inv)}>View</Button>
                                            <Button size="sm" variant="secondary" onClick={() => setDownloadingInvoice(inv)} aria-label="Download Invoice">
                                                <DownloadIcon className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                 </div>
                }
            </Card>
            <Modal isOpen={!!viewingInvoice} onClose={() => setViewingInvoice(null)} title={`Invoice Details #${viewingInvoice?.id.slice(-8)}`} size="2xl">
                {viewingInvoice && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><p className="text-content-muted">Status</p><p className={`font-semibold ${viewingInvoice.status === 'PAID' ? 'text-green-600' : 'text-yellow-600'}`}>{viewingInvoice.status}</p></div>
                            <div><p className="text-content-muted">Generated On</p><p>{formatDatePKT(viewingInvoice.createdAt)}</p></div>
                            {viewingInvoice.status === 'PAID' && <>
                                <div><p className="text-content-muted">Paid On</p><p>{viewingInvoice.paidAt ? formatDatePKT(viewingInvoice.paidAt) : 'N/A'}</p></div>
                                <div><p className="text-content-muted">Transaction ID</p><p>{viewingInvoice.transactionId}</p></div>
                            </>}
                        </div>
                        <div className="p-4 bg-background rounded-lg border border-border">
                            <div className="flex justify-between items-center"><span className="text-content-secondary">Total COD Collected</span><span className="font-semibold">PKR {viewingInvoice.totalCOD.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center mt-1"><span className="text-content-secondary">Total Charges + Tax</span><span className="font-semibold text-red-500">- PKR {(viewingInvoice.totalCharges + viewingInvoice.totalTax).toFixed(2)}</span></div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-border"><span className="font-bold text-lg">Net Payout</span><span className="font-bold text-lg text-green-600">PKR {viewingInvoice.netPayout.toFixed(2)}</span></div>
                        </div>
                        <div>
                            <h4 className="font-semibold mt-4 mb-2">Parcels in this Invoice ({viewingInvoice.parcelIds.length})</h4>
                            <div className="max-h-60 overflow-y-auto space-y-1 pr-2">
                                {allParcels.filter(p => viewingInvoice.parcelIds.includes(p.id)).map(p => (
                                    <div key={p.id} className="flex justify-between p-2 bg-background rounded-md text-xs">
                                        <span>{p.trackingNumber} - {p.recipientName}</span>
                                        <span className="font-semibold">PKR {p.codAmount}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
             <InvoiceDownloadModal 
                isOpen={!!downloadingInvoice}
                onClose={() => setDownloadingInvoice(null)}
                invoice={downloadingInvoice}
                parcels={allParcels}
                brandDetails={brandDetails || null}
            />
        </div>
    );
};