import type { DrugResponse } from '../types';

interface BarcodeModalProps {
  drug: DrugResponse;
  onClose: () => void;
}

export default function BarcodeModal({ drug, onClose }: BarcodeModalProps) {
  function handlePrint() {
    window.print();
  }

  const barcodeValue = drug.drugInventoryId.substring(0, 12).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md rounded-2xl border border-slate-700/80 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 print:hidden">
          <h3 className="text-sm font-bold text-slate-100">
            Barcode Label Printer
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xs">Close</button>
        </div>

        {/* Printable Label Card */}
        <div className="bg-white text-slate-900 p-4 rounded-xl shadow-lg border border-slate-200 text-center font-sans space-y-2 print:shadow-none print:border-none print:w-full">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-sm font-extrabold text-slate-900 leading-tight">{drug.name}</h4>
            <p className="text-xs text-slate-600 font-medium">
              {[drug.dosageForm, drug.strength].filter(Boolean).join(' · ')}
            </p>
          </div>

          {/* Barcode Lines */}
          <div className="py-2 flex flex-col items-center">
            <div className="h-10 w-48 flex items-center justify-center space-x-1">
              {[12, 4, 8, 16, 6, 10, 14, 4, 12, 18, 6, 8, 14, 4, 16, 8, 10, 12, 6, 14].map((h, i) => (
                <div key={i} className="bg-slate-950 w-1" style={{ height: `${h * 2}px` }}></div>
              ))}
            </div>
            <span className="text-[10px] font-mono tracking-widest text-slate-600 mt-1">*{barcodeValue}*</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 font-mono">
            <span className="text-slate-600 font-sans">Retail Price:</span>
            <span className="font-extrabold text-sm text-emerald-700">${drug.sellingPrice.toFixed(2)}</span>
          </div>

          {drug.expiryDate && (
            <div className="text-[10px] text-slate-500 font-mono text-right">
              Exp: {drug.expiryDate}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 print:hidden">
          <button onClick={handlePrint} className="btn-emerald flex-1 text-xs">
            Print Label
          </button>
          <button onClick={onClose} className="btn-glass flex-1 text-xs">
            Close
          </button>
        </div>

        {/* Print Stylesheet */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:w-full, .print\\:w-full * {
              visibility: visible;
            }
            .glass-modal {
              position: absolute;
              left: 0;
              top: 0;
              width: 60mm;
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
