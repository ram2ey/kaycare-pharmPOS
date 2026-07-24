import { useEffect, useState } from 'react';
import client from '../../api/client';
import { getDrugs } from '../../api/drugs';
import type { DailySalesSummaryResponse, DrugResponse } from '../../types';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardPage() {
  const [summary, setSummary]   = useState<DailySalesSummaryResponse | null>(null);
  const [lowStock, setLowStock] = useState<DrugResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showEodModal, setShowEodModal] = useState(false);

  useEffect(() => {
    Promise.all([
      client.get('/pharmacy/sales/today-summary').then(r => r.data as DailySalesSummaryResponse),
      getDrugs({ lowStock: true }),
    ])
      .then(([s, l]) => { setSummary(s); setLowStock(l); })
      .finally(() => setLoading(false));
  }, []);

  function handlePrintEod() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 space-x-3">
        <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
        <span className="text-sm font-medium">Loading analytics dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 font-heading tracking-tight">
            Pharmacy Analytics & Operational Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time daily metrics, tender breakdown, and low stock warnings.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEodModal(true)}
            className="btn-emerald text-xs"
          >
            Print EOD Report
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Today's Gross Sales", value: summary ? `$${fmt(summary.totalRevenue)}` : '$0.00', label: 'Real-time revenue' },
          { title: 'Dispensed Transactions', value: summary ? summary.totalSales : 0, label: 'Completed sales' },
          { title: 'Cash Revenue', value: summary ? `$${fmt(summary.cashRevenue)}` : '$0.00', label: 'Cash tenders' },
          { title: 'Low Stock Warnings', value: lowStock.length, label: 'Items below threshold' },
        ].map((kpi, idx) => (
          <div key={idx} className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{kpi.title}</span>
            <span className="text-2xl font-bold font-mono text-slate-100 block">{kpi.value}</span>
            <span className="text-[11px] text-slate-500 block">{kpi.label}</span>
          </div>
        ))}
      </div>

      {/* Payment Channels Grid */}
      {summary && summary.totalSales > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Revenue by Tender Channel
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Cash Tenders',      value: summary.cashRevenue,        color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
              { label: 'Card Payments',     value: summary.cardRevenue,        color: 'border-sky-500/30 bg-sky-500/10 text-sky-400' },
              { label: 'Mobile Money',      value: summary.mobileMoneyRevenue, color: 'border-purple-500/30 bg-purple-500/10 text-purple-400' },
              { label: 'Insurance Claims',  value: summary.insuranceRevenue,   color: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
            ].map((p) => (
              <div key={p.label} className={`p-4 rounded-xl border ${p.color} flex flex-col justify-between`}>
                <span className="text-xs font-medium opacity-80 block">{p.label}</span>
                <span className="text-2xl font-bold font-mono-price mt-3">${fmt(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Top Sellers & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast Moving Medications */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Fast Moving Medications Today
          </h3>

          {!summary || summary.topDrugs.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No sales recorded yet today.</p>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {summary.topDrugs.map((d: { drugName: string; totalQuantity: number; totalRevenue: number }, i: number) => (
                <div key={i} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-200">{d.drugName}</h5>
                    <p className="text-slate-400 text-[11px] mt-0.5">{d.totalQuantity} units dispensed</p>
                  </div>
                  <span className="font-mono-price font-bold text-emerald-400 text-sm">
                    ${fmt(d.totalRevenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span>Low Stock Deficit Alerts</span>
              {lowStock.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30">
                  {lowStock.length}
                </span>
              )}
            </h3>
          </div>

          {lowStock.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">All stock levels are optimal.</p>
          ) : (
            <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto">
              {lowStock.map((d) => (
                <div key={d.drugInventoryId} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-200">{d.name}</h5>
                    <p className="text-slate-400 text-[11px] mt-0.5">Threshold: {d.reorderThreshold} {d.unit}</p>
                  </div>
                  <span className="font-mono font-bold text-rose-400 text-sm">
                    {d.currentStock} {d.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Printable EOD Modal */}
      {showEodModal && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-modal w-full max-w-lg rounded-2xl border border-slate-700/80 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">End Of Day (EOD) Summary Report</h3>
              <button onClick={() => setShowEodModal(false)} className="text-slate-400 hover:text-slate-100 text-xs">Close</button>
            </div>

            <div className="space-y-3 bg-white text-slate-900 p-4 rounded-xl text-xs font-mono">
              <div className="text-center border-b pb-2">
                <h4 className="font-bold text-base uppercase">KayCare Pharmacy</h4>
                <p className="text-[10px] text-slate-600">Daily Register Reconciliation Report</p>
                <p className="text-[10px] text-slate-500">{new Date().toLocaleDateString()}</p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between"><span>Total Transactions:</span><strong>{summary.totalSales}</strong></div>
                <div className="flex justify-between text-emerald-700"><span>Gross Revenue:</span><strong>${fmt(summary.totalRevenue)}</strong></div>
                <div className="flex justify-between"><span>Cash Collected:</span><span>${fmt(summary.cashRevenue)}</span></div>
                <div className="flex justify-between"><span>Card Payments:</span><span>${fmt(summary.cardRevenue)}</span></div>
                <div className="flex justify-between"><span>Mobile Money:</span><span>${fmt(summary.mobileMoneyRevenue)}</span></div>
                <div className="flex justify-between"><span>Insurance Claims:</span><span>${fmt(summary.insuranceRevenue)}</span></div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={handlePrintEod} className="btn-emerald text-xs">Print Report</button>
              <button onClick={() => setShowEodModal(false)} className="btn-glass text-xs">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
