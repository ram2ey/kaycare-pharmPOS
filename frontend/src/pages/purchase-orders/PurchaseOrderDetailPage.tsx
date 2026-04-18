import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';

interface POItem {
  purchaseOrderItemId: string; drugName: string; quantity: number; quantityReceived: number;
  unitCost: number; totalCost: number;
}
interface PODetail {
  purchaseOrderId: string; orderNumber: string; supplierName: string; status: string;
  orderDate: string; expectedDeliveryDate: string | null; notes: string; items: POItem[];
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Ordered: 'bg-blue-100 text-blue-700',
  PartiallyReceived: 'bg-amber-100 text-amber-700',
  Received: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [po, setPo] = useState<PODetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [showReceive, setShowReceive] = useState(false);
  const [acting, setActing] = useState(false);

  async function load() {
    if (!id) return;
    const data = (await client.get(`/pharmacy/purchase-orders/${id}`)).data as PODetail;
    setPo(data);
    const init: Record<string, number> = {};
    data.items.forEach(it => { init[it.purchaseOrderItemId] = it.quantity - it.quantityReceived; });
    setReceiveQtys(init);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function action(path: string, body?: object) {
    setActing(true);
    try { await client.post(`/pharmacy/purchase-orders/${id}/${path}`, body ?? {}); await load(); }
    catch { alert('Action failed.'); }
    finally { setActing(false); }
  }

  async function handleReceive() {
    const items = Object.entries(receiveQtys)
      .filter(([, qty]) => qty > 0)
      .map(([purchaseOrderItemId, quantityReceived]) => ({ purchaseOrderItemId, quantityReceived }));
    if (items.length === 0) { alert('No quantities entered.'); return; }
    await action('receive', { items });
    setShowReceive(false);
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (!po) return <div className="p-8 text-center text-gray-400">Order not found.</div>;

  const canPlace = po.status === 'Draft';
  const canReceive = po.status === 'Ordered' || po.status === 'PartiallyReceived';
  const canCancel = po.status === 'Draft' || po.status === 'Ordered';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">{po.orderNumber}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-600'}`}>{po.status}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">Supplier:</span> <span className="font-medium">{po.supplierName || '—'}</span></div>
        <div><span className="text-gray-500">Order Date:</span> <span className="font-medium">{new Date(po.orderDate).toLocaleDateString()}</span></div>
        {po.expectedDeliveryDate && <div><span className="text-gray-500">Expected:</span> <span className="font-medium">{new Date(po.expectedDeliveryDate).toLocaleDateString()}</span></div>}
        {po.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> <span className="font-medium">{po.notes}</span></div>}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">Line Items</div>
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            {['Drug', 'Ordered', 'Received', 'Pending', 'Unit Cost', 'Total'].map(h => (
              <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {po.items.map(it => (
              <tr key={it.purchaseOrderItemId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{it.drugName}</td>
                <td className="px-4 py-3 text-gray-700">{it.quantity}</td>
                <td className="px-4 py-3 text-green-700">{it.quantityReceived}</td>
                <td className="px-4 py-3 text-amber-600">{it.quantity - it.quantityReceived}</td>
                <td className="px-4 py-3 text-gray-600">GHS {it.unitCost.toFixed(2)}</td>
                <td className="px-4 py-3 font-medium">GHS {it.totalCost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 flex-wrap">
        {canPlace && <button onClick={() => action('place')} disabled={acting} className="btn-primary text-sm px-4 py-2 rounded-lg disabled:opacity-50">Place Order</button>}
        {canReceive && <button onClick={() => setShowReceive(true)} className="btn-primary text-sm px-4 py-2 rounded-lg">Receive Goods</button>}
        {canCancel && <button onClick={() => { if (confirm('Cancel this order?')) action('cancel'); }} disabled={acting} className="btn-danger text-sm px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Cancel</button>}
      </div>

      {showReceive && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Receive Goods</h2>
            {po.items.filter(it => it.quantity > it.quantityReceived).map(it => (
              <div key={it.purchaseOrderItemId} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-gray-800">{it.drugName} <span className="text-gray-400 text-xs">(pending: {it.quantity - it.quantityReceived})</span></span>
                <input type="number" min={0} max={it.quantity - it.quantityReceived}
                  value={receiveQtys[it.purchaseOrderItemId] ?? 0}
                  onChange={e => setReceiveQtys(q => ({ ...q, [it.purchaseOrderItemId]: parseInt(e.target.value) || 0 }))}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2" />
              </div>
            ))}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowReceive(false)} className="text-sm text-gray-600">Cancel</button>
              <button onClick={handleReceive} disabled={acting} className="btn-primary text-sm px-5 py-2 rounded-lg disabled:opacity-50">{acting ? 'Saving…' : 'Confirm Receipt'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
