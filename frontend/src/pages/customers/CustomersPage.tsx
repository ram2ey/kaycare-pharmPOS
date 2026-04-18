import { useEffect, useState } from 'react';
import { getCustomers, createCustomer, updateCustomer, getCustomerSales } from '../../api/customers';
import type { CustomerResponse, SaveCustomerRequest, SaleSummaryResponse } from '../../types';

const EMPTY: SaveCustomerRequest = { name: '', phone: '', email: '', notes: '' };

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PurchaseHistoryModal({ customer, onClose }: { customer: CustomerResponse; onClose: () => void }) {
  const [sales, setSales] = useState<SaleSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomerSales(customer.customerId)
      .then(setSales)
      .finally(() => setLoading(false));
  }, [customer.customerId]);

  const totalSpent = sales.filter(s => !s.isVoided).reduce((sum, s) => sum + s.totalAmount, 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{customer.name}</h2>
            <p className="text-sm text-gray-500">Purchase History</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No purchases yet.</div>
        ) : (
          <>
            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b">
              <div className="text-center">
                <div className="text-xs text-gray-500">Total Purchases</div>
                <div className="text-xl font-bold text-gray-900">{sales.filter(s => !s.isVoided).length}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Total Spent</div>
                <div className="text-xl font-bold text-green-700">{fmt(totalSpent)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Voided</div>
                <div className="text-xl font-bold text-red-500">{sales.filter(s => s.isVoided).length}</div>
              </div>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="bg-gray-50 text-left">
                    {['Receipt #', 'Date', 'Payment', 'Items', 'Amount', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.map(s => (
                    <tr key={s.saleId} className={`hover:bg-gray-50 ${s.isVoided ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{s.saleNumber}</td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {new Date(s.saleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{s.paymentMethod}</td>
                      <td className="px-4 py-2.5 text-gray-600">{s.itemCount}</td>
                      <td className="px-4 py-2.5 font-medium">{fmt(s.totalAmount)}</td>
                      <td className="px-4 py-2.5">
                        {s.isVoided ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">Voided</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="p-4 border-t">
          <button onClick={onClose} className="w-full py-2 text-sm border rounded-lg hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState<null | 'create' | CustomerResponse>(null);
  const [historyCustomer, setHistoryCustomer] = useState<CustomerResponse | null>(null);
  const [form, setForm]           = useState<SaveCustomerRequest>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  async function load(q = '') {
    setLoading(true);
    try { setCustomers(await getCustomers(q)); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setError(''); setModal('create'); }
  function openEdit(c: CustomerResponse) {
    setForm({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', notes: c.notes ?? '' });
    setError('');
    setModal(c);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    try {
      if (modal === 'create') {
        await createCustomer(form);
      } else {
        await updateCustomer((modal as CustomerResponse).customerId, form);
      }
      setModal(null);
      load(search);
    } catch { setError('Save failed. Please try again.'); }
    finally { setSaving(false); }
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800"
        >
          + Add Customer
        </button>
      </div>

      <div className="flex gap-3">
        <input
          type="search"
          placeholder="Search by name, phone or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); load(e.target.value); }}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No customers found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                {['Name', 'Phone', 'Email', 'Notes', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.customerId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{c.notes || '—'}</td>
                  <td className="px-4 py-3 flex items-center gap-3">
                    <button
                      onClick={() => setHistoryCustomer(c)}
                      className="text-xs text-gray-500 hover:text-gray-800"
                    >
                      History
                    </button>
                    <button onClick={() => openEdit(c)} className="text-xs text-green-700 hover:text-green-900 font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{modal === 'create' ? 'Add Customer' : 'Edit Customer'}</h2>
            {[
              { field: 'name',  label: 'Name',  required: true },
              { field: 'phone', label: 'Phone', required: false },
              { field: 'email', label: 'Email', required: false },
            ].map(({ field, label, required }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
                <input
                  type={field === 'email' ? 'email' : 'text'}
                  value={form[field as keyof SaveCustomerRequest]}
                  onChange={e => { setForm(f => ({ ...f, [field]: e.target.value })); setError(''); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes ?? ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModal(null)} className="text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase History Modal */}
      {historyCustomer && (
        <PurchaseHistoryModal customer={historyCustomer} onClose={() => setHistoryCustomer(null)} />
      )}
    </div>
  );
}
