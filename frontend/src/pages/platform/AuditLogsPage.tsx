import { useEffect, useState } from 'react';
import client from '../../api/client';

interface AuditLog {
  auditLogId: number;
  userEmail: string;
  action: string;
  entityType: string;
  details: string | null;
  ipAddress: string | null;
  timestamp: string;
}

interface PagedResult {
  items: AuditLog[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');

  const PAGE_SIZE = 50;

  async function load(p: number, action: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
      if (action) params.set('action', action);
      const res = await client.get<PagedResult>(`/audit-logs?${params}`);
      setLogs(res.data.items);
      setTotal(res.data.totalCount);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(page, applied); }, [page, applied]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setApplied(search.trim());
  }

  function handleClear() {
    setSearch(''); setApplied(''); setPage(1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform activity log — newest first.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by action (e.g. Patient.View)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
        <button type="submit"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg">
          Filter
        </button>
        {applied && (
          <button type="button" onClick={handleClear}
            className="px-4 py-2 border border-gray-300 text-sm text-gray-600 rounded-lg hover:bg-gray-50">
            Clear
          </button>
        )}
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> :
          logs.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No logs found.</div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  {['Timestamp', 'User', 'Action', 'Entity', 'Details', 'IP'].map(h => (
                    <th key={h} className="px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <tr key={log.auditLogId} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 text-xs">{log.userEmail}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{log.entityType}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">{log.details ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{log.ipAddress ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{total} total entries</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Previous
            </button>
            <span className="px-3 py-1.5">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
