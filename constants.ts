import { User, Parcel, UserRole, ParcelStatus } from './types';

export const DELIVERY_ZONES = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'];
export const WEIGHT_TIERS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

// Coordinates for the LahoreMap component (based on a 300x200 viewbox) - now symbolic
export const CITY_COORDS: { [key: string]: { x: number; y: number } } = {
  'LAHORE': { x: 70, y: 140 },      // Recipient default
  'WAREHOUSE': { x: 150, y: 80 },   // Central Hub
  'BRAND': { x: 150, y: 20 },       // Brand default
};


export const LAHORE_BOUNDS = {
  lat: { min: 31.35, max: 31.75 },
  lng: { min: 74.1, max: 74.6 },
};

export const FAILED_ATTEMPT_REASONS = [
    'Customer not home',
    'Incorrect address',
    'Customer refused to accept',
    'Customer requested rescheduled delivery',
    'COD amount not ready',
    'Cannot contact customer',
    'Other',
];

export const PENDING_PARCEL_STATUSES = [
  ParcelStatus.BOOKED,
  ParcelStatus.PENDING_EXCHANGE_PICKUP,
  ParcelStatus.PICKED_UP,
  ParcelStatus.AT_HUB,
  ParcelStatus.OUT_FOR_DELIVERY,
  ParcelStatus.DELIVERY_FAILED,
  ParcelStatus.CUSTOMER_REFUSED,
  ParcelStatus.PENDING_DELIVERY,
  ParcelStatus.PENDING_RETURN,
  ParcelStatus.OUT_FOR_RETURN,
];

