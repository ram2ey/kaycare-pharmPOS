import type { SaleResponse } from '../types';

interface ThermalReceiptProps {
  sale: SaleResponse;
  tenantName?: string;
  tenantAddress?: string;
  tenantPhone?: string;
  onClose?: () => void;
}

export default function ThermalReceipt({
  sale,
  tenantName = 'KayCare Pharmacy',
  tenantAddress = '123 Health Ave, Medical Suite 4B',
  tenantPhone = '+1 (800) 555-KAYCARE',
  onClose,
}: ThermalReceiptProps) {
  function handlePrint() {
    window.print();
  }

  const receiptDate = new Date(sale.createdAt || sale.saleDate || Date.now()).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md rounded-2xl border border-slate-700/80 p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Actions Header (Hidden on Print) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 print:hidden">
          <h3 className="text-sm font-bold text-slate-100">
            Thermal POS Receipt Preview
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="btn-emerald text-xs px-3 py-1.5">
              Print Receipt
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-100 text-sm">
                Close
              </button>
            )}
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="overflow-y-auto my-4 p-5 bg-white text-slate-900 font-mono text-xs shadow-inner rounded-xl print:m-0 print:p-0 print:shadow-none print:w-full">
          {/* Pharmacy Header */}
          <div className="text-center border-b border-slate-300 pb-3 mb-3">
            <h2 className="text-base font-extrabold tracking-tight uppercase">{tenantName}</h2>
            <p className="text-[10px] text-slate-600 mt-0.5">{tenantAddress}</p>
            <p className="text-[10px] text-slate-600">Tel: {tenantPhone}</p>
          </div>

          {/* Transaction Metadata */}
          <div className="space-y-1 border-b border-slate-300 pb-3 mb-3 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice No:</span>
              <span className="font-bold">#{sale.receiptNumber || sale.saleNumber || sale.saleId.substring(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date/Time:</span>
              <span>{receiptDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{sale.cashierName || sale.soldByName || 'Pharmacist'}</span>
            </div>
            {sale.customerName && (
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold">{sale.customerName}</span>
              </div>
            )}
          </div>

          {/* Itemized Medications Table */}
          <table className="w-full text-left mb-3 border-b border-slate-300 pb-3">
            <thead>
              <tr className="border-b border-slate-300 text-[10px] uppercase text-slate-500">
                <th className="py-1">Medication</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Price</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((item, idx) => (
                <tr key={idx} className="text-[11px]">
                  <td className="py-1.5 pr-2">
                    <div className="font-bold">{item.drugName}</div>
                    {(item.strength || item.dosageForm) && (
                      <div className="text-[9px] text-slate-500">
                        {[item.strength, item.dosageForm].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 text-center font-bold">{item.quantity}</td>
                  <td className="py-1.5 text-right">${item.unitPrice.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-bold">${item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Totals Summary */}
          <div className="space-y-1 text-[11px] border-b border-slate-300 pb-3 mb-3">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>${(sale.subtotal || sale.netAmount).toFixed(2)}</span>
            </div>
            {(sale.discountAmount ?? 0) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount:</span>
                <span>-${sale.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold pt-1">
              <span>NET TOTAL:</span>
              <span>${(sale.netAmount || sale.totalAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1">
              <span>Paid ({sale.paymentMethod}):</span>
              <span>${(sale.paidAmount || sale.netAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Change Due:</span>
              <span>${(sale.changeAmount || sale.change || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Simulated Scannable Barcode SVG */}
          <div className="text-center my-3">
            <div className="h-10 w-full flex items-center justify-center space-x-1 opacity-80">
              {[12, 4, 8, 16, 6, 10, 14, 4, 12, 18, 6, 8, 14, 4, 16, 8, 10].map((h, i) => (
                <div key={i} className="bg-slate-950 w-1" style={{ height: `${h * 2}px` }}></div>
              ))}
            </div>
            <p className="text-[9px] text-slate-500 font-mono tracking-widest mt-1">
              *{sale.receiptNumber || sale.saleNumber || sale.saleId.substring(0, 8)}*
            </p>
          </div>

          {/* Footer Notice */}
          <div className="text-center text-[9px] text-slate-500 space-y-0.5 border-t border-slate-200 pt-2">
            <p className="font-bold">Thank you for trusting KayCare Pharmacy!</p>
            <p>Please inspect medications before leaving dispensary.</p>
            <p>Prescriptions non-refundable per Health Authority Regulations.</p>
          </div>
        </div>

        {/* Print Stylesheet */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:block, .print\\:block * {
              visibility: visible;
            }
            .glass-modal {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm;
              background: white !important;
              border: none !important;
              box-shadow: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
