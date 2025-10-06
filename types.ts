
export enum UserRole {
  ADMIN = 'ADMIN',
  BRAND = 'BRAND',
  DRIVER = 'DRIVER',
  WAREHOUSE_MANAGER = 'WAREHOUSE_MANAGER',
  SALES_MANAGER = 'SALES_MANAGER',
  DIRECT_SALES = 'DIRECT_SALES',
}

export enum ParcelStatus {
  // Booking & Pickup
  BOOKED = 'BOOKED',
  PENDING_EXCHANGE_PICKUP = 'PENDING_EXCHANGE_PICKUP',
  PICKED_UP = 'PICKED_UP',
  // At Warehouse/Hub
  AT_HUB = 'AT_HUB',
  // Delivery
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  // Delivery Exceptions
  DELIVERY_FAILED = 'DELIVERY_FAILED',
  CUSTOMER_REFUSED = 'CUSTOMER_REFUSED',
  DELIVERED_EXCHANGE_COMPLETE = 'DELIVERED_EXCHANGE_COMPLETE',
  PENDING_DELIVERY = 'PENDING_DELIVERY',
  // Return Flow
  PENDING_RETURN = 'PENDING_RETURN',
  OUT_FOR_RETURN = 'OUT_FOR_RETURN',
  RETURNED = 'RETURNED',
  // Other
  CANCELED = 'CANCELED',
  LOST = 'LOST',
  DAMAGED = 'DAMAGED',
  FRAUDULENT = 'FRAUDULENT',
  SOLVED = 'SOLVED',
}

export interface DutyLogEvent {
  status: 'ON_DUTY' | 'OFF_DUTY';
  timestamp: string;
}

export interface PickupLocation {
  id: string;
  address: string;
  assignedDriverId?: string;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  deliveryZones?: string[]; // For delivery drivers
  phone?: string;
  companyPhone?: string;
  correspondentName?: string;
  correspondentPhone?: string;
  currentLocation?: { lat: number; lng: number };
  officeAddress?: string; // New field for brand's main office
  pickupLocations?: PickupLocation[]; // New: Replaces single assignedPickupDriverId
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  // Brand-specific pricing
  weightCharges?: { [weight: string]: number };
  fuelSurcharge?: number; // Percentage
  // Driver-specific fields
  photoUrl?: string; // base64 string
  whatsappNumber?: string;
  currentAddress?: string;
  permanentAddress?: string;
  guardianContact?: string;
  idCardNumber?: string;
  onDuty?: boolean;
  dutyLog?: DutyLogEvent[];
  // Salary and Commission fields
  baseSalary?: number;
  commissionRate?: number; // Percentage for direct sales
  perPickupCommission?: number; // Fixed amount for driver pickups
  perDeliveryCommission?: number; // Fixed amount for driver deliveries
  brandCommissions?: { [brandId: string]: number }; // Per-brand commission rates for sales managers
}

export interface ParcelHistoryEvent {
  status: ParcelStatus;
  createdAt: string;
  notes?: string;
  updatedBy?: string; // User's name
  proofOfAttempt?: string;
}

export interface Item {
  name: string;
  quantity: number;
}

export interface Parcel {
  id: string;
  orderId: string;
  trackingNumber: string;
  brandId: string;
  brandName: string;
  recipientName: string;
  recipientAddress: string;
  recipientPhone: string;
  status: ParcelStatus;
  pickupDriverId?: string;
  pickupAddress?: string; // New: To store the specific pickup location address
  deliveryDriverId?: string;
  codAmount: number;
  weight: number;
  deliveryCharge: number;
  tax: number;
  createdAt: string;
  updatedAt: string;
  deliveryZone?: string;
  itemDetails: string;
  returnItemDetails?: Item[]; // Specific for exchange returns
  deliveryInstructions?: string;
  shipperAdvice?: string;
  brandRemark?: string;
  isCodReconciled: boolean;
  invoiceId?: string;
  failedAttemptReason?: string;
  proofOfAttempt?: string; // base64 string
  isExchange?: boolean;
  linkedParcelId?: string;
  isOpenParcel?: boolean;
  history: ParcelHistoryEvent[];
}

