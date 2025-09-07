export enum UserRole {
  ADMIN = 'ADMIN',
  BRAND = 'BRAND',
  DRIVER = 'DRIVER',
  CUSTOMER = 'CUSTOMER',
  WAREHOUSE_MANAGER = 'WAREHOUSE_MANAGER',
}

export enum ParcelStatus {
  // Booking & Pickup
  BOOKED = 'Booked',
  PENDING_EXCHANGE_PICKUP = 'Pending Exchange Pickup', // For the return part of an exchange
  PICKED_UP = 'Picked Up',
  // At Warehouse/Hub
  AT_HUB = 'At Hub',
  // Delivery
  OUT_FOR_DELIVERY = 'Out for Delivery',
  DELIVERED = 'Delivered',
  // Delivery Exceptions
  DELIVERY_FAILED = 'Delivery Failed',
  CUSTOMER_REFUSED = 'Customer Refused',
  DELIVERED_EXCHANGE_COMPLETE = 'Delivered & Exchange Collected', // Transient status for driver app
  PENDING_DELIVERY = 'Pending Delivery', // After a failed attempt, back at warehouse
  // Return Flow
  PENDING_RETURN = 'Pending Return',   // Brand has requested the parcel back
  OUT_FOR_RETURN = 'Out for Return',
  RETURNED = 'Returned',           // Returned to the brand/sender
  // Other
  CANCELED = 'Canceled',
  LOST = 'Lost',
  DAMAGED = 'Damaged',
  FRAUDULENT = 'Fraudulent',
  SOLVED = 'Solved',
}

export interface DutyLogEvent {
  status: 'ON_DUTY' | 'OFF_DUTY';
  timestamp: string;
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
  assignedPickupDriverId?: string;
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  deliveryCharge?: number;
  // Driver-specific fields
  photoUrl?: string; // base64 string
  whatsappNumber?: string;
  currentAddress?: string;
  permanentAddress?: string;
  guardianContact?: string;
  idCardNumber?: string;
  onDuty?: boolean;
  dutyLog?: DutyLogEvent[];
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
  deliveryDriverId?: string;
  codAmount: number;
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
  generatedAt: string;
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


export interface DataContextType {
  parcels: Parcel[];
  users: User[];
  invoices: Invoice[];
  loading: boolean;
  updateParcelStatus: (parcelId: string, status: ParcelStatus, currentUser?: User, details?: { reason?: string; proof?: string; deliveryZone?: string; driverId?: string }) => Promise<void>;
  updateMultipleParcelStatuses: (parcelIds: string[], status: ParcelStatus, currentUser: User, details?: { adminRemark?: string }) => Promise<void>;
  bookNewParcel: (parcelData: Omit<Parcel, 'id' | 'trackingNumber' | 'createdAt' | 'updatedAt' | 'status' | 'pickupDriverId' | 'deliveryDriverId' | 'deliveryCharge' | 'tax' | 'isCodReconciled' | 'invoiceId' | 'failedAttemptReason' | 'proofOfAttempt' | 'history' | 'returnItemDetails'>) => Promise<Parcel | null>;
  addNewBrand: (brandData: any) => Promise<void>;
  updateBrand: (brandId: string, updatedData: any) => Promise<void>;
  addNewDriver: (driverData: any) => Promise<void>;
  updateDriver: (driverId: string, updatedData: any) => Promise<void>;
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
}