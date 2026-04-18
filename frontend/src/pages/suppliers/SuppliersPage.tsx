import { useEffect, useState } from 'react';
import client from '../../api/client';

interface Supplier {
  supplierId: string; name: string; contactName: string; phone: string; email: string;
  address: string; notes: string; isActive: boolean;
}
const EMPTY = { name: '', contactName: '', phone: '', email: '', address: '', notes: '' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | Supplier>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try { setSuppliers((await client.get('/pharmacy/suppliers')).data); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setError(''); setModal('create'); }
  function openEdit(s: Supplier) {
    setForm({ name: s.name, contactName: s.contactName ?? '', phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', notes: s.notes ?? '' });
    setError(''); setModal(s);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    try {
      if (modal === 'create') await client.post('/pharmacy/suppliers', form);
      else await client.put(`/pharmacy/suppliers/${(modal as Supplier).supplierId}`, form);
      setModal(null); load();
    } catch { setError('Save failed.'); }
    finally { setSaving(false); }
  }

  async function handleDeactivate(s: Supplier) {
    if (!confirm(`Deactivate ${s.name}?`)) return;
    await client.delete(`/pharmacy/suppliers/${s.supplierId}`);
    load();
  }

  const FIELDS: [keyof typeof EMPTY, string][] = [['name', 'Name *'], ['contactName', 'Contact Person'], ['phone', 'Phone'], ['email', 'Email'], ['address', 'Address'], ['notes', 'Notes']];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <button onClick={openCreate} className="btn-primary text-sm px-4 py-2 rounded-lg">+ Add Supplier</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400 text-sm">Loading…</div> :
          suppliers.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No suppliers yet.</div> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left">
                {['Name', 'Contact', 'Phone', 'Email', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {suppliers.map(s => (
                  <tr key={s.supplierId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.contactName || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      <button onClick={() => openEdit(s)} className="text-green-700 hover:text-green-900 text-xs font-medium">Edit</button>
                      {s.isActive && <button onClick={() => handleDeactivate(s)} className="text-red-500 hover:text-red-700 text-xs">Deactivate</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">{modal === 'create' ? 'Add Supplier' : 'Edit Supplier'}</h2>
            {FIELDS.map(([field, label]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type="text" value={form[field]} onChange={e => { setForm(f => ({ ...f, [field]: e.target.value })); setError(''); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
              </div>
            ))}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="text-sm text-gray-600">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-5 py-2 rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