export const USERS: User[] = [
  // Admin
  { id: 'admin1', name: 'Zain', email: 'zain@send.pk', role: UserRole.ADMIN, status: 'ACTIVE' },

  // Warehouse Manager
  { id: 'wm1', name: 'Umar Farooq', email: 'umar@send.pk', role: UserRole.WAREHOUSE_MANAGER, status: 'ACTIVE' },
  
  // Sales Managers
  { id: 'sm1', name: 'Ahmad Jamal', email: 'ahmad.j@send.pk', role: UserRole.SALES_MANAGER, status: 'ACTIVE', baseSalary: 80000, brandCommissions: { 'brand-khaadi': 5, 'brand-cakes': 6 } },
  { id: 'sm2', name: 'Sana Batool', email: 'sana.b@send.pk', role: UserRole.SALES_MANAGER, status: 'ACTIVE', baseSalary: 85000, brandCommissions: { 'brand-sapphire': 5.5 } },
  
  // Direct Sales
  { id: 'ds1', name: 'Fatima Khan', email: 'fatima.k@send.pk', role: UserRole.DIRECT_SALES, status: 'ACTIVE', baseSalary: 60000, commissionRate: 2 },

  // Brands
  { 
    id: 'brand-khaadi', name: 'Khaadi', email: 'orders@khaadi.com', role: UserRole.BRAND, status: 'ACTIVE', 
    weightCharges: { "0.5": 100, "1": 100, "1.5": 130, "2": 130, "2.5": 160, "3": 160, "3.5": 190, "4": 190, "4.5": 220, "5": 220 },
    fuelSurcharge: 10, bankName: 'Meezan Bank', accountTitle: 'Khaadi Pvt Ltd', 
    accountNumber: '01234567890123', companyPhone: '021-111-542234', correspondentName: 'Ali Raza', correspondentPhone: '0300-1234567',
    officeAddress: 'Khaadi Head Office, 15-K, Gulberg 2, Lahore',
    pickupLocations: [
      { id: 'khaadi-loc-1', address: 'Packages Mall Warehouse, Walton Road', assignedDriverId: 'driver-imran' },
      { id: 'khaadi-loc-2', address: 'Emporium Mall Warehouse, Johar Town', assignedDriverId: 'driver-faisal' }
    ]
  },
  { 
    id: 'brand-sapphire', name: 'Sapphire', email: 'support@sapphire.pk', role: UserRole.BRAND, status: 'ACTIVE', 
    weightCharges: { "0.5": 110, "1": 110, "1.5": 145, "2": 145, "2.5": 180, "3": 180, "3.5": 215, "4": 215, "4.5": 250, "5": 250 },
    fuelSurcharge: 12, bankName: 'HBL', accountTitle: 'Sapphire Retail', accountNumber: '98765432109876', 
    companyPhone: '042-111-738245', correspondentName: 'Fatima Ali', correspondentPhone: '0321-9876543',
    officeAddress: 'Sapphire HQ, 1-Q, Gulberg 3, Lahore',
    pickupLocations: [
      { id: 'sapphire-loc-1', address: 'Main Warehouse, Sundar Industrial Estate', assignedDriverId: 'driver-bilal' }
    ]
  },
  { 
    id: 'brand-cakes', name: 'Cakes & Bakes', email: 'info@cakesandbakes.com', role: UserRole.BRAND, status: 'ACTIVE', 
    weightCharges: { "0.5": 120, "1": 120, "1.5": 150, "2": 150, "2.5": 180, "3": 180, "3.5": 210, "4": 210, "4.5": 240, "5": 240 },
    fuelSurcharge: 8, companyPhone: '042-111-225377', 
    correspondentName: 'Ahmed Khan', correspondentPhone: '0333-1122334',
    officeAddress: 'Cakes & Bakes Main Office, Johar Town, Lahore',
    pickupLocations: [
        { id: 'cakes-loc-1', address: 'Central Kitchen, Johar Town', assignedDriverId: 'driver-faisal' }
    ]
  },

  // Drivers
  { 
    id: 'driver-ali', name: 'Ali Khan', email: 'ali.k@send.pk', role: UserRole.DRIVER, status: 'ACTIVE', phone: '0300-1112233', deliveryZones: ['Zone 1', 'Zone 4'],
    photoUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
    whatsappNumber: '0300-1112233', currentAddress: '123 Driver Colony, Lahore', permanentAddress: '456 Ancestral Village, Punjab',
    guardianContact: '0300-9998877 (Father)', idCardNumber: '35202-1234567-1',
    onDuty: true, dutyLog: [
        { status: 'ON_DUTY', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }
    ],
    baseSalary: 25000, perPickupCommission: 15, perDeliveryCommission: 25,
  },
  { 
    id: 'driver-bilal', name: 'Bilal Ahmed', email: 'bilal.a@send.pk', role: UserRole.DRIVER, status: 'ACTIVE', phone: '0300-2223344', deliveryZones: ['Zone 2'],
    photoUrl: '', whatsappNumber: '0300-2223344', currentAddress: '789 Rider Heights, Lahore', permanentAddress: '789 Rider Heights, Lahore',
    guardianContact: '0300-1110000 (Brother)', idCardNumber: '35202-2345678-2',
    onDuty: true, dutyLog: [
        { status: 'ON_DUTY', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() }
    ],
    baseSalary: 25000, perPickupCommission: 15, perDeliveryCommission: 20,
  },
  { 
    id: 'driver-faisal', name: 'Faisal Mir', email: 'faisal.m@send.pk', role: UserRole.DRIVER, status: 'ACTIVE', phone: '0300-3334455', deliveryZones: ['Zone 3'],
    photoUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
    whatsappNumber: '0300-3334455', currentAddress: 'House 5, Street 2, Johar Town, Lahore', permanentAddress: 'Same as current',
    guardianContact: '0300-2221111 (Uncle)', idCardNumber: '35202-3456789-3',
    onDuty: false, dutyLog: [
        { status: 'ON_DUTY', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
        { status: 'OFF_DUTY', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() }
    ],
    baseSalary: 28000, perPickupCommission: 20, perDeliveryCommission: 30,
  },
  { 
    id: 'driver-imran', name: 'Imran Malik', email: 'imran.m@send.pk', role: UserRole.DRIVER, status: 'ACTIVE', phone: '0300-4445566', deliveryZones: ['Zone 1', 'Zone 2'],
    photoUrl: '', whatsappNumber: '0300-4445566', currentAddress: 'Flat 10, Block B, Wapda Town, Lahore', permanentAddress: 'Village & PO Box, Sahiwal',
    guardianContact: '0300-3332222 (Father)', idCardNumber: '35202-4567890-4',
    onDuty: true, dutyLog: [
         { status: 'ON_DUTY', timestamp: new Date().toISOString() }
    ],
    baseSalary: 25000, perPickupCommission: 18, perDeliveryCommission: 22,
  },
  { 
    id: 'driver-saqib', name: 'Saqib Nisar', email: 'saqib.n@send.pk', role: UserRole.DRIVER, status: 'INACTIVE', phone: '0300-5556677', deliveryZones: ['Zone 3', 'Zone 4'],
    photoUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
    whatsappNumber: '0300-5556677', currentAddress: 'Apt 4C, Askari 11, Lahore', permanentAddress: 'Apt 4C, Askari 11, Lahore',
    guardianContact: '0300-4443333 (Spouse)', idCardNumber: '35202-5678901-5',
    onDuty: false, dutyLog: [],
    baseSalary: 25000, perPickupCommission: 15, perDeliveryCommission: 20,
  },
];

const now = new Date();
const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
const twoDaysAgo = new Date(now); twoDaysAgo.setDate(now.getDate() - 2);

export const PARCELS: Parcel[] = [
    {
        id: 'p1001', orderId: 'KH-12345', trackingNumber: 'SD1001', brandId: 'brand-khaadi', brandName: 'Khaadi',
        recipientName: 'Ayesha Siddiqui', recipientAddress: '123, Street 5, Phase 6, DHA Defence', recipientPhone: '0321-1234567',
        status: ParcelStatus.DELIVERED, pickupDriverId: 'driver-imran', deliveryDriverId: 'driver-ali', codAmount: 3500, weight: 1.0, deliveryCharge: 250, tax: 40,
        createdAt: twoDaysAgo.toISOString(), updatedAt: yesterday.toISOString(), deliveryZone: 'Zone 1', isCodReconciled: true,
        itemDetails: '2-Piece Lawn Suit', deliveryInstructions: 'Leave at the gate if not home.',
        pickupAddress: 'Packages Mall Warehouse, Walton Road',
        history: [
            { status: ParcelStatus.BOOKED, createdAt: twoDaysAgo.toISOString(), updatedBy: 'Khaadi', notes: 'Parcel booked by brand.' },
            { status: ParcelStatus.PICKED_UP, createdAt: new Date(new Date(twoDaysAgo).getTime() + 2*3600*1000).toISOString(), updatedBy: 'Imran Malik' },
            { status: ParcelStatus.AT_HUB, createdAt: new Date(new Date(twoDaysAgo).getTime() + 5*3600*1000).toISOString(), updatedBy: 'Umar Farooq', notes: 'Assigned to Zone: Zone 1' },
            { status: ParcelStatus.OUT_FOR_DELIVERY, createdAt: new Date(new Date(yesterday).getTime() - 4*3600*1000).toISOString(), updatedBy: 'Umar Farooq' },
            { status: ParcelStatus.DELIVERED, createdAt: yesterday.toISOString(), updatedBy: 'Ali Khan' }
        ],
    },
    {
        id: 'p1002', orderId: 'SP-98765', trackingNumber: 'SD1002', brandId: 'brand-sapphire', brandName: 'Sapphire',
        recipientName: 'Fatima Hasan', recipientAddress: '45-B, Block C, Gulberg 3', recipientPhone: '0333-7654321',
        status: ParcelStatus.DELIVERED, pickupDriverId: 'driver-bilal', deliveryDriverId: 'driver-bilal', codAmount: 5200, weight: 0.5, deliveryCharge: 200, tax: 32,
        createdAt: twoDaysAgo.toISOString(), updatedAt: twoDaysAgo.toISOString(), deliveryZone: 'Zone 2', isCodReconciled: false,
        itemDetails: 'Signature Perfume',
        pickupAddress: 'Main Warehouse, Sundar Industrial Estate',
        history: [
            { status: ParcelStatus.BOOKED, createdAt: twoDaysAgo.toISOString(), updatedBy: 'Sapphire' },
            { status: ParcelStatus.DELIVERED, createdAt: twoDaysAgo.toISOString(), updatedBy: 'Bilal Ahmed' }
        ],
    },
    {
        id: 'p1003', orderId: 'KH-12346', trackingNumber: 'SD1003', brandId: 'brand-khaadi', brandName: 'Khaadi',
        recipientName: 'Osama Bin Tariq', recipientAddress: '789, Road 10, Phase 5, DHA Defence', recipientPhone: '0301-8765432',
        status: ParcelStatus.OUT_FOR_DELIVERY, pickupDriverId: 'driver-imran', deliveryDriverId: 'driver-ali', codAmount: 2100, weight: 1.5, deliveryCharge: 250, tax: 40,
        createdAt: yesterday.toISOString(), updatedAt: now.toISOString(), deliveryZone: 'Zone 1', isCodReconciled: true,
        itemDetails: 'Men\'s Kurta', deliveryInstructions: 'Call upon arrival.',
        isOpenParcel: true,
        pickupAddress: 'Packages Mall Warehouse, Walton Road',
        history: [
             { status: ParcelStatus.BOOKED, createdAt: yesterday.toISOString(), updatedBy: 'Khaadi' },
             { status: ParcelStatus.OUT_FOR_DELIVERY, createdAt: now.toISOString(), updatedBy: 'Umar Farooq' }
        ],
    },
    {
        id: 'p1004', orderId: 'CB-55511', trackingNumber: 'SD1004', brandId: 'brand-cakes', brandName: 'Cakes & Bakes',
        recipientName: 'Saad Rafique', recipientAddress: 'House 11, Block G, Johar Town', recipientPhone: '0345-9876543',
        status: ParcelStatus.AT_HUB, pickupDriverId: 'driver-faisal', deliveryDriverId: undefined, codAmount: 1500, weight: 2.0, deliveryCharge: 300, tax: 48,
        createdAt: yesterday.toISOString(), updatedAt: yesterday.toISOString(), deliveryZone: 'Zone 3', isCodReconciled: true,
        itemDetails: '1-Pound Chocolate Fudge Cake',
        pickupAddress: 'Central Kitchen, Johar Town',
        history: [
             { status: ParcelStatus.BOOKED, createdAt: yesterday.toISOString(), updatedBy: 'Cakes & Bakes' },
             { status: ParcelStatus.AT_HUB, createdAt: yesterday.toISOString(), updatedBy: 'Umar Farooq' }
        ],
    },
    {
        id: 'p1005', orderId: 'SP-98766', trackingNumber: 'SD1005', brandId: 'brand-sapphire', brandName: 'Sapphire',
        recipientName: 'Hina Pervaiz', recipientAddress: '22-C, M.M. Alam Road, Gulberg', recipientPhone: '0312-3456789',
        status: ParcelStatus.PICKED_UP, pickupDriverId: 'driver-bilal', deliveryDriverId: undefined, codAmount: 8900, weight: 1.0, deliveryCharge: 200, tax: 32,
        createdAt: now.toISOString(), updatedAt: now.toISOString(), isCodReconciled: true,
        itemDetails: 'Luxury Pret Collection Dress',
        pickupAddress: 'Main Warehouse, Sundar Industrial Estate',
        history: [
             { status: ParcelStatus.BOOKED, createdAt: now.toISOString(), updatedBy: 'Sapphire' },
             { status: ParcelStatus.PICKED_UP, createdAt: now.toISOString(), updatedBy: 'Bilal Ahmed' }
        ],
    },
    {
        id: 'p1006', orderId: 'KH-12347', trackingNumber: 'SD1006', brandId: 'brand-khaadi', brandName: 'Khaadi',
        recipientName: 'Mariam Nawaz', recipientAddress: '1-A, Main Boulevard, Model Town', recipientPhone: '0300-1122334',
        status: ParcelStatus.PICKED_UP, pickupDriverId: 'driver-imran', deliveryDriverId: undefined, codAmount: 4250, weight: 0.5, deliveryCharge: 250, tax: 40,
        createdAt: now.toISOString(), updatedAt: now.toISOString(), isCodReconciled: true,
        itemDetails: 'Embroidered Lawn Shirt',
        pickupAddress: 'Packages Mall Warehouse, Walton Road',
        history: [
            { status: ParcelStatus.BOOKED, createdAt: now.toISOString(), updatedBy: 'Khaadi' },
            { status: ParcelStatus.PICKED_UP, createdAt: now.toISOString(), updatedBy: 'Imran Malik' }
        ],
    },
    {
        id: 'p1007', orderId: 'CB-55512', trackingNumber: 'SD1007', brandId: 'brand-cakes', brandName: 'Cakes & Bakes',
        recipientName: 'Jawad Ahmed', recipientAddress: 'Bakery Lane, Johar Town', recipientPhone: '0322-5566778',
        status: ParcelStatus.DELIVERED, pickupDriverId: 'driver-faisal', deliveryDriverId: 'driver-faisal', codAmount: 950, weight: 1.0, deliveryCharge: 300, tax: 48,
        createdAt: twoDaysAgo.toISOString(), updatedAt: yesterday.toISOString(), deliveryZone: 'Zone 3', isCodReconciled: false,
        itemDetails: '12x Chicken Patties',
        pickupAddress: 'Central Kitchen, Johar Town',
        history: [
            { status: ParcelStatus.BOOKED, createdAt: twoDaysAgo.toISOString(), updatedBy: 'Cakes & Bakes' },
            { status: ParcelStatus.DELIVERED, createdAt: yesterday.toISOString(), updatedBy: 'Faisal Mir' }
        ],
    },
     {
        id: 'p1008', orderId: 'SP-98767', trackingNumber: 'SD1008', brandId: 'brand-sapphire', brandName: 'Sapphire',
        recipientName: 'Zara Khan', recipientAddress: '55, Liberty Market, Gulberg', recipientPhone: '0300-8889900',
        status: ParcelStatus.DELIVERY_FAILED, pickupDriverId: 'driver-bilal', deliveryDriverId: 'driver-bilal', codAmount: 6300, weight: 2.5, deliveryCharge: 200, tax: 32,
        createdAt: yesterday.toISOString(), updatedAt: now.toISOString(), deliveryZone: 'Zone 2', isCodReconciled: true,
        itemDetails: '1x Handbag, 1x Wallet',
        failedAttemptReason: 'Customer not home',
        proofOfAttempt: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Placeholder 1x1 pixel image
        brandRemark: 'Customer requested re-attempt tomorrow after 5 PM.',
        pickupAddress: 'Main Warehouse, Sundar Industrial Estate',
        history: [
            { status: ParcelStatus.BOOKED, createdAt: yesterday.toISOString(), updatedBy: 'Sapphire' },
            { status: ParcelStatus.DELIVERY_FAILED, createdAt: now.toISOString(), updatedBy: 'Bilal Ahmed', notes: 'Reason: Customer not home' }
        ],
    },
    {
        id: 'p1009', orderId: 'KH-12348', trackingNumber: 'SD1009', brandId: 'brand-khaadi', brandName: 'Khaadi',
        recipientName: 'Ahmed Ali', recipientAddress: '4B, Phase 1, DHA Defence', recipientPhone: '0301-7778899',
        status: ParcelStatus.RETURNED, pickupDriverId: 'driver-imran', deliveryDriverId: 'driver-ali', codAmount: 1800, weight: 1.0, deliveryCharge: 250, tax: 40,
        createdAt: twoDaysAgo.toISOString(), updatedAt: yesterday.toISOString(), deliveryZone: 'Zone 1', isCodReconciled: true,
        itemDetails: 'Kids Wear',
        pickupAddress: 'Emporium Mall Warehouse, Johar Town',
        history: [
            { status: ParcelStatus.BOOKED, createdAt: twoDaysAgo.toISOString(), updatedBy: 'Khaadi' },
            { status: ParcelStatus.RETURNED, createdAt: yesterday.toISOString(), updatedBy: 'Ali Khan' }
        ],
    },
    {
        id: 'p1010', orderId: 'KH-12349', trackingNumber: 'SD1010', brandId: 'brand-khaadi', brandName: 'Khaadi',
        recipientName: 'Sana Javed', recipientAddress: '88-Z, Phase 3, DHA Defence', recipientPhone: '0321-4445566',
        status: ParcelStatus.PICKED_UP, pickupDriverId: 'driver-imran', deliveryDriverId: undefined, codAmount: 7200, weight: 1.5, deliveryCharge: 250, tax: 40,
        createdAt: now.toISOString(), updatedAt: now.toISOString(), isCodReconciled: true,
        itemDetails: '3-Piece Unstitched Suit',
        pickupAddress: 'Packages Mall Warehouse, Walton Road',
        history: [
            { status: ParcelStatus.BOOKED, createdAt: now.toISOString(), updatedBy: 'Khaadi' },
            { status: ParcelStatus.PICKED_UP, createdAt: now.toISOString(), updatedBy: 'Imran Malik' }
        ],
    },
    {
        id: 'p1011', orderId: 'KH-12352', trackingNumber: 'SD1011', brandId: 'brand-khaadi', brandName: 'Khaadi',
        recipientName: 'Bilawal Bhutto', recipientAddress: '90, Shahrah-e-Quaideen, Cantt', recipientPhone: '0345-1112233',
        status: ParcelStatus.BOOKED, pickupDriverId: 'driver-faisal', deliveryDriverId: undefined, codAmount: 2500, weight: 3.0, deliveryCharge: 250, tax: 40,
        createdAt: now.toISOString(), updatedAt: now.toISOString(), isCodReconciled: true,
        itemDetails: 'Custom Birthday Cake',
        pickupAddress: 'Emporium Mall Warehouse, Johar Town',
        history: [
            { status: ParcelStatus.BOOKED, createdAt: now.toISOString(), updatedBy: 'Khaadi' }
        ],
    },
     {
        id: 'p1012', orderId: 'KH-12350', trackingNumber: 'SD1012', brandId: 'brand-khaadi', brandName: 'Khaadi',
        recipientName: 'Imran Khan', recipientAddress: 'Bani Gala, Model Town', recipientPhone: '0300-0000000',
        status: ParcelStatus.DELIVERED, pickupDriverId: 'driver-imran', deliveryDriverId: 'driver-imran', codAmount: 1992, weight: 0.5, deliveryCharge: 250, tax: 40,
        createdAt: twoDaysAgo.toISOString(), updatedAt: yesterday.toISOString(), deliveryZone: 'Zone 2', isCodReconciled: false,
        itemDetails: 'Waistcoat',
        pickupAddress: 'Packages Mall Warehouse, Walton Road',
        history: [
            { status: ParcelStatus.BOOKED, createdAt: twoDaysAgo.toISOString(), updatedBy: 'Khaadi' },
            { status: ParcelStatus.DELIVERED, createdAt: yesterday.toISOString(), updatedBy: 'Imran Malik' }
        ],
    },
    {
        id: 'p1013', orderId: 'SP-98768', trackingNumber: 'SD1013', brandId: 'brand-sapphire', brandName: 'Sapphire',
        recipientName: 'Saba Qamar', recipientAddress: 'Penthouse A, Gulberg Galleria', recipientPhone: '0333-1010101',
        status: ParcelStatus.OUT_FOR_DELIVERY, pickupDriverId: 'driver-bilal', deliveryDriverId: 'driver-bilal', codAmount: 12500, weight: 1.0, deliveryCharge: 200, tax: 32,
        createdAt: yesterday.toISOString(), updatedAt: now.toISOString(), deliveryZone: 'Zone 2', isCodReconciled: true,
        itemDetails: 'Formal Wear Gown', deliveryInstructions: 'Handle with care. Fragile item.',
        shipperAdvice: 'This is a high-value item, ensure secure delivery.',
        pickupAddress: 'Main Warehouse, Sundar Industrial Estate',
        history: [
            { status: ParcelStatus.BOOKED, createdAt: yesterday.toISOString(), updatedBy: 'Sapphire' },
            { status: ParcelStatus.OUT_FOR_DELIVERY, createdAt: now.toISOString(), updatedBy: 'Umar Farooq' }
        ],
    },
    {
        id: 'p1014', orderId: 'KH-12351', trackingNumber: 'SD1014', brandId: 'brand-khaadi', brandName: 'Khaadi',
        recipientName: 'Mahira Khan', recipientAddress: '15, Street 1, Phase 8, DHA Defence', recipientPhone: '0321-2020202',
        status: ParcelStatus.DELIVERED, pickupDriverId: 'driver-imran', deliveryDriverId: 'driver-ali', codAmount: 4800, weight: 1.0, deliveryCharge: 250, tax: 40,
        createdAt: twoDaysAgo.toISOString(), updatedAt: yesterday.toISOString(), deliveryZone: 'Zone 4', isCodReconciled: false,
        itemDetails: 'Ready to Wear Shirt',
        pickupAddress: 'Packages Mall Warehouse, Walton Road',
        history: [
            { status: ParcelStatus.BOOKED, createdAt: twoDaysAgo.toISOString(), updatedBy: 'Khaadi' },
            { status: ParcelStatus.DELIVERED, createdAt: yesterday.toISOString(), updatedBy: 'Ali Khan' }
        ],
    },
     {
        id: 'p1015', orderId: 'CB-55514', trackingNumber: 'SD1015', brandId: 'brand-cakes', brandName: 'Cakes & Bakes',
        recipientName: 'Fawad Khan', recipientAddress: '42, Block H, Johar Town', recipientPhone: '0345-3030303',
        status: ParcelStatus.PICKED_UP, pickupDriverId: 'driver-faisal', deliveryDriverId: undefined, codAmount: 1800, weight: 2.0, deliveryCharge: 300, tax: 48,
        createdAt: now.toISOString(), updatedAt: now.toISOString(), isCodReconciled: true,
        itemDetails: 'Assorted Pastries Box',
        shipperAdvice: 'Keep refrigerated if possible. Deliver ASAP.',
        pickupAddress: 'Central Kitchen, Johar Town',
        history: [
            { status: ParcelStatus.BOOKED, createdAt: now.toISOString(), updatedBy: 'Cakes & Bakes' },
            { status: ParcelStatus.PICKED_UP, createdAt: now.toISOString(), updatedBy: 'Faisal Mir' }
        ],
    }
];