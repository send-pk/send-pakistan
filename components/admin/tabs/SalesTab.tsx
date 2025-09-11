import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { User, UserRole, Parcel, ParcelStatus } from '../../../types';
import { Card } from '../../shared/Card';
import { Button } from '../../shared/Button';
import { Modal } from '../../shared/Modal';
import { PlusIcon } from '../../icons/PlusIcon';
import { EditIcon } from '../../icons/EditIcon';
import { FinanceStatCard } from '../shared/StatCards';
import { DollarSignIcon } from '../../icons/DollarSignIcon';
import { PackageIcon } from '../../icons/PackageIcon';
import { TruckIcon } from '../../icons/TruckIcon';
import { TrashIcon } from '../../icons/TrashIcon';
import { PrinterIcon } from '../../icons/PrinterIcon';
import { CheckCircleIcon } from '../../icons/CheckCircleIcon';

const FormInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:bg-border ${props.className}`} />;
const FormLabel = ({ children, htmlFor }: { children: React.ReactNode, htmlFor?: string }) => <label htmlFor={htmlFor} className="block mb-1 text-sm text-content-secondary font-medium">{children}</label>;
const FormSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-content-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${props.className}`} />;

const initialFormState = { name: '', email: '', baseSalary: '0', commissionRate: '0', perPickupCommission: '0', perDeliveryCommission: '0', brandCommissions: {} as { [key: string]: string } };

interface SalesTabProps {
    parcels: Parcel[];
    dateFilter: string;
    customStartDate: string;
    customEndDate: string;
}

