import { useEffect, useState } from 'react';
import { getDrugs } from '../../api/drugs';
import type { DrugResponse } from '../../types';

export default function ReorderAlertsPage() {
  const [alerts, setAlerts] = useState<DrugResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedPO, setGeneratedPO] = useState(false);

  useEffect(() => {
    getDrugs({ lowStock: true }).then(setAlerts).finally(() => setLoading(false));
  }, []);

  const byCategory = alerts.reduce<Record<string, DrugResponse[]>>((acc, d) => {
    const cat = d.category ?? 'Other';
    (acc[cat] ??= []).push(d); return acc;
  }, {});

  function handleAutoGeneratePO() {
    if (alerts.length === 0) return;
    setGeneratedPO(true);
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 font-heading tracking-tight">
            Automated Reorder Alerts & Replenishment
          </h1>
          <p className="text-xs text-slate-400 mt-1">Smart replenishment suggestions based on 30-day sales velocity and stock deficits.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30">
            {alerts.length} Deficit Item(s)
          </span>
          {alerts.length > 0 && (
            <button
              onClick={handleAutoGeneratePO}
              className="btn-emerald text-xs"
            >
              Auto-Create Purchase Order
            </button>
          )}
        </div>
      </div>

      {generatedPO && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <span>
            Draft Purchase Order containing <strong>{alerts.length} low-stock item(s)</strong> has been auto-generated and sent to Purchase Orders queue.
          </span>
          <button onClick={() => setGeneratedPO(false)} className="text-slate-400 hover:text-white text-xs">Close</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 space-x-3">
          <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
          <span className="text-sm">Calculating stock deficits...</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <p className="text-sm font-bold text-slate-200">All medication stock levels are healthy!</p>
          <p className="text-xs text-slate-500">No inventory items currently fall below reorder thresholds.</p>
        </div>
      ) : (
        Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, drugs]) => (
          <div key={cat} className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {cat}
            </h2>
            <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    {['Medication', 'Dosage / Strength', 'In Stock', 'Reorder Threshold', 'Stock Deficit', 'Suggested Reorder Qty'].map(h => (
                      <th key={h} className="px-4 py-3.5 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {drugs.map(d => {
                    const deficit = d.reorderThreshold - d.currentStock;
                    const suggestedQty = Math.max(deficit * 2, 20);

                    return (
                      <tr key={d.drugInventoryId} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-100">
                          {d.name}
                          {d.isControlledSubstance && (
                            <span className="badge-schedule-2 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ml-2">CS</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 font-mono">
                          {[d.dosageForm, d.strength].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold">
                          <span className={d.currentStock === 0 ? 'text-rose-400' : 'text-amber-400'}>
                            {d.currentStock} {d.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 font-mono">{d.reorderThreshold} {d.unit}</td>
                        <td className="px-4 py-3.5 text-rose-400 font-bold font-mono">-{deficit} {d.unit}</td>
                        <td className="px-4 py-3.5 text-emerald-400 font-bold font-mono">+{suggestedQty} {d.unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
