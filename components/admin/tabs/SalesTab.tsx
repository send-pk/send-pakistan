import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { User, UserRole, Parcel, ParcelStatus, SalaryPayment } from '../../../types';
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

const initialFormState = { name: '', email: '', password: '', baseSalary: '0', commissionRate: '0', perPickupCommission: '0', perDeliveryCommission: '0', brandCommissions: {} as { [key: string]: string } };

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
                password: '', // Never pre-fill password
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
            name: formData.name, email: formData.email, password: formData.password,
            baseSalary: parseFloat(formData.baseSalary) || 0,
            commissionRate: parseFloat(formData.commissionRate) || 0,
            perPickupCommission: parseFloat(formData.perPickupCommission) || 0,
            perDeliveryCommission: parseFloat(formData.perDeliveryCommission) || 0,
            brandCommissions: brandCommissionsNum,
        };

        if (editingUser) {
            const { password, ...updateData } = dataToSave; // Exclude password for updates
            if (role === UserRole.SALES_MANAGER) updateSalesManager(editingUser.id, updateData);
            else if (role === UserRole.DRIVER) updateDriver(editingUser.id, updateData);
            else if (role === UserRole.DIRECT_SALES) updateDirectSales(editingUser.id, updateData);
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

    const SalaryReport = ({ user, parcels, payments, period }: { user: User, parcels: Parcel[], payments: SalaryPayment[], period: { start: string, end: string } }) => {
        const periodStartDate = period.start;
        const periodEndDate = period.end;
        let baseSalary = user.baseSalary || 0;
        let totalCommission = 0;
        let breakdown: any[] = [];
        
        if (user.role === UserRole.SALES_MANAGER) {
            const commissionDetails = Object.entries(user.brandCommissions || {}).map(([brandId, rate]) => {
                const brand = brands.find(b => b.id === brandId);
                const brandRevenue = parcels.filter(p => p.brandId === brandId).reduce((sum, p) => sum + p.deliveryCharge + p.tax, 0);
                const commission = brandRevenue * (rate / 100);
                return { brandName: brand?.name, brandRevenue, rate, commission };
            });
            totalCommission = commissionDetails.reduce((total, d) => total + d.commission, 0);
            breakdown = commissionDetails;
        } else if (user.role === UserRole.DRIVER) {
            const pickups = parcels.filter(p => p.pickupDriverId === user.id && [ParcelStatus.PICKED_UP, ParcelStatus.RETURNED].includes(p.status)).length;
            const deliveries = parcels.filter(p => p.deliveryDriverId === user.id && p.status === ParcelStatus.DELIVERED).length;
            const pickupCommission = pickups * (user.perPickupCommission || 0);
            const deliveryCommission = deliveries * (user.perDeliveryCommission || 0);
            totalCommission = pickupCommission + deliveryCommission;
            breakdown = [{ label: "Pickups", count: pickups, rate: user.perPickupCommission, total: pickupCommission }, { label: "Deliveries", count: deliveries, rate: user.perDeliveryCommission, total: deliveryCommission }];
        } else if (user.role === UserRole.DIRECT_SALES) {
            const totalRevenue = parcels.reduce((sum, p) => sum + p.deliveryCharge + p.tax, 0);
            totalCommission = totalRevenue * ((user.commissionRate || 0) / 100);
            breakdown = [{ label: "Company Revenue", revenue: totalRevenue, rate: user.commissionRate, total: totalCommission }];
        }
        
        const totalSalary = baseSalary + totalCommission;
        const paymentRecord = payments.find(p => p.userId === user.id && p.periodStartDate === periodStartDate && p.periodEndDate === periodEndDate);
    
        return (
            <div className="p-4" style={{ pageBreakAfter: 'always' }}>
                <h2 className="text-xl font-bold">Salary Report</h2>
                <div className="flex justify-between items-end mt-2 mb-4">
                    <div>
                        <p><strong>Employee:</strong> {user.name} ({user.role})</p>
                        <p><strong>Period:</strong> {new Date(periodStartDate).toLocaleDateString()} - {new Date(periodEndDate).toLocaleDateString()}</p>
                    </div>
                    <p><strong>Status:</strong> {paymentRecord ? `Paid on ${new Date(paymentRecord.paidAt!).toLocaleDateString()}` : 'Unpaid'}</p>
                </div>
                
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-black"><th className="p-1">Description</th><th className="p-1 text-right">Amount (PKR)</th></tr>
                    </thead>
                    <tbody>
                        <tr><td className="p-1">Base Salary</td><td className="p-1 text-right">{baseSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td></tr>
                        <tr className="font-semibold"><td className="p-1 pt-2">Commission Breakdown</td><td className="p-1"></td></tr>
                        {user.role === UserRole.SALES_MANAGER && breakdown.map((item, i) => (
                            <tr key={i} className="sub-row"><td className="p-1">{item.brandName} ({item.rate}%)</td><td className="p-1 text-right">{item.commission.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td></tr>
                        ))}
                        {user.role === UserRole.DRIVER && breakdown.map((item, i) => (
                             <tr key={i} className="sub-row"><td className="p-1">{item.count} {item.label} @ PKR {item.rate}</td><td className="p-1 text-right">{item.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td></tr>
                        ))}
                        {user.role === UserRole.DIRECT_SALES && breakdown.map((item, i) => (
                             <tr key={i} className="sub-row"><td className="p-1">{item.label} Commission ({item.rate}%)</td><td className="p-1 text-right">{item.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td></tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="total-row"><td className="p-1">Total Salary</td><td className="p-1 text-right">PKR {totalSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td></tr>
                    </tfoot>
                </table>
            </div>
        );
    };

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
                        const pickups = parcels.filter(p => p.pickupDriverId === d.id && [ParcelStatus.PICKED_UP, ParcelStatus.RETURNED].includes(p.status)).length;
                        const deliveries = parcels.filter(p => p.deliveryDriverId === d.id && p.status === ParcelStatus.DELIVERED).length;
                        const pickupCommission = pickups * (d.perPickupCommission || 0);
                        const deliveryCommission = deliveries * (d.perDeliveryCommission || 0);
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
                                        breakdown: { pickups, deliveries, pickupCommission, deliveryCommission },
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
                        const totalRevenue = parcels.reduce((sum, p) => sum + p.deliveryCharge + p.tax, 0);
                        const totalCommission = totalRevenue * ((s.commissionRate || 0) / 100);
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
                                        breakdown: { totalRevenue, commissionRate: s.commissionRate },
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

            <Modal isOpen={!!payingUserData} onClose={() => setPayingUserData(null)} title={`Pay Salary to ${users.find(u=>u.id === payingUserData?.userId)?.name}`}>
                <form onSubmit={handlePaymentSubmit}>
                    <div className="space-y-3 p-1">
                        <p>Confirm payment details for the period:</p>
                        <div className="bg-background p-3 rounded-lg border border-border">
                            <div className="flex justify-between"><span className="text-content-secondary">Base Salary:</span> <span>PKR {payingUserData?.baseSalary.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span className="text-content-secondary">Commission:</span> <span className="text-green-600">PKR {payingUserData?.totalCommission.toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t"><span className="text-content-primary">Total Salary:</span> <span>PKR {payingUserData?.totalSalary.toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                        </div>
                        <div>
                            <FormLabel htmlFor="transactionId">Transaction ID / Reference</FormLabel>
                            <FormInput id="transactionId" value={transactionId} onChange={e => setTransactionId(e.target.value)} required autoFocus />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                        <Button type="button" variant="secondary" onClick={() => setPayingUserData(null)}>Cancel</Button>
                        <Button type="submit">Confirm Payment</Button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title={editingUser ? `Edit ${editingUser.name}` : `Add New Employee`} size="3xl">
                <form onSubmit={handleFormSubmit}>
                    <div className="max-h-[70vh] overflow-y-auto p-1 pr-2 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div><FormLabel htmlFor="emp_name">Name</FormLabel><FormInput id="emp_name" name="name" value={formData.name} onChange={handleInputChange} required /></div>
                            <div><FormLabel htmlFor="emp_email">Email (for login)</FormLabel><FormInput id="emp_email" name="email" type="email" value={formData.email} onChange={handleInputChange} required disabled={!!editingUser} /></div>
                            {!editingUser && <div><FormLabel htmlFor="emp_password">Password</FormLabel><FormInput id="emp_password" name="password" type="password" value={formData.password} onChange={handleInputChange} required /></div>}
                        </div>
                        <div className="border-t pt-3">
                            <h3 className="font-semibold text-content-primary mb-2">Salary & Commission</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div><FormLabel htmlFor="baseSalary">Base Salary (PKR)</FormLabel><FormInput id="baseSalary" name="baseSalary" type="number" min="0" value={formData.baseSalary} onChange={handleInputChange} /></div>
                                
                                {currentRole === UserRole.DIRECT_SALES && (
                                    <div><FormLabel htmlFor="commissionRate">Commission Rate (%)</FormLabel><FormInput id="commissionRate" name="commissionRate" type="number" min="0" value={formData.commissionRate} onChange={handleInputChange} /></div>
                                )}
                                
                                {currentRole === UserRole.DRIVER && (
                                    <>
                                        <div><FormLabel htmlFor="perPickupCommission">Commission per Pickup (PKR)</FormLabel><FormInput id="perPickupCommission" name="perPickupCommission" type="number" min="0" value={formData.perPickupCommission} onChange={handleInputChange} /></div>
                                        <div><FormLabel htmlFor="perDeliveryCommission">Commission per Delivery (PKR)</FormLabel><FormInput id="perDeliveryCommission" name="perDeliveryCommission" type="number" min="0" value={formData.perDeliveryCommission} onChange={handleInputChange} /></div>
                                    </>
                                )}
                            </div>
                            {currentRole === UserRole.SALES_MANAGER && (
                                <div className="mt-3 border-t pt-3">
                                    <h4 className="font-semibold text-content-primary mb-2">Brand Commissions (%)</h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {managedBrandIds.map(brandId => {
                                            const brand = brands.find(b => b.id === brandId);
                                            if (!brand) return null;
                                            return (<div key={brandId} className="flex items-center gap-2 p-1.5 bg-background rounded-md border">
                                                <span className="font-semibold flex-grow">{brand.name}</span>
                                                <FormInput type="number" min="0" max="100" value={formData.brandCommissions[brandId]} onChange={e => handleBrandCommissionChange(brandId, e.target.value)} className="w-24" />
                                                <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveBrandFromManager(brandId)}><TrashIcon className="w-4 h-4"/></Button>
                                            </div>);
                                        })}
                                    </div>
                                    {availableBrands.length > 0 && <div className="mt-2 flex items-end gap-2">
                                        <FormSelect onChange={e => handleAddBrandToManager(e.target.value)} value="">
                                            <option value="" disabled>Add a brand to manage...</option>
                                            {availableBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </FormSelect>
                                    </div>}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 mt-3 border-t">
                        <div>{editingUser && <Button type="button" variant={editingUser.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={handleToggleStatus}>{editingUser.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}</Button>}</div>
                        <div className="flex gap-2"><Button type="button" variant="secondary" onClick={handleModalClose}>Cancel</Button><Button type="submit">{editingUser ? 'Update' : 'Add'} Employee</Button></div>
                    </div>
                </form>
            </Modal>

            <div className="printable-area">
                <div className="p-4 text-center">
                    <h1 className="text-2xl font-bold">SEND Courier - Employee Salary Report</h1>
                    <p className="text-lg">{getDateRangeText()}</p>
                </div>
                {userToPrint ? (
                    <SalaryReport user={userToPrint} parcels={parcels} payments={salaryPayments} period={{ start: getPeriodDates().periodStartDate, end: getPeriodDates().periodEndDate }} />
                ) : (
                    <>
                        {[...salesManagers, ...drivers, ...directSales].map(u => (
                            <SalaryReport key={u.id} user={u} parcels={parcels} payments={salaryPayments} period={{ start: getPeriodDates().periodStartDate, end: getPeriodDates().periodEndDate }} />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};