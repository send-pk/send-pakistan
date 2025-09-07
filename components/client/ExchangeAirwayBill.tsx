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
        <div className="bg-white text-black p-2 rounded-md w-full max-w-4xl h-full border border-black" style={{ aspectRatio: '2 / 1' }}>
            <div className="flex flex-col h-full">
                {/* Top Section */}
                <div className="flex justify-between items-center border-b-2 border-black pb-1 px-2">
                    <h1 className="text-xl font-bold">SEND - EXCHANGE</h1>
                    <div className="text-right">
                        <p className="font-bold text-xs">CASH ON DELIVERY</p>
                        <p className="font-bold text-lg">PKR {outboundParcel.codAmount.toFixed(2)}</p>
                    </div>
                </div>

                {/* Consignee Info Section */}
                <div className="border-b-2 border-black p-2 text-xs">
                    <div className="grid grid-cols-2">
                         <div>
                            <p className="font-bold">FROM (BRAND):</p>
                            <p className="text-sm">{outboundParcel.brandName}</p>
                        </div>
                        <div>
                            <p className="font-bold">TO (CUSTOMER):</p>
                            <p className="text-sm font-semibold">{outboundParcel.recipientName}</p>
                            <p>{outboundParcel.recipientAddress}</p>
                            <p>{outboundParcel.recipientPhone}</p>
                        </div>
                    </div>
                </div>

                {/* Middle Section: Side-by-side details */}
                <div className="flex-grow flex border-b-2 border-black">
                    {/* Left: Outbound Details */}
                    <div className="w-1/2 border-r-2 border-black p-2 flex flex-col text-xs">
                        <p className="font-bold underline">DELIVER TO CUSTOMER:</p>
                        <p className="mt-1"><strong>Order ID:</strong> {outboundParcel.orderId}</p>
                        <p><strong>Items:</strong> {outboundParcel.itemDetails}</p>
                        {outboundParcel.deliveryInstructions && <p className="font-bold mt-1">ADVICE: {outboundParcel.deliveryInstructions}</p>}
                    </div>
                    {/* Right: Return Details */}
                    <div className="w-1/2 p-2 flex flex-col text-xs">
                        <p className="font-bold underline">COLLECT FROM CUSTOMER:</p>
                        <p className="mt-1"><strong>Return for Order:</strong> {returnParcel.orderId}</p>
                        <p><strong>Items:</strong> {formatReturnItems(returnParcel.returnItemDetails)}</p>
                        <p className="mt-auto font-bold text-center text-sm">NO COD FOR RETURN</p>
                    </div>
                </div>
                
                {/* Bottom Section: Barcode */}
                <div className="flex items-center justify-center pt-1">
                    <svg ref={barcodeRef}></svg>
                </div>
            </div>
        </div>
    );
};