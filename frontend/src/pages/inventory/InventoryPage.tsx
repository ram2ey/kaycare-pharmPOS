import { useEffect, useState } from 'react';
import { getDrugs, createDrug, updateDrug, getDrugMovements, addMovement, seedCatalog } from '../../api/drugs';
import type { DrugResponse } from '../../types';
import BarcodeModal from '../../components/BarcodeModal';
import CsvImportModal from '../../components/CsvImportModal';

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
  const [barcodeDrug, setBarcodeDrug] = useState<DrugResponse | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
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
    <div className="p-8 space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 font-heading tracking-tight">
            Medication Inventory Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage drug master catalog, stock levels, pricing, and barcode labels.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCsvImport(true)} className="btn-glass text-xs">
            Import CSV
          </button>
          <button onClick={openCreate} className="btn-emerald text-xs">
            + Add New Medication
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex flex-wrap gap-3 items-center">
        <input
          placeholder="Search medication by brand or generic name..."
          value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 placeholder-slate-500 flex-1 min-w-56 focus:outline-none focus:border-emerald-500"
        />
        <select
          value={filter.category}
          onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={filter.lowStock}
            onChange={e => setFilter(f => ({ ...f, lowStock: e.target.checked }))}
            className="rounded border-slate-800 bg-slate-950 text-emerald-500"
          />
          Low Stock Only
        </label>
      </div>

      {/* Inventory Table */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 space-x-3">
            <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
            <span className="text-sm">Loading medication inventory...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-4">
            <p className="text-sm">
              {drugs.length === 0 ? 'Your pharmacy inventory is empty.' : 'No medications match your search criteria.'}
            </p>
            {drugs.length === 0 && (
              <button
                onClick={handleSeedCatalog}
                disabled={seeding}
                className="btn-emerald text-xs"
              >
                {seeding ? 'Loading catalog...' : 'Seed Starter Catalog (27 common drugs)'}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  {['Medication', 'Category', 'Stock Level', 'Retail Price', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(d => (
                  <tr key={d.drugInventoryId} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-100 flex items-center gap-2">
                        {d.name}
                        {d.isControlledSubstance && (
                          <span className="badge-schedule-2 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">CS</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {[d.dosageForm, d.strength].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-medium">{d.category}</td>
                    <td className="px-4 py-3.5">
                      <span className={`font-mono font-bold ${d.currentStock <= d.reorderThreshold ? 'text-rose-400' : 'text-slate-200'}`}>
                        {d.currentStock} {d.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono-price font-bold text-emerald-400">
                      ${d.sellingPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 flex items-center gap-2">
                      <button onClick={() => openEdit(d)} className="text-emerald-400 hover:underline font-semibold">Edit</button>
                      <button onClick={() => setBarcodeDrug(d)} className="text-sky-400 hover:underline font-semibold">Label</button>
                      <button onClick={() => { setAdj({ type: 'AdjustAdd', qty: 1, notes: '' }); setError(''); setAdjDrug(d); }} className="text-slate-400 hover:text-slate-200">Adjust</button>
                      <button onClick={() => openHistory(d)} className="text-slate-500 hover:text-slate-300">History</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Barcode Label Modal */}
      {barcodeDrug && (
        <BarcodeModal drug={barcodeDrug} onClose={() => setBarcodeDrug(null)} />
      )}

      {/* CSV Import Modal */}
      {showCsvImport && (
        <CsvImportModal
          onClose={() => setShowCsvImport(false)}
          onSuccess={() => { setShowCsvImport(false); load(); }}
        />
      )}

      {/* Drug Create/Edit Modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-modal rounded-2xl border border-slate-700/80 w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100">{modal === 'create' ? 'Add New Medication' : 'Edit Medication'}</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {([['name', 'Name *'], ['genericName', 'Generic Name'], ['dosageForm', 'Dosage Form'], ['strength', 'Strength']] as [keyof DrugForm, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-slate-400 mb-1 font-semibold">{label}</label>
                  {field === 'dosageForm' ? (
                    <select value={form[field] as string} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500">
                      <option value="">Select...</option>
                      {FORMS.map(v => <option key={v}>{v}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={form[field] as string} onChange={e => { setForm(f => ({ ...f, [field]: e.target.value })); setError(''); }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" />
                  )}
                </div>
              ))}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Unit</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500">
                  {UNITS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500">
                  {CATEGORIES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              {([['reorderThreshold', 'Reorder Threshold'], ['unitCost', 'Cost ($)'], ['sellingPrice', 'Sell Price ($)']] as [keyof DrugForm, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-slate-400 mb-1 font-semibold">{label}</label>
                  <input type="number" min={0} step={0.01} value={form[field] as number}
                    onChange={e => setForm(f => ({ ...f, [field]: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" />
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="cs" checked={form.isControlledSubstance} onChange={e => setForm(f => ({ ...f, isControlledSubstance: e.target.checked }))} />
                <label htmlFor="cs" className="text-xs text-slate-300">Schedule II Controlled Substance</label>
              </div>
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModal(null)} className="btn-glass text-xs">Cancel</button>
              <button onClick={handleSaveDrug} disabled={saving} className="btn-emerald text-xs">{saving ? 'Saving...' : 'Save Medication'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjDrug && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-modal rounded-2xl border border-slate-700/80 w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-slate-100">Stock Adjustment — {adjDrug.name}</h2>
            <p className="text-xs text-slate-400">Current Stock: <strong className="text-emerald-400 font-mono">{adjDrug.currentStock} {adjDrug.unit}</strong></p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Adjustment Type</label>
                <select value={adj.type} onChange={e => setAdj(a => ({ ...a, type: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
                  {MANUAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Quantity</label>
                <input type="number" min={1} value={adj.qty} onChange={e => setAdj(a => ({ ...a, qty: parseInt(e.target.value) || 1 }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Reason / Notes</label>
                <input type="text" value={adj.notes} onChange={e => setAdj(a => ({ ...a, notes: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
              </div>
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setAdjDrug(null)} className="btn-glass text-xs">Cancel</button>
              <button onClick={handleAdj} disabled={saving} className="btn-emerald text-xs">{saving ? 'Saving...' : 'Apply Adjustment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Movement History Panel */}
      {histDrug && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-modal rounded-2xl border border-slate-700/80 w-full max-w-lg max-h-[70vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100">Movement Audit Log — {histDrug.name}</h2>
              <button onClick={() => setHistDrug(null)} className="text-slate-400 hover:text-slate-200 text-sm">Close</button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60 p-4 text-xs font-mono">
              {history.length === 0 ? <div className="py-8 text-center text-slate-500">No stock movements recorded.</div> :
                history.map((m, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200">{m.movementType}</span>
                      {m.notes && <span className="text-slate-400 font-sans ml-2">· {m.notes}</span>}
                      <div className="text-[10px] text-slate-500 mt-0.5">{new Date(m.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${m.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </span>
                      <div className="text-[10px] text-slate-500">New Stock: {m.newStock}</div>
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
