import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSale, voidSale, receiptUrl } from '../../api/sales';
import type { SaleDetailResponse } from '../../types';

function fmt(n: number) {
  return n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<SaleDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [voidReason, setVoidReason] = useState('');
  const [showVoid, setShowVoid] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getSale(id).then(setSale).finally(() => setLoading(false));
  }, [id]);

  async function handleVoid() {
    if (!id || !voidReason.trim()) { setError('Void reason is required.'); return; }
    setVoiding(true);
    try {
      await voidSale(id, voidReason);
      const updated = await getSale(id);
      setSale(updated);
      setShowVoid(false);
      setVoidReason('');
    } catch {
      setError('Failed to void sale.');
    } finally {
      setVoiding(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (!sale) return <div className="p-8 text-center text-gray-400">Sale not found.</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">{sale.saleNumber}</h1>
        {sale.isVoided
          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Voided</span>
          : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Completed</span>}
      </div>

      {/* Meta */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date(sale.saleDate).toLocaleString()}</span></div>
        <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{sale.customerName || 'Walk-in'}</span></div>
        <div><span className="text-gray-500">Payment:</span> <span className="font-medium">{sale.paymentMethod}</span></div>
        <div><span className="text-gray-500">Sold by:</span> <span className="font-medium">{sale.soldByName}</span></div>
        {sale.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> <span className="font-medium">{sale.notes}</span></div>}
        {sale.isVoided && <div className="col-span-2 text-red-600"><span className="font-medium">Void reason:</span> {sale.voidReason}</div>}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">Items</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              {['Drug', 'Form / Strength', 'Qty', 'Unit Price', 'Total'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sale.items.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{item.drugName}</td>
                <td className="px-4 py-3 text-gray-500">{[item.dosageForm, item.strength].filter(Boolean).join(' · ')}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">{fmt(item.unitPrice)}</td>
                <td className="px-4 py-3 font-medium">{fmt(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmt(sale.totalAmount + sale.discountAmount)}</span></div>
        {sale.discountAmount > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>- {fmt(sale.discountAmount)}</span></div>}
        <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2"><span>Total</span><span>{fmt(sale.totalAmount)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Paid</span><span>{fmt(sale.paidAmount)}</span></div>
        {sale.change > 0 && <div className="flex justify-between text-gray-500"><span>Change</span><span>{fmt(sale.change)}</span></div>}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <a href={receiptUrl(sale.saleId)} target="_blank" rel="noreferrer"
          className="btn-outline text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
          Print Receipt
        </a>
        {!sale.isVoided && (
          <button onClick={() => setShowVoid(true)} className="btn-danger text-sm px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
            Void Sale
          </button>
        )}
      </div>

      {/* Void modal */}
      {showVoid && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Void Sale</h2>
            <p className="text-sm text-gray-600">Stock will be restored. This cannot be undone.</p>
            <textarea
              value={voidReason}
              onChange={e => { setVoidReason(e.target.value); setError(''); }}
              placeholder="Reason for voiding…"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowVoid(false)} className="text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleVoid} disabled={voiding}
                className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {voiding ? 'Voiding…' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
