import { useEffect, useState } from 'react';
import { getDailySummary } from '../../api/sales';
import { getDrugs } from '../../api/drugs';
import type { DailySalesSummaryResponse, DrugResponse } from '../../types';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function EODModal({ summary, onClose }: { summary: DailySalesSummaryResponse; onClose: () => void }) {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:bg-white print:inset-auto print:block">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 print:shadow-none print:max-w-none">
        <div className="flex items-center justify-between mb-5 print:hidden">
          <h2 className="text-lg font-semibold text-gray-900">End-of-Day Summary</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="text-center border-b pb-4 mb-4 hidden print:block">
          <div className="text-xl font-bold">End-of-Day Summary</div>
          <div className="text-gray-500 text-sm">{date}</div>
        </div>

        <div className="text-sm text-gray-500 text-center mb-4">{date}</div>

        {/* Main totals */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
          <div className="text-xs text-green-600 font-medium uppercase tracking-wide">Total Revenue</div>
          <div className="text-4xl font-bold text-green-700 mt-1">{fmt(summary.totalRevenue)}</div>
          <div className="text-sm text-green-600 mt-1">{summary.totalSales} sale{summary.totalSales !== 1 ? 's' : ''}</div>
        </div>

        {/* Payment breakdown */}
        <div className="space-y-2 mb-5">
          {[
            { label: 'Cash',         value: summary.cashRevenue,        icon: '💵' },
            { label: 'Card',         value: summary.cardRevenue,        icon: '💳' },
            { label: 'Mobile Money', value: summary.mobileMoneyRevenue, icon: '📱' },
            { label: 'Insurance',    value: summary.insuranceRevenue,   icon: '🏥' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-gray-700">{row.icon} {row.label}</span>
              <span className={`text-sm font-semibold ${row.value > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                {fmt(row.value)}
              </span>
            </div>
          ))}
        </div>

        {/* Top drugs */}
        {summary.topDrugs.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Sellers</div>
            {summary.topDrugs.slice(0, 5).map((d, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span className="text-gray-700">{d.drugName}</span>
                <span className="text-gray-500">{d.totalQuantity} units</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800"
          >
            Print Summary
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [summary, setSummary]   = useState<DailySalesSummaryResponse | null>(null);
  const [lowStock, setLowStock] = useState<DrugResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showEOD, setShowEOD]   = useState(false);

  useEffect(() => {
    Promise.all([
      getDailySummary(todayStr),
      getDrugs({ lowStock: true }),
    ]).then(([s, drugs]) => {
      setSummary(s);
      setLowStock(drugs.slice(0, 10));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => setShowEOD(true)}
          className="px-4 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800"
        >
          End-of-Day Summary
        </button>
      </div>

      {/* Today's stats */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Today's Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Revenue',      value: fmt(summary?.totalRevenue ?? 0),                                                                                   color: 'text-green-700' },
            { label: 'Transactions', value: (summary?.totalSales ?? 0).toString(),                                                                             color: 'text-gray-900' },
            { label: 'Avg Basket',   value: summary && summary.totalSales > 0 ? fmt(summary.totalRevenue / summary.totalSales) : '0.00',                       color: 'text-gray-900' },
            { label: 'Mobile Money', value: fmt(summary?.mobileMoneyRevenue ?? 0),                                                                             color: 'text-gray-900' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">{s.label}</div>
              <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment breakdown */}
      {summary && (summary.totalSales > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Today by Payment Method</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Cash',         value: summary.cashRevenue,        color: 'bg-green-50 text-green-800' },
              { label: 'Card',         value: summary.cardRevenue,        color: 'bg-blue-50 text-blue-800' },
              { label: 'Mobile Money', value: summary.mobileMoneyRevenue, color: 'bg-purple-50 text-purple-800' },
              { label: 'Insurance',    value: summary.insuranceRevenue,   color: 'bg-orange-50 text-orange-800' },
            ].map(p => (
              <div key={p.label} className={`rounded-lg px-4 py-3 ${p.color}`}>
                <div className="text-xs font-medium opacity-75">{p.label}</div>
                <div className="text-lg font-bold mt-0.5">{fmt(p.value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top drugs */}
      {summary && summary.topDrugs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Top Selling Today</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {['Drug', 'Units Sold', 'Revenue'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.topDrugs.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.drugName}</td>
                    <td className="px-4 py-3 text-gray-700">{d.totalQuantity}</td>
                    <td className="px-4 py-3 text-green-700 font-medium">{fmt(d.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low stock alerts */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Low Stock Alerts
          {lowStock.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">{lowStock.length}</span>
          )}
        </h2>
        {lowStock.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
            All stock levels are healthy.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {['Drug', 'Category', 'In Stock', 'Reorder At', 'Deficit'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowStock.map(d => (
                  <tr key={d.drugInventoryId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{d.name}</div>
                      <div className="text-xs text-gray-400">{[d.dosageForm, d.strength].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.category}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${d.currentStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>{d.currentStock} {d.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.reorderThreshold} {d.unit}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">{d.reorderThreshold - d.currentStock} {d.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EOD Modal */}
      {showEOD && summary && <EODModal summary={summary} onClose={() => setShowEOD(false)} />}
    </div>
  );
}
