import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSalesReport } from '../../api/sales';
import type { SalesReportResponse } from '../../types';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export default function SalesReportPage() {
  const [from, setFrom]     = useState(daysAgo(29));
  const [to, setTo]         = useState(today());
  const [data, setData]     = useState<SalesReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setData(await getSalesReport({ from, to }));
    } catch {
      setError('Failed to load report.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handlePrint() {
    window.print();
  }

  const payBreakdown = data ? [
    { label: 'Cash',          value: data.cashRevenue,          color: 'bg-green-100 text-green-800' },
    { label: 'Card',          value: data.cardRevenue,          color: 'bg-blue-100 text-blue-800' },
    { label: 'Mobile Money',  value: data.mobileMoneyRevenue,   color: 'bg-purple-100 text-purple-800' },
    { label: 'Insurance',     value: data.insuranceRevenue,     color: 'bg-orange-100 text-orange-800' },
  ] : [];

  return (
    <div className="p-6 max-w-5xl mx-auto print:p-0 print:max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link to="/sales" className="text-gray-400 hover:text-gray-600 text-sm">← Sales History</Link>
          <h1 className="text-xl font-semibold text-gray-900">Sales Report</h1>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800"
        >
          Print / Export
        </button>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="mt-5 px-4 py-1.5 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Apply'}
        </button>
        {/* Quick ranges */}
        <div className="mt-5 flex gap-2">
          {[
            { label: 'Today',       f: today(), t: today() },
            { label: 'Last 7 days', f: daysAgo(6), t: today() },
            { label: 'Last 30 days',f: daysAgo(29), t: today() },
          ].map(r => (
            <button
              key={r.label}
              onClick={() => { setFrom(r.f); setTo(r.t); }}
              className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg mb-4 text-sm">{error}</div>}

      {data && (
        <>
          {/* Print header */}
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold">Sales Report</h1>
            <p className="text-gray-500">{data.from} to {data.to}</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500">Total Revenue</div>
              <div className="text-2xl font-bold text-green-700 mt-1">{fmt(data.totalRevenue)}</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500">Total Sales</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{data.totalSales}</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500">Avg Sale Value</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {data.totalSales > 0 ? fmt(data.totalRevenue / data.totalSales) : '0.00'}
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500">Voided Sales</div>
              <div className="text-2xl font-bold text-red-600 mt-1">{data.voidedSales}</div>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="bg-white rounded-xl border p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Revenue by Payment Method</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {payBreakdown.map(p => (
                <div key={p.label} className={`rounded-lg px-4 py-3 ${p.color}`}>
                  <div className="text-xs font-medium opacity-75">{p.label}</div>
                  <div className="text-lg font-bold mt-0.5">{fmt(p.value)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Top drugs */}
            <div className="bg-white rounded-xl border p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Top Selling Drugs</h2>
              {data.topDrugs.length === 0 ? (
                <p className="text-sm text-gray-400">No data</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="text-left pb-2">Drug</th>
                      <th className="text-right pb-2">Qty</th>
                      <th className="text-right pb-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topDrugs.map((d, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 text-gray-800">{d.drugName}</td>
                        <td className="py-1.5 text-right text-gray-600">{d.totalQuantity}</td>
                        <td className="py-1.5 text-right font-medium">{fmt(d.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Daily breakdown summary */}
            <div className="bg-white rounded-xl border p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Daily Breakdown</h2>
              {data.dailyBreakdown.length === 0 ? (
                <p className="text-sm text-gray-400">No sales in this period</p>
              ) : (
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b sticky top-0 bg-white">
                        <th className="text-left pb-2">Date</th>
                        <th className="text-right pb-2">Sales</th>
                        <th className="text-right pb-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dailyBreakdown.map((day, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1.5 text-gray-800">{day.date}</td>
                          <td className="py-1.5 text-right text-gray-600">{day.totalSales}</td>
                          <td className="py-1.5 text-right font-medium">{fmt(day.totalRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Full daily detail */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Daily Detail</h2>
            {data.dailyBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400">No data</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b">
                    <th className="text-left pb-2">Date</th>
                    <th className="text-right pb-2">Sales</th>
                    <th className="text-right pb-2">Cash</th>
                    <th className="text-right pb-2">Card</th>
                    <th className="text-right pb-2">Mobile</th>
                    <th className="text-right pb-2">Insurance</th>
                    <th className="text-right pb-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyBreakdown.map((day, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5">{day.date}</td>
                      <td className="py-1.5 text-right text-gray-500">{day.totalSales}</td>
                      <td className="py-1.5 text-right">{fmt(day.cashRevenue)}</td>
                      <td className="py-1.5 text-right">{fmt(day.cardRevenue)}</td>
                      <td className="py-1.5 text-right">{fmt(day.mobileMoneyRevenue)}</td>
                      <td className="py-1.5 text-right">{fmt(day.insuranceRevenue)}</td>
                      <td className="py-1.5 text-right font-semibold">{fmt(day.totalRevenue)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold text-sm border-t-2">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right">{data.totalSales}</td>
                    <td className="py-2 text-right">{fmt(data.cashRevenue)}</td>
                    <td className="py-2 text-right">{fmt(data.cardRevenue)}</td>
                    <td className="py-2 text-right">{fmt(data.mobileMoneyRevenue)}</td>
                    <td className="py-2 text-right">{fmt(data.insuranceRevenue)}</td>
                    <td className="py-2 text-right text-green-700">{fmt(data.totalRevenue)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {loading && !data && (
        <div className="text-center py-16 text-gray-400">Loading report…</div>
      )}
    </div>
  );
}