export interface Invoice {
  id: string;
  brandId: string;
  brandName: string;
  createdAt: string;
  parcelIds: string[];
  totalCOD: number;
  totalCharges: number;
  totalTax: number;
  netPayout: number;
  status: 'PENDING' | 'PAID';
  transactionId?: string;
  paidAt?: string;
}

export interface ReconciliationDetails {
  method: 'Cash' | 'Online' | 'Mixed';
  cashAmount?: number;
  transfers?: {
    amount: number;
    transactionId?: string;
  }[];
}

export interface SalaryPayment {
  id: string;
  userId: string;
  periodStartDate: string;
  periodEndDate: string;
  baseSalary: number;
  totalCommission: number;
  totalSalary: number;
  status: 'PAID' | 'UNPAID';
  paidAt?: string;
  transactionId?: string;
  breakdown: any; 
}

export interface DataContextType {
  parcels: Parcel[];
  users: User[];
  invoices: Invoice[];
  salaryPayments: SalaryPayment[];
  loading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  clearData: () => void;
  updateParcelStatus: (parcelId: string, status: ParcelStatus, currentUser?: User, details?: { reason?: string; proof?: string; deliveryZone?: string; driverId?: string; weight?: number; }) => Promise<void>;
  updateMultipleParcelStatuses: (parcelIds: string[], status: ParcelStatus, currentUser: User, details?: { adminRemark?: string }) => Promise<void>;
  bookNewParcel: (parcelData: Omit<Parcel, 'id' | 'trackingNumber' | 'createdAt' | 'updatedAt' | 'status' | 'pickupDriverId' | 'deliveryDriverId' | 'deliveryCharge' | 'tax' | 'isCodReconciled' | 'invoiceId' | 'failedAttemptReason' | 'proofOfAttempt' | 'history' | 'returnItemDetails' | 'pickupAddress'> & { pickupLocationId: string }) => Promise<Parcel | null>;
  addNewBrand: (brandData: any) => Promise<void>;
  updateBrand: (brandId: string, updatedData: any) => Promise<void>;
  addNewDriver: (driverData: any) => Promise<void>;
  updateDriver: (driverId: string, updatedData: any) => Promise<void>;
  addNewSalesManager: (managerData: any) => Promise<void>;
  updateSalesManager: (managerId: string, updatedData: any) => Promise<void>;
  addNewDirectSales: (salesData: any) => Promise<void>;
  updateDirectSales: (salesId: string, updatedData: any) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;
  generateInvoiceForPayout: (brandId: string, parcelIds: string[]) => Promise<void>;
  markInvoiceAsPaid: (invoiceId: string, transactionId: string) => Promise<void>;
  reconcileDriverCod: (driverId: string, parcelIds: string[], details: ReconciliationDetails) => Promise<void>;
  addBrandRemark: (parcelId: string, remark: string) => Promise<void>;
  updateDriverLocation: (driverId: string, location: { lat: number; lng: number }) => Promise<void>;
  deleteParcel: (parcelIds: string[]) => Promise<void>;
  addShipperAdvice: (parcelId: string, advice: string) => Promise<void>;
  manuallyAssignDriver: (parcelId: string, driverId: string | null, type: 'pickup' | 'delivery') => Promise<void>;
  initiateExchange: (originalParcelId: string, newOutboundDetails: { orderId: string; itemDetails: string; codAmount: number; deliveryInstructions?: string; }, returnItemDetails: Item[]) => Promise<{ outboundParcel: Parcel; returnParcel: Parcel; } | null>;
  reassignDriverJobs: (fromDriverId: string, toDriverId: string, currentUser: User, jobType: 'pickup' | 'delivery') => Promise<void>;
  toggleDriverDutyStatus: (driverId: string) => Promise<void>;
  markSalaryAsPaid: (paymentData: Omit<SalaryPayment, 'id' | 'status' | 'paidAt'> & { transactionId: string }) => Promise<void>;
}
