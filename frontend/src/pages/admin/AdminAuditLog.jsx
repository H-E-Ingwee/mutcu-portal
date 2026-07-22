import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { formatDistanceToNow } from 'date-fns'

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: '', from: '', to: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 50, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) })
    api.get(`/admin/audit-log?${params}`).then(r => { setLogs(r.data.logs||[]); setTotal(r.data.total||0) }).finally(() => setLoading(false))
  }, [page, filters])

  const totalPages = Math.ceil(total / 50)

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Audit Log</h1><p className="page-subtitle">Immutable record of all system actions</p></div></div>
      <div className="card p-4 mb-5">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-48"><input type="text" className="form-input text-sm" placeholder="Search actions..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} /></div>
          <div><input type="date" className="form-input text-sm" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} /></div>
          <div><input type="date" className="form-input text-sm" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} /></div>
          {Object.values(filters).some(Boolean) && <button onClick={() => setFilters({search:'',from:'',to:''})} className="btn-outline btn-sm">Clear</button>}
        </div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Action</th><th>Actor</th><th>Time</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={3} className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange mx-auto" /></td></tr>
              : logs.length === 0 ? <tr><td colSpan={3} className="text-center py-8 text-gray-400">No log entries found.</td></tr>
              : logs.map((log, i) => (
                <tr key={i}>
                  <td><div className="font-semibold text-navy text-sm">{log.description || log.action?.replace(/\./g,' ')}</div></td>
                  <td className="text-sm text-gray-500">{log.actor?.name || 'System'}</td>
                  <td className="text-xs text-gray-400">{log.created_at ? formatDistanceToNow(new Date(log.created_at), {addSuffix:true}) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
            <div className="text-xs text-gray-400">Page {page} of {totalPages} · {total} entries</div>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-outline btn-sm">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="btn-outline btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
