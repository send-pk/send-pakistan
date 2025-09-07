
import React from 'react';
import { Parcel, ParcelStatus, User } from '../../types';
import { CITY_COORDS, LAHORE_BOUNDS } from '../../constants';
import { PackageIcon } from '../icons/PackageIcon';
import { MapPinIcon } from '../icons/MapPinIcon';
import { TruckIcon } from '../icons/TruckIcon';
import { BuildingOfficeIcon } from '../icons/BuildingOfficeIcon';
import { useTheme } from '../../App';

interface LahoreMapProps {
    parcel: Parcel;
    driver?: User | null;
}

const getPointOnLine = (start: { x: number, y: number }, end: { x: number, y: number }, percentage: number) => {
    return {
        x: start.x + (end.x - start.x) * percentage,
        y: start.y + (end.y - start.y) * percentage,
    };
};

const mapCoords = (lat: number, lng: number, bounds: typeof LAHORE_BOUNDS, viewbox: { width: number, height: number }) => {
    const latRatio = (lat - bounds.lat.min) / (bounds.lat.max - bounds.lat.min);
    const lngRatio = (lng - bounds.lng.min) / (bounds.lng.max - bounds.lng.min);
    
    // Clamp values between 0 and 1 to stay within bounds
    const clampedLatRatio = Math.max(0, Math.min(1, latRatio));
    const clampedLngRatio = Math.max(0, Math.min(1, lngRatio));

    // In SVG, (0,0) is top-left. Latitude increases downwards.
    return {
        x: clampedLngRatio * viewbox.width,
        y: (1 - clampedLatRatio) * viewbox.height,
    };
};


export const LahoreMap: React.FC<LahoreMapProps> = ({ parcel, driver }) => {
    const { theme } = useTheme();
    
    const origin = CITY_COORDS['BRAND'];
    const warehouse = CITY_COORDS['WAREHOUSE'];
    const destination = CITY_COORDS['LAHORE'];

    const getDriverPosition = () => {
        if (driver?.currentLocation && [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.PICKED_UP].includes(parcel.status)) {
            return mapCoords(driver.currentLocation.lat, driver.currentLocation.lng, LAHORE_BOUNDS, { width: 300, height: 200 });
        }
        
        switch (parcel.status) {
            case ParcelStatus.PICKED_UP:
                return origin;
            case ParcelStatus.AT_HUB:
                return warehouse;
            case ParcelStatus.OUT_FOR_DELIVERY:
                return getPointOnLine(warehouse, destination, 0.5); // Fallback if no live location
            case ParcelStatus.DELIVERED:
                return destination;
            default:
                return null;
        }
    };
    
    const driverPosition = getDriverPosition();

    return (
        <div className="relative w-full aspect-[3/2] bg-surface rounded-lg overflow-hidden border border-border">
            <style>
                {` @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.5); opacity: 0.3; } } .driver-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; } `}
            </style>
            <svg viewBox="0 0 300 200" className="w-full h-full">
                {/* Roads */}
                <path d="M50 180 Q 150 180, 150 110 T 250 40" stroke="rgb(var(--color-border-rgb))" strokeWidth="2" fill="none" />
                <path d="M20 120 Q 100 130, 160 160 T 280 160" stroke="rgb(var(--color-border-rgb))" strokeWidth="2" fill="none" />
                <path d="M230 20 Q 220 100, 150 110 T 70 140 T 30 150" stroke="rgb(var(--color-border-rgb))" strokeWidth="2" fill="none" />

                {/* Routes */}
                <line x1={origin.x} y1={origin.y} x2={warehouse.x} y2={warehouse.y} stroke="rgb(var(--color-text-muted-rgb))" strokeWidth="2" strokeDasharray="4" />
                <line x1={warehouse.x} y1={warehouse.y} x2={destination.x} y2={destination.y} stroke="rgb(var(--color-text-muted-rgb))" strokeWidth="2" strokeDasharray="4" />

                {/* Origin Pin (Brand) */}
                <g transform={`translate(${origin.x}, ${origin.y})`}>
                    <circle cx="0" cy="0" r="5" fill="rgb(var(--color-text-secondary-rgb))" />
                    <text x="0" y="22" textAnchor="middle" fontSize="10" fill="rgb(var(--color-text-secondary-rgb))" className="font-semibold">{parcel.brandName}</text>
                    <PackageIcon className="text-surface" width="8" height="8" x="-4" y="-4" />
                </g>
                
                {/* Warehouse Pin */}
                <g transform={`translate(${warehouse.x}, ${warehouse.y})`}>
                    <circle cx="0" cy="0" r="5" fill="#0EA5E9" />
                    <text x="0" y="-12" textAnchor="middle" fontSize="10" fill="#0EA5E9" className="font-semibold">Warehouse</text>
                    <BuildingOfficeIcon className="text-surface" width="8" height="8" x="-4" y="-3" />
                </g>

                {/* Destination Pin */}
                <g transform={`translate(${destination.x}, ${destination.y})`}>
                    <circle cx="0" cy="0" r="5" fill="rgb(var(--color-primary-rgb))" />
                    <text x="0" y="22" textAnchor="middle" fontSize="10" fill="rgb(var(--color-primary-rgb))" className="font-semibold">You</text>
                    <MapPinIcon className="text-surface" width="8" height="8" x="-4" y="-4" strokeWidth="0" />
                </g>
                
                {/* Driver Position */}
                {driverPosition && (
                    <g transform={`translate(${driverPosition.x}, ${driverPosition.y})`}>
                        <circle cx="0" cy="0" r="12" fill="rgb(var(--color-primary-rgb))" opacity="0.7" className="driver-pulse" />
                        <circle cx="0" cy="0" r="6" fill="rgb(var(--color-primary-rgb))" stroke="rgb(var(--color-surface-rgb))" strokeWidth="2" />
                        <TruckIcon className="text-surface" width="8" height="8" x="-4" y="-4" />
                    </g>
                )}
            </svg>
        </div>
    );
};
