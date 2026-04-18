import { useEffect, useState } from 'react';
import { getDrugs } from '../../api/drugs';
import type { DrugResponse } from '../../types';

export default function ReorderAlertsPage() {
  const [alerts, setAlerts] = useState<DrugResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDrugs({ lowStock: true }).then(setAlerts).finally(() => setLoading(false));
  }, []);

  const byCategory = alerts.reduce<Record<string, DrugResponse[]>>((acc, d) => {
    const cat = d.category ?? 'Other';
    (acc[cat] ??= []).push(d); return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reorder Alerts</h1>
        <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-semibold">{alerts.length} items</span>
      </div>

      {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> :
        alerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-gray-500">All stock levels are above reorder thresholds.</p>
          </div>
        ) : (
          Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, drugs]) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat}</h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      {['Drug', 'Form / Strength', 'In Stock', 'Reorder At', 'Deficit'].map(h => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {drugs.map(d => (
                      <tr key={d.drugInventoryId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{d.name}</span>
                          {d.isControlledSubstance && <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">CS</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{[d.dosageForm, d.strength].filter(Boolean).join(' · ') || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${d.currentStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                            {d.currentStock} {d.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{d.reorderThreshold} {d.unit}</td>
                        <td className="px-4 py-3 text-red-600 font-semibold">{d.reorderThreshold - d.currentStock} {d.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
    </div>
  );
}
