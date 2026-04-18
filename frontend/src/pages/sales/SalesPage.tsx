import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSales, getDailySummary } from '../../api/sales';
import type { SaleSummaryResponse, DailySalesSummaryResponse } from '../../types';

function fmt(n: number) {
  return n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SalesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [sales, setSales] = useState<SaleSummaryResponse[]>([]);
  const [summary, setSummary] = useState<DailySalesSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([getSales({ from, to }), getDailySummary(from)]);
      setSales(s);
      setSummary(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
        <Link to="/pos" className="btn-primary text-sm px-4 py-2 rounded-lg">+ New Sale</Link>
      </div>

      {/* Filters */}
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

      {/* Daily summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Sales', value: `GHS ${fmt(summary.totalRevenue)}` },
            { label: 'Transactions', value: summary.totalSales.toString() },
            { label: 'Avg Basket', value: summary.totalSales > 0 ? `GHS ${fmt(summary.totalRevenue / summary.totalSales)}` : 'GHS 0.00' },
            { label: 'Cash Revenue', value: `GHS ${fmt(summary.cashRevenue)}` },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-xl font-bold text-gray-900 mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sales table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No sales in this range.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                {['Sale #', 'Date', 'Customer', 'Items', 'Total', 'Paid', 'Method', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map(s => (
                <tr key={s.saleId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.saleNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{new Date(s.saleDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-700">{s.customerName || <span className="text-gray-400">Walk-in</span>}</td>
                  <td className="px-4 py-3 text-gray-700">{s.itemCount}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{fmt(s.totalAmount)}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(s.paidAmount)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{s.paymentMethod}</span>
                  </td>
                  <td className="px-4 py-3">
                    {s.isVoided
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Voided</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Completed</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/sales/${s.saleId}`} className="text-green-700 hover:text-green-900 font-medium text-xs">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
