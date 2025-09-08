import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { Parcel, ParcelStatus, User, UserRole, Invoice, ReconciliationDetails } from '../../../types';
import { Card } from '../../shared/Card';
import { Button } from '../../shared/Button';
import { Modal } from '../../shared/Modal';
import { FinanceStatCard } from '../shared/StatCards';
import { DollarSignIcon } from '../../icons/DollarSignIcon';
import { CheckCircleIcon } from '../../icons/CheckCircleIcon';
import { UserIcon } from '../../icons/UserIcon';
import { AlertTriangleIcon } from '../../icons/AlertTriangleIcon';
import { TruckIcon } from '../../icons/TruckIcon';
import { Checkbox } from '../../shared/Checkbox';
import { ClockIcon } from '../../icons/ClockIcon';
import { PlusIcon } from '../../icons/PlusIcon';
import { TrashIcon } from '../../icons/TrashIcon';
import { DownloadIcon } from '../../icons/DownloadIcon';
import { InvoiceDownloadModal } from '../InvoiceDownloadModal';

const formatDatePKT = (dateString: string) => new Date(dateString).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
const FormInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:bg-border ${props.className || ''}`} />;
const FormLabel = ({ children, htmlFor, className }: { children: React.ReactNode, htmlFor?: string, className?: string }) => <label htmlFor={htmlFor} className={`block mb-2 text-sm text-content-secondary font-medium ${className || ''}`}>{children}</label>;


interface FinanceTabProps {
    parcelsForDateRange: Parcel[]; // Date-filtered parcels for stats
    allParcels: Parcel[]; // ALL parcels for tables
    users: User[];
}

interface DriverSummary {
    driverId: string;
    driverName: string;
    deliveredCount: number;
    totalCODHandled: number;
    codPending: number;
};

export const FinanceTab: React.FC<FinanceTabProps> = ({ parcelsForDateRange, allParcels, users }) => {
    const { invoices, generateInvoiceForPayout, markInvoiceAsPaid, reconcileDriverCod, parcels } = useData();
    const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
    const [downloadingInvoice, setDownloadingInvoice] = useState<Invoice | null>(null);
    const [transactionId, setTransactionId] = useState('');
    const [isReconModalOpen, setIsReconModalOpen] = useState(false);
    const [reconDriver, setReconDriver] = useState<User | null>(null);
    const [selectedReconParcels, setSelectedReconParcels] = useState<Set<string>>(new Set());
    
    // State for the new reconciliation details form
    const [reconCashAmount, setReconCashAmount] = useState('');
    const [reconTransfers, setReconTransfers] = useState<{ amount: string, transactionId: string }[]>([{ amount: '', transactionId: '' }]);

    const drivers = useMemo(() => users.filter(u => u.role === UserRole.DRIVER), [users]);

    const { readyForPayout, generatedPayouts } = useMemo(() => {
        const deliveredNotInvoiced = allParcels.filter(p => p.status === ParcelStatus.DELIVERED && !p.invoiceId);
        const groupedByBrand = deliveredNotInvoiced.reduce((acc, p) => {
            if (!acc[p.brandId]) acc[p.brandId] = { brandName: p.brandName, parcels: [] };
            acc[p.brandId].parcels.push(p);
            return acc;
        }, {} as Record<string, { brandName: string; parcels: Parcel[] }>);

        const ready = Object.entries(groupedByBrand).map(([brandId, data]) => {
            const totalCOD = data.parcels.reduce((sum, p) => sum + p.codAmount, 0);
            const totalCharges = data.parcels.reduce((sum, p) => sum + p.deliveryCharge, 0);
            const totalTax = data.parcels.reduce((sum, p) => sum + p.tax, 0);
            return { brandId, brandName: data.brandName, parcelIds: data.parcels.map(p => p.id), parcelCount: data.parcels.length, totalCOD, totalCharges, totalTax, netPayout: totalCOD - totalCharges - totalTax };
        });

        return { readyForPayout: ready, generatedPayouts: invoices.sort((a,b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()) };
    }, [allParcels, invoices]);

    const financeStats = useMemo(() => {
        // Stats for the selected date range
        const deliveredParcelsInDateRange = parcelsForDateRange.filter(p => p.status === ParcelStatus.DELIVERED || (p.codAmount > 0 && !p.isCodReconciled));
        const totalCodCollected = deliveredParcelsInDateRange.reduce((sum, p) => sum + p.codAmount, 0);
        const totalReconciled = deliveredParcelsInDateRange.filter(p => p.isCodReconciled).reduce((sum, p) => sum + p.codAmount, 0);
        const paidParcelsInDateRange = parcelsForDateRange.filter(p => [ParcelStatus.DELIVERED, ParcelStatus.RETURNED].includes(p.status));
        const totalDeliveryCharges = paidParcelsInDateRange.reduce((sum, p) => sum + p.deliveryCharge, 0);
        const totalTaxCollected = paidParcelsInDateRange.reduce((sum, p) => sum + p.tax, 0);

        // Global financial stats (not date-dependent)
        const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
        const pendingInvoices = invoices.filter(inv => inv.status === 'PENDING');
        const totalPaidToBrands = paidInvoices.reduce((sum, inv) => sum + inv.netPayout, 0);
        const pendingPaymentToBrands = pendingInvoices.reduce((sum, inv) => sum + inv.netPayout, 0);

        return { 
            totalCodCollected, 
            totalReconciled, 
            leftToReconcile: totalCodCollected - totalReconciled, 
            totalPaidToBrands,
            pendingPaymentToBrands,
            totalTaxCollected, 
            totalDeliveryCharges
        };
    }, [parcelsForDateRange, invoices]);

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (payingInvoice && transactionId) { markInvoiceAsPaid(payingInvoice.id, transactionId); setPayingInvoice(null); setTransactionId(''); }
    };
    
    // --- Reconciliation Logic ---
    const driverSummary: DriverSummary[] = useMemo(() => {
        return drivers.map(driver => {
            const driverParcels = allParcels.filter(p => p.deliveryDriverId === driver.id && p.status === ParcelStatus.DELIVERED);
            return { driverId: driver.id, driverName: driver.name, deliveredCount: driverParcels.length, totalCODHandled: driverParcels.reduce((sum, p) => sum + p.codAmount, 0), codPending: driverParcels.filter(p => !p.isCodReconciled).reduce((sum, p) => sum + p.codAmount, 0) };
        });
    }, [allParcels, drivers]);

    const unreconciledParcelsForDriver = useMemo(() => {
        if (!reconDriver) return [];
        return allParcels.filter(p => p.deliveryDriverId === reconDriver.id && p.status === ParcelStatus.DELIVERED && !p.isCodReconciled);
    }, [allParcels, reconDriver]);

    const totalSelectedReconAmount = useMemo(() => {
        return Array.from(selectedReconParcels).reduce((sum, id) => sum + (unreconciledParcelsForDriver.find(p => p.id === id)?.codAmount || 0), 0)
    }, [selectedReconParcels, unreconciledParcelsForDriver]);

    const totalEnteredReconAmount = useMemo(() => {
        const cash = parseFloat(reconCashAmount) || 0;
        const online = reconTransfers.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        return cash + online;
    }, [reconCashAmount, reconTransfers]);
    
    const isReconAmountMatched = useMemo(() => {
        if (totalSelectedReconAmount === 0) return false;
        // Use a small epsilon for float comparison
        return Math.abs(totalSelectedReconAmount - totalEnteredReconAmount) < 0.01;
    }, [totalSelectedReconAmount, totalEnteredReconAmount]);

    const resetReconForm = () => {
        setSelectedReconParcels(new Set());
        setReconCashAmount('');
        setReconTransfers([{ amount: '', transactionId: '' }]);
    };
    
    useEffect(() => {
        // Reset form when modal opens
        if (isReconModalOpen) {
            resetReconForm();
        }
    }, [isReconModalOpen]);

    const handleReconParcelSelect = (parcelId: string) => setSelectedReconParcels(prev => { const s = new Set(prev); if (s.has(parcelId)) s.delete(parcelId); else s.add(parcelId); return s; });
    const handleReconSelectAll = () => setSelectedReconParcels(new Set(unreconciledParcelsForDriver.map(p => p.id)));
    const handleAddTransfer = () => setReconTransfers(prev => [...prev, { amount: '', transactionId: '' }]);
    const handleRemoveTransfer = (index: number) => setReconTransfers(prev => prev.filter((_, i) => i !== index));
    const handleTransferChange = (index: number, field: 'amount' | 'transactionId', value: string) => {
        setReconTransfers(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
    };

    const handleReconSubmit = () => {
        if (!reconDriver || selectedReconParcels.size === 0 || !isReconAmountMatched) return;
        
        const cashAmount = parseFloat(reconCashAmount) || 0;
        const transfers = reconTransfers
            .filter(t => parseFloat(t.amount) > 0)
            .map(t => ({ amount: parseFloat(t.amount), transactionId: t.transactionId || undefined }));

        let method: 'Cash' | 'Online' | 'Mixed';
        if (cashAmount > 0 && transfers.length > 0) {
            method = 'Mixed';
        } else if (cashAmount > 0) {
            method = 'Cash';
        } else if (transfers.length > 0) {
            method = 'Online';
        } else {
            // This case should be blocked by the disabled button, but as a fallback.
            return;
        }
        
        const details: ReconciliationDetails = {
            method,
            cashAmount: cashAmount > 0 ? cashAmount : undefined,
            transfers: transfers.length > 0 ? transfers : undefined
        };

        reconcileDriverCod(reconDriver.id, Array.from(selectedReconParcels), details);
        setIsReconModalOpen(false);
        setReconDriver(null);
    };
    
    const brandDetails = downloadingInvoice ? users.find(u => u.id === downloadingInvoice.brandId) : null;

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold mb-4 text-content-primary">Finances</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <FinanceStatCard title="Total COD Collected" value={financeStats.totalCodCollected} icon={DollarSignIcon} colorClass="text-green-500" bgColorClass="bg-green-100 dark:bg-green-500/20" />
                <FinanceStatCard title="Total Reconciled" value={financeStats.totalReconciled} icon={CheckCircleIcon} colorClass="text-blue-500" bgColorClass="bg-blue-100 dark:bg-blue-500/20" />
                <FinanceStatCard title="Left to Reconcile" value={financeStats.leftToReconcile} icon={AlertTriangleIcon} colorClass="text-red-500" bgColorClass="bg-red-100 dark:bg-red-500/20" />
                <FinanceStatCard title="Paid to Brands" value={financeStats.totalPaidToBrands} icon={UserIcon} colorClass="text-sky-500" bgColorClass="bg-sky-100 dark:bg-sky-500/20" />
                <FinanceStatCard title="Pending Payment" value={financeStats.pendingPaymentToBrands} icon={ClockIcon} colorClass="text-orange-500" bgColorClass="bg-orange-100 dark:bg-orange-500/20" />
                <FinanceStatCard title="Tax Collected" value={financeStats.totalTaxCollected} icon={DollarSignIcon} colorClass="text-yellow-500" bgColorClass="bg-yellow-100 dark:bg-yellow-500/20" />
                <FinanceStatCard title="Delivery Charges" value={financeStats.totalDeliveryCharges} icon={TruckIcon} colorClass="text-cyan-500" bgColorClass="bg-cyan-100 dark:bg-cyan-500/20" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
               <Card>
                    <h2 className="text-lg font-bold mb-4">Ready for Payout</h2>
                    {readyForPayout.length === 0 ? <p className="text-center text-content-muted py-6">No brands have parcels ready for payout.</p> :
                    <div className="space-y-3">
                        {readyForPayout.map(payout => (
                            <div key={payout.brandId} className="p-3 bg-background rounded-lg border border-border">
                                <div className="flex justify-between items-start">
                                    <div><h3 className="font-bold">{payout.brandName}</h3><p className="text-sm text-content-secondary">{payout.parcelCount} delivered parcels</p></div>
                                    <Button size="sm" onClick={() => generateInvoiceForPayout(payout.brandId, payout.parcelIds)}>Generate Invoice</Button>
                                </div>
                                <div className="mt-2 pt-2 border-t border-border grid grid-cols-3 text-center text-sm">
                                    <div><span className="text-xs text-content-muted">Total COD</span><p className="font-semibold">PKR {payout.totalCOD.toLocaleString()}</p></div>
                                    <div><span className="text-xs text-content-muted">Charges & Tax</span><p className="font-semibold text-red-500">- PKR {(payout.totalCharges + payout.totalTax).toLocaleString()}</p></div>
                                    <div><span className="text-xs text-content-muted">Net Payout</span><p className="font-bold text-green-600">PKR {payout.netPayout.toLocaleString()}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>}
                </Card>
                 <Card>
                    <h2 className="text-lg font-bold mb-4">Generated Invoices</h2>
                    {generatedPayouts.length === 0 ? <p className="text-center text-content-muted py-6">No invoices generated yet.</p> :
                     <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-surface/50 text-content-secondary"><tr><th className="p-2 font-semibold">Brand</th><th className="p-2 font-semibold">Date</th><th className="p-2 font-semibold text-right">Amount</th><th className="p-2 font-semibold text-center">Status</th><th className="p-2 font-semibold text-center">Actions</th></tr></thead>
                            <tbody className="text-content-primary">{generatedPayouts.map(inv => (<tr key={inv.id} className="border-b border-border last:border-b-0"><td className="p-2 font-semibold">{inv.brandName}</td><td className="p-2">{formatDatePKT(inv.generatedAt)}</td><td className="p-2 text-right font-semibold">PKR {inv.netPayout.toLocaleString()}</td><td className="p-2 text-center">{inv.status === 'PENDING' ? (<Button size="sm" variant="secondary" onClick={() => setPayingInvoice(inv)}>Pay</Button>) : (<span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300">Paid</span>)}</td><td className="p-2 text-center"><Button size="sm" variant="secondary" onClick={() => setDownloadingInvoice(inv)} aria-label="Download Invoice"><DownloadIcon className="w-4 h-4" /></Button></td></tr>))}</tbody></table></div>}
                </Card>
            </div>

             <Card>
                <h2 className="text-lg font-bold mb-4">Driver COD Reconciliation</h2>
                 <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-surface/50 text-content-secondary"><tr><th className="p-2 font-semibold">Driver</th><th className="p-2 font-semibold text-right">Delivered</th><th className="p-2 font-semibold text-right">COD Handled</th><th className="p-2 font-semibold text-right">Pending Recon</th><th className="p-2"></th></tr></thead>
                        <tbody className="text-content-primary">{driverSummary.map(d => (<tr key={d.driverId} className="border-b border-border last:border-b-0"><td className="p-2 font-semibold">{d.driverName}</td><td className="p-2 text-right">{d.deliveredCount}</td><td className="p-2 text-right">PKR {d.totalCODHandled.toLocaleString()}</td><td className="p-2 text-right font-bold text-red-500">PKR {d.codPending.toLocaleString()}</td><td className="p-2 text-center">{d.codPending > 0 && <Button size="sm" variant="secondary" onClick={() => { setReconDriver(drivers.find(dr => dr.id === d.driverId) || null); setIsReconModalOpen(true); }}>Reconcile</Button>}</td></tr>))}</tbody></table></div>
            </Card>

            <Modal isOpen={!!payingInvoice} onClose={() => setPayingInvoice(null)} title={`Pay Invoice #${payingInvoice?.id.slice(-6)}`}>
                <form onSubmit={handlePaymentSubmit}><p className="mb-3">You are about to mark the invoice for <strong>{payingInvoice?.brandName}</strong> amounting to <strong>PKR {payingInvoice?.netPayout.toFixed(2)}</strong> as paid.</p><label htmlFor="transactionId" className="block mb-2 text-sm text-content-secondary font-medium">Transaction ID / Reference</label><input id="transactionId" value={transactionId} onChange={e => setTransactionId(e.target.value)} required autoFocus className="w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors" /><div className="flex justify-end gap-2 mt-4"><Button type="button" variant="secondary" onClick={() => setPayingInvoice(null)}>Cancel</Button><Button type="submit">Mark as Paid</Button></div></form>
            </Modal>
            
            <Modal isOpen={isReconModalOpen} onClose={() => { setIsReconModalOpen(false); setReconDriver(null); }} title={`Reconcile COD for ${reconDriver?.name}`} size="3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Left side: Parcel Selection */}
                    <div>
                        <h3 className="font-semibold text-content-primary mb-2">1. Select Parcels to Reconcile</h3>
                        <div className="max-h-[40vh] overflow-y-auto space-y-1.5 p-1.5 bg-background rounded-lg border border-border">
                            {unreconciledParcelsForDriver.length > 0 ? unreconciledParcelsForDriver.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-1.5 bg-surface rounded-md border border-border">
                                    <div className="flex items-center gap-2">
                                        <Checkbox checked={selectedReconParcels.has(p.id)} onChange={() => handleReconParcelSelect(p.id)} />
                                        <div>
                                            <p className="text-xs font-mono">{p.trackingNumber}</p>
                                            <p className="text-sm font-semibold">{p.recipientName}</p>
                                        </div>
                                    </div>
                                    <span className="font-semibold text-sm">PKR {p.codAmount.toLocaleString()}</span>
                                </div>
                            )) : <p className="text-center text-content-muted p-4">No unreconciled parcels for this driver.</p>}
                        </div>
                         {unreconciledParcelsForDriver.length > 0 && <Button variant="secondary" size="sm" onClick={handleReconSelectAll} className="mt-2">Select All</Button>}
                    </div>
                    {/* Right side: Payment Details */}
                    <div>
                        <h3 className="font-semibold text-content-primary mb-2">2. Enter Payment Details</h3>
                        <div className="space-y-3 p-2 bg-background rounded-lg border border-border">
                             <div>
                                <FormLabel htmlFor="cashAmount">Cash Amount</FormLabel>
                                <FormInput id="cashAmount" type="number" placeholder="0.00" value={reconCashAmount} onChange={e => setReconCashAmount(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <FormLabel>Online Transfers</FormLabel>
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                    {reconTransfers.map((transfer, index) => (
                                        <div key={index} className="flex items-end gap-2 p-1.5 bg-surface border border-border rounded-md">
                                            <div className="flex-grow"><FormLabel htmlFor={`amount-${index}`} className="text-xs">Amount</FormLabel><FormInput id={`amount-${index}`} type="number" placeholder="Amount" value={transfer.amount} onChange={e => handleTransferChange(index, 'amount', e.target.value)} required/></div>
                                            <div className="flex-grow"><FormLabel htmlFor={`txid-${index}`} className="text-xs">Transaction ID (Optional)</FormLabel><FormInput id={`txid-${index}`} type="text" placeholder="Ref / Tx ID" value={transfer.transactionId} onChange={e => handleTransferChange(index, 'transactionId', e.target.value)} /></div>
                                            {reconTransfers.length > 1 && <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveTransfer(index)} aria-label="Remove Transfer"><TrashIcon className="w-4 h-4"/></Button>}
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" variant="secondary" size="sm" onClick={handleAddTransfer} className="w-full flex items-center justify-center gap-1"><PlusIcon className="w-4 h-4"/> Add Transfer</Button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex justify-between items-center mb-3 p-2 rounded-lg bg-background border border-border">
                        <div className="text-left">
                            <p className="text-sm text-content-secondary">Selected Parcels Total</p>
                            <p className="font-bold text-base text-primary">PKR {totalSelectedReconAmount.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                            <p className={`font-bold text-base transition-colors ${isReconAmountMatched ? 'text-green-500' : 'text-red-500'}`}>{isReconAmountMatched ? 'MATCHED' : 'NOT MATCHED'}</p>
                        </div>
                         <div className="text-right">
                            <p className="text-sm text-content-secondary">Amount Entered</p>
                            <p className={`font-bold text-base ${isReconAmountMatched ? 'text-green-500' : 'text-red-500'}`}>PKR {totalEnteredReconAmount.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => { setIsReconModalOpen(false); setReconDriver(null); }}>Cancel</Button>
                        <Button onClick={handleReconSubmit} disabled={!isReconAmountMatched}>Reconcile {selectedReconParcels.size} Parcels</Button>
                    </div>
                </div>
            </Modal>

            <InvoiceDownloadModal 
                isOpen={!!downloadingInvoice}
                onClose={() => setDownloadingInvoice(null)}
                invoice={downloadingInvoice}
                parcels={parcels}
                brandDetails={brandDetails || null}
            />
        </div>
    );
};