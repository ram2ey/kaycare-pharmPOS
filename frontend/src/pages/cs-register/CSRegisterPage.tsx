import { useEffect, useState } from 'react';
import client from '../../api/client';

interface CSMovement {
  stockMovementId: string;
  date: string;
  movementType: string;
  quantityIn: number | null;
  quantityOut: number | null;
  balance: number;
  referenceType: string | null;
  notes: string | null;
  recordedBy: string;
}

interface CSDrugEntry {
  drugInventoryId: string;
  drugName: string;
  genericName: string | null;
  dosageForm: string | null;
  strength: string | null;
  currentStock: number;
  movements: CSMovement[];
}

export default function CSRegisterPage() {
  const [entries, setEntries] = useState<CSDrugEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load() {
    setLoading(true);
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    try { setEntries((await client.get('/pharmacy/cs-register', { params })).data); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const totalMovements = entries.reduce((sum, e) => sum + e.movements.length, 0);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 font-heading tracking-tight">
            Controlled Substance Logbook & Register
          </h1>
          <p className="text-xs text-slate-400 mt-1">Official Schedule II-V drug transaction register & balance compliance audit trail.</p>
        </div>
        <a
          href={`/api/pharmacy/cs-register/report${from ? `?from=${from}` : ''}${to ? `&to=${to}` : ''}`}
          target="_blank"
          rel="noreferrer"
          className="btn-emerald text-xs"
        >
          Export Regulatory PDF Report
        </a>
      </div>

      {/* Date Filter Panel */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">From Date</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">To Date</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button onClick={load} className="btn-emerald text-xs">
          Filter Logbook
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 space-x-3">
          <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
          <span className="text-sm">Fetching controlled substance register...</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 text-sm">
          No controlled substance drug movements recorded in this period.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Showing <strong className="text-slate-200">{entries.length}</strong> controlled medication(s) · <strong className="text-slate-200">{totalMovements}</strong> movement log(s)</span>
          </div>

          {entries.map(e => (
            <div key={e.drugInventoryId} className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
              {/* Drug Header */}
              <button
                onClick={() => setExpanded(ex => ex === e.drugInventoryId ? null : e.drugInventoryId)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-900/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="badge-schedule-2 text-xs font-extrabold px-2.5 py-1 rounded-lg">
                    Schedule II (C-II)
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">
                      {e.drugName}
                      {e.genericName && <span className="text-slate-400 font-normal text-xs ml-2">({e.genericName})</span>}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {[e.dosageForm, e.strength].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <span className="text-xs text-slate-400 block font-sans">Current Balance</span>
                    <span className="text-lg font-bold font-mono text-emerald-400">{e.currentStock} units</span>
                  </div>
                  <span className="text-slate-500 font-bold">{expanded === e.drugInventoryId ? 'Hide' : 'Show'}</span>
                </div>
              </button>

              {/* Movements Table */}
              {expanded === e.drugInventoryId && (
                <div className="border-t border-slate-800/80 bg-slate-950/60 overflow-x-auto">
                  {e.movements.length === 0 ? (
                    <div className="px-6 py-4 text-xs text-slate-500">No stock movements recorded in selected range.</div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                          {['Timestamp', 'Type', 'In (+)', 'Out (-)', 'Running Balance', 'Reference', 'Notes / Prescriber', 'Staff Pharmacist'].map(h => (
                            <th key={h} className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {e.movements.map(m => (
                          <tr key={m.stockMovementId} className="hover:bg-slate-900/40">
                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                              {new Date(m.date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3">
                              <span className="badge-schedule-3 text-[10px] px-2 py-0.5 rounded font-bold">
                                {m.movementType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-emerald-400 font-bold">{m.quantityIn ? `+${m.quantityIn}` : '—'}</td>
                            <td className="px-4 py-3 text-rose-400 font-bold">{m.quantityOut ? `-${m.quantityOut}` : '—'}</td>
                            <td className="px-4 py-3 font-bold text-slate-100">{m.balance}</td>
                            <td className="px-4 py-3 text-slate-500">{m.referenceType ?? '—'}</td>
                            <td className="px-4 py-3 text-slate-300 font-sans">{m.notes ?? '—'}</td>
                            <td className="px-4 py-3 text-slate-400 font-sans">{m.recordedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
