

import React, { useEffect, useRef } from 'react';
import { Parcel, Item } from '../../types';

declare var JsBarcode: any;

interface ExchangeAirwayBillProps {
    outboundParcel: Parcel;
    returnParcel: Parcel;
}

const formatReturnItems = (items?: Item[]): string => {
    if (!items || items.length === 0) return 'N/A';
    return items.map(item => `${item.quantity}x ${item.name}`).join(', ');
};

export const ExchangeAirwayBill: React.FC<ExchangeAirwayBillProps> = ({ outboundParcel, returnParcel }) => {
    const barcodeRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (outboundParcel && barcodeRef.current) {
            try {
                JsBarcode(barcodeRef.current, outboundParcel.trackingNumber, {
                    format: "CODE128",
                    lineColor: "#000",
                    width: 1.5,
                    height: 40,
                    displayValue: true,
                    fontOptions: "bold",
                    fontSize: 14,
                    margin: 5,
                });
            } catch (e) {
                console.error("JsBarcode error:", e);
            }
        }
    }, [outboundParcel]);

    return (
        <div className="awb-print-size bg-white text-black p-2 rounded-md w-full max-w-4xl h-full border border-black flex flex-col" style={{ aspectRatio: '2 / 1' }}>
            {/* Top Header */}
            <div className="flex justify-between items-center border-b-2 border-black pb-1 px-2">
                <h1 className="text-xl font-bold">SEND - EXCHANGE</h1>
                <div className="text-right">
                    <p className="font-bold text-xs">CASH ON DELIVERY</p>
                    <p className="font-bold text-lg">PKR {outboundParcel.codAmount.toFixed(2)}</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex">
                {/* Left Box: Outbound/Delivery */}
                <div className="w-1/2 border-r-2 border-black p-2 flex flex-col justify-between text-xs">
                    <div>
                        <p className="font-bold">TO (CUSTOMER):</p>
                        <p className="text-sm font-semibold">{outboundParcel.recipientName}</p>
                        <p>{outboundParcel.recipientAddress}</p>
                        <p>{outboundParcel.recipientPhone}</p>
                    </div>
                    <div>
                        <p className="font-bold underline mt-2">DELIVER TO CUSTOMER:</p>
                        <p><strong>Order ID:</strong> {outboundParcel.orderId}</p>
                        <p><strong>Items:</strong> {outboundParcel.itemDetails}</p>
                        {outboundParcel.deliveryInstructions && <p className="font-bold mt-1">ADVICE: {outboundParcel.deliveryInstructions}</p>}
                    </div>
                </div>

                {/* Right Box: Inbound/Return */}
                <div className="w-1/2 p-2 flex flex-col justify-between text-xs">
                    <div>
                        <p className="font-bold">FROM (BRAND):</p>
                        <p className="text-sm">{outboundParcel.brandName}</p>
                    </div>
                    <div>
                        <p className="font-bold underline mt-2">COLLECT FROM CUSTOMER:</p>
                        <p><strong>Return for Order:</strong> {returnParcel.orderId}</p>
                        <p><strong>Items:</strong> {formatReturnItems(returnParcel.returnItemDetails)}</p>
                        <p className="mt-auto font-bold text-center text-sm">NO COD FOR RETURN</p>
                    </div>
                </div>
            </div>

            {/* Customer Instructions */}
            <div className="border-y-2 border-black mt-1 p-1 text-center">
                <p className="font-bold text-xs">CUSTOMER INSTRUCTIONS:</p>
                <p className="text-[10px] leading-tight">
                    1. Receive your new items from the delivery box.
                    2. Place your return items inside the same box.
                    3. Peel this label and stick it onto the box for the driver.
                </p>
            </div>

            {/* Barcode Footer */}
            <div className="flex items-center justify-center pt-1">
                <svg ref={barcodeRef}></svg>
            </div>
        </div>
    );
};