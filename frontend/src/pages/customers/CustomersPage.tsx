import { useEffect, useState } from 'react';
import { getCustomers, createCustomer, updateCustomer, getCustomerSales } from '../../api/customers';
import type { CustomerResponse, SaveCustomerRequest, SaleSummaryResponse } from '../../types';

const EMPTY: SaveCustomerRequest = { name: '', phone: '', email: '', notes: '', allergies: [], chronicConditions: [] };

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

  const validSales = sales.filter(s => !s.isVoided);
  const totalSpent = validSales.reduce((sum, s) => sum + (s.totalAmount || s.netAmount || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans">
      <div className="glass-modal rounded-2xl border border-slate-700/80 w-full max-w-2xl flex flex-col max-h-[85vh] shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Dispensing & Purchase History — {customer.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Patient Rx refill history, receipt logs, and lifetime transaction record</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm">Close</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 space-x-3">
            <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
            <span className="text-sm">Fetching patient transaction timeline...</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No transaction history recorded for this patient yet.</div>
        ) : (
          <>
            {/* Patient KPI Strip */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-900/60 border-b border-slate-800 text-xs">
              <div className="text-center">
                <div className="text-slate-400">Total Visits</div>
                <div className="text-xl font-bold font-mono text-slate-100">{validSales.length}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400">Lifetime Spend</div>
                <div className="text-xl font-bold font-mono-price text-emerald-400">${fmt(totalSpent)}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400">Voided Transactions</div>
                <div className="text-xl font-bold font-mono text-rose-400">{sales.filter(s => s.isVoided).length}</div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    {['Receipt #', 'Date', 'Tender', 'Items', 'Net Amount', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {sales.map(s => (
                    <tr key={s.saleId} className={`hover:bg-slate-900/40 ${s.isVoided ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-3 font-bold text-slate-200">#{s.saleNumber || s.receiptNumber || s.saleId.substring(0, 8)}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {new Date(s.saleDate || s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-sans">{s.paymentMethod}</td>
                      <td className="px-4 py-3 font-bold text-slate-200">{s.itemCount}</td>
                      <td className="px-4 py-3 font-mono-price font-bold text-emerald-400">${fmt(s.totalAmount || s.netAmount || 0)}</td>
                      <td className="px-4 py-3 font-sans">
                        {s.isVoided ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold">Voided</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Dispensed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <button onClick={onClose} className="btn-glass w-full text-xs">Close Timeline</button>
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
  const [allergiesText, setAllergiesText] = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  async function load(q = '') {
    setLoading(true);
    try { setCustomers(await getCustomers(q)); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(EMPTY);
    setAllergiesText('');
    setError('');
    setModal('create');
  }

  function openEdit(c: CustomerResponse) {
    setForm({
      name: c.name,
      phone: c.phone ?? '',
      email: c.email ?? '',
      notes: c.notes ?? '',
      allergies: c.allergies ?? [],
      chronicConditions: c.chronicConditions ?? []
    });
    setAllergiesText((c.allergies ?? []).join(', '));
    setError('');
    setModal(c);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Patient name is required.'); return; }
    setSaving(true);
    const parsedAllergies = allergiesText.split(',').map(s => s.trim()).filter(Boolean);
    const reqForm = { ...form, allergies: parsedAllergies };

    try {
      if (modal === 'create') {
        await createCustomer(reqForm);
      } else {
        await updateCustomer((modal as CustomerResponse).customerId, reqForm);
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
    <div className="p-8 space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 font-heading tracking-tight">
            Patient & Customer Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage patient health records, allergy profiles, and dispensing timelines.</p>
        </div>
        <button onClick={openCreate} className="btn-emerald text-xs">
          + Add New Patient Profile
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
        <input
          type="search"
          placeholder="Search patient by name, mobile phone number, or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); load(e.target.value); }}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Patient Table */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 space-x-3">
            <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
            <span className="text-sm">Loading patient records...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No patient profiles found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  {['Patient Name', 'Phone', 'Email', 'Recorded Allergies', 'Notes', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(c => (
                  <tr key={c.customerId} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-100">{c.name}</td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono">{c.phone || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono">{c.email || '—'}</td>
                    <td className="px-4 py-3.5">
                      {c.allergies && c.allergies.length > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                          Allergies: {c.allergies.join(', ')}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">No allergies recorded</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 truncate max-w-xs">{c.notes || '—'}</td>
                    <td className="px-4 py-3.5 flex items-center gap-3">
                      <button
                        onClick={() => setHistoryCustomer(c)}
                        className="text-emerald-400 hover:underline font-semibold"
                      >
                        Timeline
                      </button>
                      <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-slate-200">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-modal rounded-2xl border border-slate-700/80 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-slate-100">{modal === 'create' ? 'Add Patient Profile' : 'Edit Patient Profile'}</h2>
            <div className="space-y-3 text-xs">
              {[
                { field: 'name',  label: 'Full Name *' },
                { field: 'phone', label: 'Mobile Phone Number' },
                { field: 'email', label: 'Email Address' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-slate-400 mb-1 font-semibold">{label}</label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={form[field as keyof SaveCustomerRequest] as string}
                    onChange={e => { setForm(f => ({ ...f, [field]: e.target.value })); setError(''); }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Recorded Drug Allergies (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa, Aspirin"
                  value={allergiesText}
                  onChange={e => setAllergiesText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Clinical Notes / Pre-existing Conditions</label>
                <textarea
                  value={form.notes ?? ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
            {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModal(null)} className="btn-glass text-xs">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-emerald text-xs">{saving ? 'Saving...' : 'Save Patient'}</button>
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
