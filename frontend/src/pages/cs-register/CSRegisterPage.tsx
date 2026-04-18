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
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controlled Substance Register</h1>
          <p className="text-sm text-gray-500 mt-0.5">Full audit trail for all CS drug movements.</p>
        </div>
        <a href={`/api/pharmacy/cs-register/report${from ? `?from=${from}` : ''}${to ? `&to=${to}` : ''}`}
          target="_blank" rel="noreferrer"
          className="btn-outline text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
          Download PDF
        </a>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
        </div>
        <button onClick={load} className="btn-primary text-sm px-4 py-2 rounded-lg">Apply</button>
      </div>

      {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> :
        entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
            No controlled substance movements found.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{entries.length} drug{entries.length !== 1 ? 's' : ''} · {totalMovements} movement{totalMovements !== 1 ? 's' : ''}</p>
            {entries.map(e => (
              <div key={e.drugInventoryId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Drug header */}
                <button
                  onClick={() => setExpanded(ex => ex === e.drugInventoryId ? null : e.drugInventoryId)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 text-left"
                >
                  <div>
                    <span className="font-semibold text-gray-900">{e.drugName}</span>
                    {e.genericName && <span className="text-gray-400 text-sm ml-2">({e.genericName})</span>}
                    <span className="ml-3 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">CS</span>
                    <div className="text-xs text-gray-400 mt-0.5">{[e.dosageForm, e.strength].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">Balance: {e.currentStock}</div>
                    <div className="text-xs text-gray-400">{e.movements.length} movement{e.movements.length !== 1 ? 's' : ''}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{expanded === e.drugInventoryId ? '▲' : '▼'}</div>
                  </div>
                </button>

                {/* Movements table */}
                {expanded === e.drugInventoryId && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    {e.movements.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-gray-400">No movements in this range.</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            {['Date', 'Type', 'In', 'Out', 'Balance', 'Reference', 'Notes', 'Staff'].map(h => (
                              <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {e.movements.map(m => (
                            <tr key={m.stockMovementId} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(m.date).toLocaleString()}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{m.movementType}</span>
                              </td>
                              <td className="px-4 py-3 text-green-700 font-medium">{m.quantityIn ?? '—'}</td>
                              <td className="px-4 py-3 text-red-600 font-medium">{m.quantityOut ?? '—'}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{m.balance}</td>
                              <td className="px-4 py-3 text-gray-400 text-xs">{m.referenceType ?? '—'}</td>
                              <td className="px-4 py-3 text-gray-500">{m.notes ?? '—'}</td>
                              <td className="px-4 py-3 text-gray-600">{m.recordedBy}</td>
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
