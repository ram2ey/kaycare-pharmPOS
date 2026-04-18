import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { getDrugs } from '../../api/drugs';
import type { DrugResponse } from '../../types';

interface POSummary {
  purchaseOrderId: string; orderNumber: string; supplierName: string; status: string;
  orderDate: string; expectedDeliveryDate: string | null; itemCount: number;
}
interface Supplier { supplierId: string; name: string; }
interface DraftItem { drugInventoryId: string; drugName: string; quantity: number; unitCost: number; }

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Ordered: 'bg-blue-100 text-blue-700',
  PartiallyReceived: 'bg-amber-100 text-amber-700',
  Received: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<POSummary[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create modal state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [drugs, setDrugs] = useState<DrugResponse[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ drugInventoryId: '', drugName: '', quantity: 1, unitCost: 0 }]);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = status ? { status } : {};
      setOrders((await client.get('/pharmacy/purchase-orders', { params })).data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [status]);

  async function openCreate() {
    setSuppliers([]);
    setDrugs([]);
    setSupplierId(''); setExpectedDate(''); setNotes('');
    setItems([{ drugInventoryId: '', drugName: '', quantity: 1, unitCost: 0 }]);
    setCreateError('');
    setShowCreate(true);
    const [s, d] = await Promise.all([
      client.get('/pharmacy/suppliers?activeOnly=true').then(r => r.data as Supplier[]),
      getDrugs({ activeOnly: true }),
    ]);
    setSuppliers(s);
    setDrugs(d);
  }

  function updateItem(i: number, field: keyof DraftItem, value: string | number) {
    setItems(prev => {
      const next = [...prev];
      if (field === 'drugInventoryId') {
        const drug = drugs.find(d => d.drugInventoryId === value);
        next[i] = { ...next[i], drugInventoryId: value as string, drugName: drug?.name ?? '', unitCost: drug?.unitCost ?? 0 };
      } else {
        next[i] = { ...next[i], [field]: value };
      }
      return next;
    });
  }

  async function handleCreate() {
    const validItems = items.filter(it => it.drugInventoryId && it.quantity > 0);
    if (validItems.length === 0) { setCreateError('Add at least one item.'); return; }
    setSaving(true);
    try {
      const body = {
        supplierId: supplierId || null,
        expectedDeliveryDate: expectedDate || null,
        notes: notes || null,
        items: validItems.map(it => ({ drugInventoryId: it.drugInventoryId, quantity: it.quantity, unitCost: it.unitCost })),
      };
      await client.post('/pharmacy/purchase-orders', body);
      setShowCreate(false);
      load();
    } catch { setCreateError('Failed to create order.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <button onClick={openCreate} className="btn-primary text-sm px-4 py-2 rounded-lg">+ New Order</button>
      </div>

      <div className="flex gap-3">
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
          <option value="">All statuses</option>
          {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400 text-sm">Loading…</div> :
          orders.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No orders found.</div> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left">
                {['Order #', 'Supplier', 'Date', 'Expected', 'Items', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(o => (
                  <tr key={o.purchaseOrderId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{o.orderNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{o.supplierName || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-600">{o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{o.itemCount}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/purchase-orders/${o.purchaseOrderId}`} className="text-green-700 hover:text-green-900 font-medium text-xs">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl p-6 space-y-5 my-4">
            <h2 className="text-lg font-semibold text-gray-900">New Purchase Order</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
                  <option value="">No supplier</option>
                  {suppliers.map(s => <option key={s.supplierId} value={s.supplierId}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Expected Delivery</label>
                <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Items</label>
                <button onClick={() => setItems(it => [...it, { drugInventoryId: '', drugName: '', quantity: 1, unitCost: 0 }])}
                  className="text-xs text-green-700 hover:text-green-900 font-medium">+ Add row</button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={item.drugInventoryId}
                      onChange={e => updateItem(i, 'drugInventoryId', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
                      <option value="">Select drug…</option>
                      {drugs.map(d => <option key={d.drugInventoryId} value={d.drugInventoryId}>{d.name}{d.strength ? ` ${d.strength}` : ''}</option>)}
                    </select>
                    <input type="number" min={1} placeholder="Qty" value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2" />
                    <input type="number" min={0} step={0.01} placeholder="Cost" value={item.unitCost}
                      onChange={e => updateItem(i, 'unitCost', parseFloat(e.target.value) || 0)}
                      className="w-24 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2" />
                    {items.length > 1 && (
                      <button onClick={() => setItems(it => it.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 text-lg leading-none px-1">&times;</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowCreate(false)} className="text-sm text-gray-600">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="btn-primary text-sm px-5 py-2 rounded-lg disabled:opacity-50">
                {saving ? 'Creating…' : 'Create Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