export const SalesTab: React.FC<SalesTabProps> = ({ parcels, dateFilter, customStartDate, customEndDate }) => {
    const { users, salaryPayments, markSalaryAsPaid, addNewSalesManager, updateSalesManager, addNewDriver, updateDriver, addNewDirectSales, updateDirectSales, toggleUserStatus } = useData();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [newUserRole, setNewUserRole] = useState<UserRole | null>(null);
    const [formData, setFormData] = useState(initialFormState);
    
    const [payingUserData, setPayingUserData] = useState<any | null>(null);
    const [transactionId, setTransactionId] = useState('');
    const [printingUserId, setPrintingUserId] = useState<string | null>(null);


    const brands = useMemo(() => users.filter(u => u.role === UserRole.BRAND), [users]);

    useEffect(() => {
        if (isModalOpen && editingUser) {
            const brandCommissionsStr: { [key: string]: string } = {};
            if (editingUser.brandCommissions) {
                for (const brandId in editingUser.brandCommissions) {
                    brandCommissionsStr[brandId] = String(editingUser.brandCommissions[brandId]);
                }
            }
            setFormData({
                name: editingUser.name,
                email: editingUser.email,
                baseSalary: String(editingUser.baseSalary || 0),
                commissionRate: String(editingUser.commissionRate || 0),
                perPickupCommission: String(editingUser.perPickupCommission || 0),
                perDeliveryCommission: String(editingUser.perDeliveryCommission || 0),
                brandCommissions: brandCommissionsStr,
            });
        } else {
            setFormData(initialFormState);
        }
    }, [isModalOpen, editingUser]);
    
    useEffect(() => {
        const afterPrintHandler = () => {
            setPrintingUserId(null);
        };
        window.addEventListener('afterprint', afterPrintHandler);
        return () => window.removeEventListener('afterprint', afterPrintHandler);
    }, []);

    const companyStats = useMemo(() => {
        const totalParcels = parcels.length;
        const totalRevenue = parcels.reduce((sum, p) => sum + p.deliveryCharge + p.tax, 0);
        const averageCharge = totalParcels > 0 ? totalRevenue / totalParcels : 0;
        return { totalParcels, totalRevenue, averageCharge };
    }, [parcels]);

    const salesManagers = useMemo(() => users.filter(u => u.role === UserRole.SALES_MANAGER), [users]);
    const drivers = useMemo(() => users.filter(u => u.role === UserRole.DRIVER), [users]);
    const directSales = useMemo(() => users.filter(u => u.role === UserRole.DIRECT_SALES), [users]);

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setNewUserRole(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleBrandCommissionChange = (brandId: string, rate: string) => {
        setFormData(prev => ({...prev, brandCommissions: { ...prev.brandCommissions, [brandId]: rate } }));
    };
    const handleAddBrandToManager = (brandId: string) => {
        if (brandId && !formData.brandCommissions.hasOwnProperty(brandId)) {
            handleBrandCommissionChange(brandId, '0');
        }
    };
    const handleRemoveBrandFromManager = (brandId: string) => {
        setFormData(prev => {
            const newCommissions = { ...prev.brandCommissions };
            delete newCommissions[brandId];
            return { ...prev, brandCommissions: newCommissions };
        });
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const role = editingUser?.role || newUserRole;
        if (!role) return;

        const brandCommissionsNum: { [key: string]: number } = {};
        for(const brandId in formData.brandCommissions) {
            brandCommissionsNum[brandId] = parseFloat(formData.brandCommissions[brandId]) || 0;
        }

        const dataToSave = {
            name: formData.name, email: formData.email,
            baseSalary: parseFloat(formData.baseSalary) || 0,
            commissionRate: parseFloat(formData.commissionRate) || 0,
            perPickupCommission: parseFloat(formData.perPickupCommission) || 0,
            perDeliveryCommission: parseFloat(formData.perDeliveryCommission) || 0,
            brandCommissions: brandCommissionsNum,
        };

        if (editingUser) {
            if (role === UserRole.SALES_MANAGER) updateSalesManager(editingUser.id, dataToSave);
            else if (role === UserRole.DRIVER) updateDriver(editingUser.id, dataToSave);
            else if (role === UserRole.DIRECT_SALES) updateDirectSales(editingUser.id, dataToSave);
        } else {
            if (role === UserRole.SALES_MANAGER) addNewSalesManager(dataToSave);
            else if (role === UserRole.DRIVER) addNewDriver(dataToSave);
            else if (role === UserRole.DIRECT_SALES) addNewDirectSales(dataToSave);
        }
        handleModalClose();
    };

    const handleToggleStatus = async () => {
        if (!editingUser) return;
        if (window.confirm(`Are you sure you want to change status for "${editingUser.name}"?`)) {
            await toggleUserStatus(editingUser.id);
            handleModalClose();
        }
    };
    
    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (payingUserData && transactionId) {
            markSalaryAsPaid({ ...payingUserData, transactionId });
            setPayingUserData(null);
            setTransactionId('');
        }
    };

    const handlePrintAll = () => {
        setPrintingUserId(null);
        setTimeout(() => window.print(), 100);
    };

    const handlePrintSingle = (userId: string) => {
        setPrintingUserId(userId);
        setTimeout(() => window.print(), 100);
    };

    const getPeriodDates = () => {
        if (dateFilter === 'today') {
            const today = new Date().toISOString().split('T')[0];
            return { periodStartDate: today, periodEndDate: today };
        }
        if (dateFilter === 'all') {
            return { periodStartDate: '2000-01-01', periodEndDate: new Date().toISOString().split('T')[0] };
        }
        return { periodStartDate: customStartDate, periodEndDate: customEndDate };
    };
    
    const getDateRangeText = () => {
        if (dateFilter === 'today') return `Date: ${new Date().toLocaleDateString()}`;
        if (dateFilter === 'all') return 'Date Range: All Time';
        if (customStartDate && customEndDate) {
            return `Date Range: ${new Date(customStartDate).toLocaleDateString()} to ${new Date(customEndDate).toLocaleDateString()}`;
        }
        return 'Date Range: N/A';
    };

    const openModalForEdit = (user: User) => { setEditingUser(user); setNewUserRole(null); setIsModalOpen(true); };
    const openModalForNew = (role: UserRole) => { setEditingUser(null); setNewUserRole(role); setIsModalOpen(true); };
    const currentRole = editingUser?.role || newUserRole;
    const managedBrandIds = Object.keys(formData.brandCommissions);
    const availableBrands = brands.filter(b => !managedBrandIds.includes(b.id));
    const userToPrint = printingUserId ? users.find(u => u.id === printingUserId) : null;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-2xl font-bold text-content-primary">Employee Salary Calculation</h2>
                <Button onClick={handlePrintAll} className="flex items-center gap-2"><PrinterIcon className="w-4 h-4" /> Print Salaries</Button>
            </div>
            
            <Card className="no-print">
                <h3 className="text-lg font-bold mb-4 text-content-primary">Company Statistics (For Selected Period)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FinanceStatCard title="Total Parcels in View" value={companyStats.totalParcels.toLocaleString()} icon={PackageIcon} />
                    <FinanceStatCard title="Revenue from Charges" value={companyStats.totalRevenue} icon={DollarSignIcon} />
                    <FinanceStatCard title="Avg. Charge per Parcel" value={companyStats.averageCharge.toFixed(2)} icon={TruckIcon} colorClass="text-cyan-500" bgColorClass="bg-cyan-100 dark:bg-cyan-500/20" />
                </div>
            </Card>

            <Card className="no-print">
                <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Sales Managers</h3><Button onClick={() => openModalForNew(UserRole.SALES_MANAGER)} className="flex items-center gap-1"><PlusIcon className="w-4 h-4" /> Add</Button></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="border-b"><tr className="text-content-secondary"><th className="p-2">Name</th><th className="p-2 text-right">Base</th><th className="p-2 text-right">Commission</th><th className="p-2 text-right">Total</th><th className="p-2 text-center">Status</th><th className="p-2 text-center">Actions</th></tr></thead>
                    <tbody>{salesManagers.map(m => {
                        const commissionDetails = Object.entries(m.brandCommissions || {}).map(([brandId, rate]) => {
                             const brandRevenue = parcels.filter(p => p.brandId === brandId).reduce((sum, p) => sum + p.deliveryCharge + p.tax, 0);
                             const commission = brandRevenue * (rate / 100);
                             return { brandId, brandRevenue, rate, commission };
                        });
                        const totalCommission = commissionDetails.reduce((total, d) => total + d.commission, 0);
                        const totalSalary = (m.baseSalary || 0) + totalCommission;
                        const { periodStartDate, periodEndDate } = getPeriodDates();
                        const paymentRecord = salaryPayments.find(p => p.userId === m.id && p.periodStartDate === periodStartDate && p.periodEndDate === periodEndDate);

                        return (<tr key={m.id} className="border-b last:border-b-0">
                            <td className="p-2 font-semibold">{m.name}</td>
                            <td className="p-2 text-right">PKR {m.baseSalary?.toLocaleString() || 0}</td>
                            <td className="p-2 text-right text-green-600">PKR {totalCommission.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td className="p-2 text-right font-bold">PKR {totalSalary.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td className="p-2 text-center">
                                {paymentRecord ? (
                                    <div className="flex items-center justify-center gap-1 text-green-600" title={`Paid on ${new Date(paymentRecord.paidAt!).toLocaleDateString()} (Ref: ${paymentRecord.transactionId})`}>
                                        <CheckCircleIcon solid className="w-5 h-5"/>
                                        <span className="font-semibold text-xs">PAID</span>
                                    </div>
                                ) : (
                                    <Button size="sm" onClick={() => setPayingUserData({
                                        userId: m.id,
                                        periodStartDate, periodEndDate,
                                        baseSalary: m.baseSalary || 0,
                                        totalCommission, totalSalary,
                                        breakdown: commissionDetails,
                                    })}>Pay</Button>
                                )}
                            </td>
                            <td className="p-2 text-center">
                                <div className="flex justify-center gap-1">
                                    <Button size="sm" variant="secondary" onClick={() => handlePrintSingle(m.id)} aria-label="Print"><PrinterIcon className="w-4 h-4"/></Button>
                                    <Button size="sm" variant="secondary" onClick={() => openModalForEdit(m)} aria-label="Edit"><EditIcon className="w-4 h-4" /></Button>
                                </div>
                            </td>
                        </tr>)})}</tbody>
                </table></div>
            </Card>
            
            <Card className="no-print">
                <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Drivers</h3><Button onClick={() => openModalForNew(UserRole.DRIVER)} className="flex items-center gap-1"><PlusIcon className="w-4 h-4" /> Add</Button></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="border-b"><tr className="text-content-secondary"><th className="p-2">Name</th><th className="p-2 text-right">Base</th><th className="p-2 text-right">Commission</th><th className="p-2 text-right">Total</th><th className="p-2 text-center">Status</th><th className="p-2 text-center">Actions</th></tr></thead>
                    <tbody>{drivers.map(d => {
                        const pickupCount = parcels.filter(p => p.pickupDriverId === d.id && [ParcelStatus.PICKED_UP, ParcelStatus.RETURNED].includes(p.status)).length;
                        const deliveryCount = parcels.filter(p => p.deliveryDriverId === d.id && p.status === ParcelStatus.DELIVERED).length;
                        const pickupCommission = pickupCount * (d.perPickupCommission || 0);
                        const deliveryCommission = deliveryCount * (d.perDeliveryCommission || 0);
                        const totalCommission = pickupCommission + deliveryCommission;
                        const totalSalary = (d.baseSalary || 0) + totalCommission;
                        const { periodStartDate, periodEndDate } = getPeriodDates();
                        const paymentRecord = salaryPayments.find(p => p.userId === d.id && p.periodStartDate === periodStartDate && p.periodEndDate === periodEndDate);

                        return (<tr key={d.id} className="border-b last:border-b-0">
                            <td className="p-2 font-semibold">{d.name}</td>
                            <td className="p-2 text-right">PKR {d.baseSalary?.toLocaleString() || 0}</td>
                            <td className="p-2 text-right text-green-600">PKR {totalCommission.toLocaleString()}</td>
                            <td className="p-2 text-right font-bold">PKR {totalSalary.toLocaleString()}</td>
                             <td className="p-2 text-center">
                                {paymentRecord ? (
                                    <div className="flex items-center justify-center gap-1 text-green-600" title={`Paid on ${new Date(paymentRecord.paidAt!).toLocaleDateString()} (Ref: ${paymentRecord.transactionId})`}>
                                        <CheckCircleIcon solid className="w-5 h-5"/>
                                        <span className="font-semibold text-xs">PAID</span>
                                    </div>
                                ) : (
                                    <Button size="sm" onClick={() => setPayingUserData({
                                        userId: d.id,
                                        periodStartDate, periodEndDate,
                                        baseSalary: d.baseSalary || 0,
                                        totalCommission, totalSalary,
                                        breakdown: { pickupCount, perPickup: d.perPickupCommission, deliveryCount, perDelivery: d.perDeliveryCommission }
                                    })}>Pay</Button>
                                )}
                            </td>
                            <td className="p-2 text-center">
                                <div className="flex justify-center gap-1">
                                    <Button size="sm" variant="secondary" onClick={() => handlePrintSingle(d.id)} aria-label="Print"><PrinterIcon className="w-4 h-4"/></Button>
                                    <Button size="sm" variant="secondary" onClick={() => openModalForEdit(d)} aria-label="Edit"><EditIcon className="w-4 h-4" /></Button>
                                </div>
                            </td>
                        </tr>)})}</tbody>
                </table></div>
            </Card>
            
            <Card className="no-print">
                <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Direct Sales</h3><Button onClick={() => openModalForNew(UserRole.DIRECT_SALES)} className="flex items-center gap-1"><PlusIcon className="w-4 h-4" /> Add</Button></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="border-b"><tr className="text-content-secondary"><th className="p-2">Name</th><th className="p-2 text-right">Base</th><th className="p-2 text-right">Commission</th><th className="p-2 text-right">Total</th><th className="p-2 text-center">Status</th><th className="p-2 text-center">Actions</th></tr></thead>
                    <tbody>{directSales.map(s => {
                        const totalCommission = companyStats.totalRevenue * ((s.commissionRate || 0) / 100);
                        const totalSalary = (s.baseSalary || 0) + totalCommission;
                        const { periodStartDate, periodEndDate } = getPeriodDates();
                        const paymentRecord = salaryPayments.find(p => p.userId === s.id && p.periodStartDate === periodStartDate && p.periodEndDate === periodEndDate);

                        return (<tr key={s.id} className="border-b last:border-b-0">
                            <td className="p-2 font-semibold">{s.name}</td>
                            <td className="p-2 text-right">PKR {s.baseSalary?.toLocaleString() || 0}</td>
                            <td className="p-2 text-right text-green-600">PKR {totalCommission.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td className="p-2 text-right font-bold">PKR {totalSalary.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td className="p-2 text-center">
                                {paymentRecord ? (
                                    <div className="flex items-center justify-center gap-1 text-green-600" title={`Paid on ${new Date(paymentRecord.paidAt!).toLocaleDateString()} (Ref: ${paymentRecord.transactionId})`}>
                                        <CheckCircleIcon solid className="w-5 h-5"/>
                                        <span className="font-semibold text-xs">PAID</span>
                                    </div>
                                ) : (
                                    <Button size="sm" onClick={() => setPayingUserData({
                                        userId: s.id,
                                        periodStartDate, periodEndDate,
                                        baseSalary: s.baseSalary || 0,
                                        totalCommission, totalSalary,
                                        breakdown: { companyRevenue: companyStats.totalRevenue, rate: s.commissionRate }
                                    })}>Pay</Button>
                                )}
                            </td>
                            <td className="p-2 text-center">
                                <div className="flex justify-center gap-1">
                                    <Button size="sm" variant="secondary" onClick={() => handlePrintSingle(s.id)} aria-label="Print"><PrinterIcon className="w-4 h-4"/></Button>
                                    <Button size="sm" variant="secondary" onClick={() => openModalForEdit(s)} aria-label="Edit"><EditIcon className="w-4 h-4" /></Button>
                                </div>
                            </td>
                        </tr>)})}</tbody>
                </table></div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingUser ? `Edit ${editingUser.name}` : `Add New Employee`} size="lg">
                <form onSubmit={handleFormSubmit}>
                    <div className="space-y-3 p-1 max-h-[60vh] overflow-y-auto pr-2">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                             <div><FormLabel htmlFor="name">Full Name</FormLabel><FormInput id="name" name="name" value={formData.name} onChange={handleInputChange} required autoFocus /></div>
                             <div><FormLabel htmlFor="email">Email</FormLabel><FormInput id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required /></div>
                         </div>
                         <div><FormLabel htmlFor="baseSalary">Base Salary (PKR)</FormLabel><FormInput id="baseSalary" name="baseSalary" type="number" min="0" value={formData.baseSalary} onChange={handleInputChange} /></div>
                         
                         {currentRole === UserRole.SALES_MANAGER && <>
                            <FormLabel>Brand-Specific Commissions</FormLabel>
                            <div className="space-y-2 p-2 bg-background rounded-md border border-border">
                                {managedBrandIds.map(brandId => (
                                    <div key={brandId} className="flex items-center gap-2">
                                        <span className="flex-grow font-semibold text-sm">{brands.find(b => b.id === brandId)?.name}</span>
                                        <FormInput type="number" step="0.1" min="0" value={formData.brandCommissions[brandId]} onChange={e => handleBrandCommissionChange(brandId, e.target.value)} className="w-24" placeholder="Rate %" />
                                        <span className="text-content-secondary">%</span>
                                        <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveBrandFromManager(brandId)}><TrashIcon className="w-4 h-4" /></Button>
                                    </div>
                                ))}
                                {availableBrands.length > 0 && (
                                     <div className="flex items-center gap-2 pt-2 border-t border-border">
                                        <FormSelect value="" onChange={e => handleAddBrandToManager(e.target.value)} className="flex-grow">
                                            <option value="" disabled>Add a brand to manage...</option>
                                            {availableBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </FormSelect>
                                    </div>
                                )}
                            </div>
                         </>}
                         {currentRole === UserRole.DIRECT_SALES && <div><FormLabel htmlFor="commissionRate">Commission Rate (%)</FormLabel><FormInput id="commissionRate" name="commissionRate" type="number" step="0.1" value={formData.commissionRate} onChange={handleInputChange} /></div>}
                         {currentRole === UserRole.DRIVER && <div className="grid grid-cols-2 gap-3">
                            <div><FormLabel htmlFor="perPickupCommission">Comm. per Pickup (PKR)</FormLabel><FormInput id="perPickupCommission" name="perPickupCommission" type="number" min="0" value={formData.perPickupCommission} onChange={handleInputChange} /></div>
                            <div><FormLabel htmlFor="perDeliveryCommission">Comm. per Delivery (PKR)</FormLabel><FormInput id="perDeliveryCommission" name="perDeliveryCommission" type="number" min="0" value={formData.perDeliveryCommission} onChange={handleInputChange} /></div>
                         </div>}
                    </div>
                    <div className="flex justify-between items-center pt-3 mt-3 border-t border-border">
                        <div>{editingUser && <Button type="button" variant={editingUser.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={handleToggleStatus}>{editingUser.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}</Button>}</div>
                        <div className="flex gap-2"><Button type="button" variant="secondary" onClick={handleModalClose}>Cancel</Button><Button type="submit">{editingUser ? 'Update' : 'Add'}</Button></div>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={!!payingUserData} onClose={() => setPayingUserData(null)} title={`Mark Salary as Paid`}>
                <form onSubmit={handlePaymentSubmit}>
                    <p className="mb-3">You are paying <strong>PKR {payingUserData?.totalSalary.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong> to <strong>{users.find(u => u.id === payingUserData?.userId)?.name}</strong>.</p>
                    <div>
                        <FormLabel htmlFor="transactionId">Transaction ID / Reference</FormLabel>
                        <FormInput id="transactionId" value={transactionId} onChange={e => setTransactionId(e.target.value)} required autoFocus />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="secondary" onClick={() => setPayingUserData(null)}>Cancel</Button>
                        <Button type="submit">Mark as Paid</Button>
                    </div>
                </form>
            </Modal>

            <div className="hidden print:block printable-area">
                <h1 className="text-2xl font-bold mb-1">{printingUserId ? `Salary Slip for ${userToPrint?.name}` : 'Employee Salary Report'}</h1>
                <p className="mb-1">{getDateRangeText()}</p>
                <p className="text-xs mb-4">Generated on: {new Date().toLocaleString()}</p>

                {((!userToPrint || userToPrint.role === UserRole.SALES_MANAGER) && salesManagers.length > 0) && <>
                    <h2 className="text-xl font-bold mt-6 mb-2">Sales Managers</h2>
                    <table>
                        <thead><tr><th>Manager / Details</th><th className="text-right">Base Salary</th><th className="text-right">Commission</th><th className="text-right">Total Salary</th><th className="text-right">Status</th></tr></thead>
                        <tbody>{(printingUserId ? salesManagers.filter(m => m.id === printingUserId) : salesManagers).map(m => {
                                const commissionDetails = Object.entries(m.brandCommissions || {}).map(([brandId, rate]) => {
                                    const brandRevenue = parcels.filter(p => p.brandId === brandId).reduce((sum, p) => sum + p.deliveryCharge + p.tax, 0);
                                    const commission = brandRevenue * (rate / 100);
                                    const brand = brands.find(b => b.id === brandId);
                                    return { brandName: brand?.name || 'Unknown', brandRevenue, rate, commission };
                                });
                                const totalCommission = commissionDetails.reduce((sum, d) => sum + d.commission, 0);
                                const totalSalary = (m.baseSalary || 0) + totalCommission;
                                const { periodStartDate, periodEndDate } = getPeriodDates();
                                const paymentRecord = salaryPayments.find(p => p.userId === m.id && p.periodStartDate === periodStartDate && p.periodEndDate === periodEndDate);
                                return (<React.Fragment key={m.id}>
                                        <tr className="total-row">
                                            <td className="font-bold">{m.name}</td>
                                            <td className="text-right">PKR {m.baseSalary?.toLocaleString() || 0}</td>
                                            <td className="text-right">PKR {totalCommission.toFixed(2)}</td>
                                            <td className="text-right">PKR {totalSalary.toFixed(2)}</td>
                                            <td className="text-right font-bold">{paymentRecord ? `PAID (Ref: ${paymentRecord.transactionId})` : 'UNPAID'}</td>
                                        </tr>
                                        {commissionDetails.map((detail, index) => (<tr key={index} className="sub-row">
                                            <td>{`- ${detail.brandName}: Revenue PKR ${detail.brandRevenue.toFixed(0)} @ ${detail.rate}%`}</td><td></td>
                                            <td className="text-right">{`PKR ${detail.commission.toFixed(2)}`}</td><td></td><td></td>
                                        </tr>))}
                                </React.Fragment>);
                            })}
                        </tbody>
                    </table>
                </>}
                
                {((!userToPrint || userToPrint.role === UserRole.DRIVER) && drivers.length > 0) && <>
                    <h2 className="text-xl font-bold mt-6 mb-2">Drivers</h2>
                    <table>
                         <thead><tr><th>Driver / Details</th><th className="text-right">Base Salary</th><th className="text-right">Commission</th><th className="text-right">Total Salary</th><th className="text-right">Status</th></tr></thead>
                        <tbody>{(printingUserId ? drivers.filter(d => d.id === printingUserId) : drivers).map(d => {
                                const pickupCount = parcels.filter(p => p.pickupDriverId === d.id && [ParcelStatus.PICKED_UP, ParcelStatus.RETURNED].includes(p.status)).length;
                                const deliveryCount = parcels.filter(p => p.deliveryDriverId === d.id && p.status === ParcelStatus.DELIVERED).length;
                                const pickupCommission = pickupCount * (d.perPickupCommission || 0);
                                const deliveryCommission = deliveryCount * (d.perDeliveryCommission || 0);
                                const totalCommission = pickupCommission + deliveryCommission;
                                const totalSalary = (d.baseSalary || 0) + totalCommission;
                                const { periodStartDate, periodEndDate } = getPeriodDates();
                                const paymentRecord = salaryPayments.find(p => p.userId === d.id && p.periodStartDate === periodStartDate && p.periodEndDate === periodEndDate);
                                return (<React.Fragment key={d.id}>
                                        <tr className="total-row">
                                            <td className="font-bold">{d.name}</td>
                                            <td className="text-right">PKR {d.baseSalary?.toLocaleString() || 0}</td>
                                            <td className="text-right">PKR {totalCommission.toLocaleString()}</td>
                                            <td className="text-right">PKR {totalSalary.toLocaleString()}</td>
                                            <td className="text-right font-bold">{paymentRecord ? `PAID (Ref: ${paymentRecord.transactionId})` : 'UNPAID'}</td>
                                        </tr>
                                        <tr className="sub-row"><td>{`- Pickups: ${pickupCount} @ PKR ${d.perPickupCommission || 0}`}</td><td></td><td className="text-right">{`PKR ${pickupCommission.toLocaleString()}`}</td><td></td><td></td></tr>
                                        <tr className="sub-row"><td>{`- Deliveries: ${deliveryCount} @ PKR ${d.perDeliveryCommission || 0}`}</td><td></td><td className="text-right">{`PKR ${deliveryCommission.toLocaleString()}`}</td><td></td><td></td></tr>
                                </React.Fragment>)})}
                        </tbody>
                    </table>
                </>}

                {((!userToPrint || userToPrint.role === UserRole.DIRECT_SALES) && directSales.length > 0) && <>
                    <h2 className="text-xl font-bold mt-6 mb-2">Direct Sales</h2>
                    <table>
                        <thead><tr><th>Sales Person / Details</th><th className="text-right">Base Salary</th><th className="text-right">Commission</th><th className="text-right">Total Salary</th><th className="text-right">Status</th></tr></thead>
                        <tbody>{(printingUserId ? directSales.filter(s => s.id === printingUserId) : directSales).map(s => {
                                const commission = companyStats.totalRevenue * ((s.commissionRate || 0) / 100);
                                const totalSalary = (s.baseSalary || 0) + commission;
                                const { periodStartDate, periodEndDate } = getPeriodDates();
                                const paymentRecord = salaryPayments.find(p => p.userId === s.id && p.periodStartDate === periodStartDate && p.periodEndDate === periodEndDate);
                                return (<React.Fragment key={s.id}>
                                        <tr className="total-row">
                                            <td className="font-bold">{s.name}</td>
                                            <td className="text-right">PKR {s.baseSalary?.toLocaleString() || 0}</td>
                                            <td className="text-right">PKR {commission.toFixed(2)}</td>
                                            <td className="text-right">PKR {totalSalary.toFixed(2)}</td>
                                            <td className="text-right font-bold">{paymentRecord ? `PAID (Ref: ${paymentRecord.transactionId})` : 'UNPAID'}</td>
                                        </tr>
                                        <tr className="sub-row">
                                            <td>{`- Company Revenue: PKR ${companyStats.totalRevenue.toFixed(0)} @ ${s.commissionRate || 0}%`}</td><td></td>
                                            <td className="text-right">{`PKR ${commission.toFixed(2)}`}</td><td></td><td></td>
                                        </tr>
                                </React.Fragment>)})}
                        </tbody>
                    </table>
                </>}
            </div>
        </div>
    );
};