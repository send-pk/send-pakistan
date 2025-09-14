import { UserRole, ParcelStatus } from './types';

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
