import { useEffect, useState } from 'react';
import { getDrugs, createDrug, updateDrug, getDrugMovements, addMovement, seedCatalog } from '../../api/drugs';
import type { DrugResponse } from '../../types';

const CATEGORIES = ['Antibiotics', 'Antimalarials', 'Analgesics', 'Antihypertensives', 'Antidiabetics', 'ARVs', 'Vitamins', 'Controlled Substance', 'OTC', 'Other'];
const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Suppository', 'Patch', 'Other'];
const UNITS = ['Tablets', 'Capsules', 'Bottles', 'Vials', 'Tubes', 'Packs', 'Units'];
const MANUAL_TYPES = [
  { value: 'AdjustAdd', label: 'Add (Adjustment)' },
  { value: 'AdjustDeduct', label: 'Deduct (Adjustment)' },
  { value: 'Return', label: 'Return' },
  { value: 'Expire', label: 'Expire' },
  { value: 'WriteOff', label: 'Write-Off' },
];

interface DrugForm {
  name: string; genericName: string; dosageForm: string; strength: string; unit: string;
  category: string; reorderThreshold: number; unitCost: number; sellingPrice: number;
  isControlledSubstance: boolean; isActive: boolean;
}
const EMPTY_DRUG: DrugForm = { name: '', genericName: '', dosageForm: '', strength: '', unit: 'Tablets', category: 'Other', reorderThreshold: 10, unitCost: 0, sellingPrice: 0, isControlledSubstance: false, isActive: true };

