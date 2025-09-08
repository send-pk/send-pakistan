

import React, { useEffect, useRef } from 'react';
import { Parcel } from '../../types';

declare var JsBarcode: any;

interface AirwayBillProps {
  parcel: Parcel;
}

export const AirwayBill: React.FC<AirwayBillProps> = ({ parcel }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (parcel && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, parcel.trackingNumber, {
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
  }, [parcel]);

  // AWB designed to be approx. 19cm x 9cm to fit 3 on an A4 page
  return (
    <div className="awb-print-size bg-white text-black p-2 rounded-md w-full max-w-4xl h-full border border-black relative" style={{ aspectRatio: '2 / 1' }}>
      {parcel.isOpenParcel && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-15">
            <div className="text-4xl font-black text-red-500/50 border-4 border-red-500/50 rounded-lg px-4 py-1">
                OPEN PARCEL
            </div>
        </div>
      )}
      <div className="flex flex-col h-full">
        {/* Top Section */}
        <div className="flex justify-between items-center border-b-2 border-black pb-1 px-2">
          <h1 className="text-xl font-bold">SEND</h1>
          <div className="text-right">
            <p className="font-bold text-xs">CASH ON DELIVERY</p>
            <p className="font-bold text-lg">PKR {parcel.codAmount.toFixed(2)}</p>
          </div>
        </div>
        
        {/* Middle Section: Details */}
        <div className="flex-grow flex border-b-2 border-black">
          {/* Left: Shipper/Consignee */}
          <div className="w-2/3 border-r-2 border-black p-2 flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold">BRAND:</p>
              <p className="text-sm">{parcel.brandName}</p>
            </div>
            <div>
              <p className="text-xs font-bold">CONSIGNEE:</p>
              <p className="text-sm font-semibold">{parcel.recipientName}</p>
              <p className="text-xs">{parcel.recipientAddress}</p>
              <p className="text-xs">{parcel.recipientPhone}</p>
              {parcel.shipperAdvice && <p className="text-xs font-bold mt-1">ADVICE: {parcel.shipperAdvice}</p>}
            </div>
          </div>
          {/* Right: Order Info */}
          <div className="w-1/3 p-2 text-xs">
            <p><span className="font-bold">Date:</span> {new Date(parcel.createdAt).toLocaleDateString()}</p>
            <p className="mt-2"><span className="font-bold">Order ID:</span> {parcel.orderId}</p>
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