export default function InventoryPage() {
  const [drugs, setDrugs] = useState<DrugResponse[]>([]);
  const [filter, setFilter] = useState<{ search: string; category: string; lowStock: boolean }>({ search: '', category: '', lowStock: false });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | DrugResponse>(null);
  const [adjDrug, setAdjDrug] = useState<DrugResponse | null>(null);
  const [histDrug, setHistDrug] = useState<DrugResponse | null>(null);
  const [history, setHistory] = useState<{ movementType: string; quantity: number; newStock: number; notes: string; createdAt: string }[]>([]);
  const [form, setForm] = useState<DrugForm>(EMPTY_DRUG);
  const [adj, setAdj] = useState({ type: 'AdjustAdd', qty: 1, notes: '' });
  const [saving, setSaving]   = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError]     = useState('');

  async function load() {
    setLoading(true);
    try { setDrugs(await getDrugs({ category: filter.category || undefined, lowStock: filter.lowStock })); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter.category, filter.lowStock]);

  const filtered = drugs.filter(d =>
    d.name.toLowerCase().includes(filter.search.toLowerCase()) ||
    (d.genericName ?? '').toLowerCase().includes(filter.search.toLowerCase())
  );

  function openCreate() { setForm(EMPTY_DRUG); setError(''); setModal('create'); }
  function openEdit(d: DrugResponse) {
    setForm({ name: d.name, genericName: d.genericName ?? '', dosageForm: d.dosageForm ?? '', strength: d.strength ?? '', unit: d.unit ?? 'Tablets', category: d.category ?? 'Other', reorderThreshold: d.reorderThreshold, unitCost: d.unitCost, sellingPrice: d.sellingPrice, isControlledSubstance: d.isControlledSubstance, isActive: d.isActive });
    setError(''); setModal(d);
  }

  async function handleSaveDrug() {
    if (!form.name.trim()) { setError('Drug name is required.'); return; }
    setSaving(true);
    try {
      if (modal === 'create') await createDrug(form);
      else await updateDrug((modal as DrugResponse).drugInventoryId, form);
      setModal(null); load();
    } catch { setError('Save failed.'); }
    finally { setSaving(false); }
  }

  async function handleAdj() {
    if (!adjDrug) return;
    setSaving(true);
    try {
      await addMovement(adjDrug.drugInventoryId, { movementType: adj.type, quantity: adj.qty, notes: adj.notes });
      setAdjDrug(null); load();
    } catch { setError('Adjustment failed.'); }
    finally { setSaving(false); }
  }

  async function handleSeedCatalog() {
    setSeeding(true);
    try {
      const res = await seedCatalog();
      if (res.added === 0) {
        alert('Inventory already has drugs — seed catalog was skipped.');
      } else {
        load();
      }
    } catch { setError('Seed failed.'); }
    finally { setSeeding(false); }
  }

  async function openHistory(d: DrugResponse) {
    setHistDrug(d);
    const moves = await getDrugMovements(d.drugInventoryId);
    setHistory(moves.slice(0, 30));
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Drug Inventory</h1>
        <button onClick={openCreate} className="btn-primary text-sm px-4 py-2 rounded-lg">+ Add Drug</button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input placeholder="Search…" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2" />
        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={filter.lowStock} onChange={e => setFilter(f => ({ ...f, lowStock: e.target.checked }))} />
          Low stock only
        </label>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400 text-sm">Loading…</div> :
          filtered.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-gray-400 text-sm mb-4">
                {drugs.length === 0 ? 'Your inventory is empty.' : 'No drugs match your filter.'}
              </div>
              {drugs.length === 0 && (
                <button
                  onClick={handleSeedCatalog}
                  disabled={seeding}
                  className="mx-auto px-5 py-2.5 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50"
                >
                  {seeding ? 'Loading catalog…' : '📦 Load Starter Catalog (27 common drugs)'}
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {['Drug', 'Category', 'Stock', 'Selling Price', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(d => (
                  <tr key={d.drugInventoryId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{d.name}{d.isControlledSubstance && <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">CS</span>}</div>
                      <div className="text-xs text-gray-400">{[d.dosageForm, d.strength].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.category}</td>
                    <td className="px-4 py-3">
                      <span className={d.currentStock <= d.reorderThreshold ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                        {d.currentStock} {d.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">GHS {d.sellingPrice.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      <button onClick={() => openEdit(d)} className="text-green-700 hover:text-green-900 text-xs font-medium">Edit</button>
                      <button onClick={() => { setAdj({ type: 'AdjustAdd', qty: 1, notes: '' }); setError(''); setAdjDrug(d); }} className="text-gray-600 hover:text-gray-900 text-xs font-medium">Adjust</button>
                      <button onClick={() => openHistory(d)} className="text-gray-400 hover:text-gray-700 text-xs">History</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Drug create/edit modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 space-y-4 my-4">
            <h2 className="text-lg font-semibold">{modal === 'create' ? 'Add Drug' : 'Edit Drug'}</h2>
            <div className="grid grid-cols-2 gap-3">
              {([['name', 'Name *'], ['genericName', 'Generic Name'], ['dosageForm', 'Dosage Form'], ['strength', 'Strength']] as [keyof DrugForm, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  {field === 'dosageForm' ? (
                    <select value={form[field] as string} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
                      <option value="">Select…</option>
                      {FORMS.map(v => <option key={v}>{v}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={form[field] as string} onChange={e => { setForm(f => ({ ...f, [field]: e.target.value })); setError(''); }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
                  )}
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
                  {UNITS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
                  {CATEGORIES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              {([['reorderThreshold', 'Reorder At'], ['unitCost', 'Cost (GHS)'], ['sellingPrice', 'Sell Price (GHS)']] as [keyof DrugForm, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type="number" min={0} step={0.01} value={form[field] as number}
                    onChange={e => setForm(f => ({ ...f, [field]: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="cs" checked={form.isControlledSubstance} onChange={e => setForm(f => ({ ...f, isControlledSubstance: e.target.checked }))} />
                <label htmlFor="cs" className="text-sm">Controlled Substance</label>
              </div>
              {modal !== 'create' && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="active" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                  <label htmlFor="active" className="text-sm">Active</label>
                </div>
              )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModal(null)} className="text-sm text-gray-600">Cancel</button>
              <button onClick={handleSaveDrug} disabled={saving} className="btn-primary text-sm px-5 py-2 rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment modal */}
      {adjDrug && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Stock Adjustment — {adjDrug.name}</h2>
            <p className="text-sm text-gray-500">Current: <strong>{adjDrug.currentStock} {adjDrug.unit}</strong></p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={adj.type} onChange={e => setAdj(a => ({ ...a, type: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
                {MANUAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
              <input type="number" min={1} value={adj.qty} onChange={e => setAdj(a => ({ ...a, qty: parseInt(e.target.value) || 1 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input type="text" value={adj.notes} onChange={e => setAdj(a => ({ ...a, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setAdjDrug(null)} className="text-sm text-gray-600">Cancel</button>
              <button onClick={handleAdj} disabled={saving} className="btn-primary text-sm px-5 py-2 rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Apply'}</button>
            </div>
          </div>
        </div>
      )}

      {/* History panel */}
      {histDrug && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[70vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold">Movement History — {histDrug.name}</h2>
              <button onClick={() => setHistDrug(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {history.length === 0 ? <div className="p-6 text-center text-gray-400 text-sm">No movements.</div> :
                history.map((m, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{m.movementType}</span>
                      {m.notes && <span className="text-gray-400 ml-2">· {m.notes}</span>}
                      <div className="text-xs text-gray-400 mt-0.5">{new Date(m.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{m.quantity > 0 ? '+' : ''}{m.quantity}</span>
                      <div className="text-xs text-gray-400">→ {m.newStock}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
