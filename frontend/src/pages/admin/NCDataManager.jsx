import { useEffect, useState, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  ClipboardList, Trash2, RefreshCw, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Users, FileText, Shield,
  MessageSquare, Award, BarChart3, History, Search, Filter, X
} from 'lucide-react'

const STATUS_COLOR = {
  setup: 'badge-gray', prayer_period: 'badge-navy', nominations_open: 'badge-green',
  vetting: 'badge-orange', nominees_published: 'badge-teal', objection_period: 'badge-red',
  pre_agm: 'badge-navy', commissioned: 'badge-navy', cancelled: 'badge-gray',
}
const STATUS_LABEL = {
  setup: 'Setup', prayer_period: 'Prayer Period', nominations_open: 'Nominations Open',
  vetting: 'NC Vetting', nominees_published: 'Nominees Published', objection_period: 'Objection Period',
  pre_agm: 'Pre-AGM', commissioned: 'Commissioned', cancelled: 'Cancelled',
}
const ACTION_CONFIG = {
  'nc.data_reset':         { label: 'Data Reset',        color: 'text-orange', bg: 'bg-orange/10', icon: RefreshCw },
  'nc.cycle_deleted':      { label: 'Cycle Deleted',     color: 'text-red',    bg: 'bg-red/10',    icon: Trash2 },
  'nc.data_deleted':       { label: 'Data Deleted',      color: 'text-red',    bg: 'bg-red/10',    icon: Trash2 },
  'nc.nominees_published': { label: 'Nominees Published',color: 'text-teal',   bg: 'bg-teal/10',   icon: Award },
  'nc.dissolved':          { label: 'NC Dissolved',      color: 'text-navy',   bg: 'bg-navy/10',   icon: Shield },
}

// ─── Confirmation Dialog ──────────────────────────────────────
function ConfirmDialog({ open, title, message, items, confirmLabel, confirmClass, onConfirm, onCancel, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="card p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-red/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={24} className="text-red" />
          </div>
          <div>
            <h3 className="font-montserrat font-bold text-navy text-lg">{title}</h3>
            <p className="text-gray-500 text-sm mt-1">{message}</p>
          </div>
        </div>
        {items?.length > 0 && (
          <div className="bg-red/5 border border-red/20 rounded-xl p-3 mb-4">
            <div className="text-xs font-semibold text-red uppercase tracking-wide mb-2">Will be permanently deleted:</div>
            <div className="space-y-1">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-red flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="bg-orange/5 border border-orange/20 rounded-xl p-3 mb-5 text-xs text-orange flex items-center gap-2">
          <AlertTriangle size={13} className="flex-shrink-0" />
          This action is <strong>irreversible</strong>. Data cannot be recovered after deletion.
        </div>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${confirmClass || 'bg-red text-white hover:bg-red/90'} disabled:opacity-50`}>
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Trash2 size={15} />}
            {loading ? 'Processing...' : confirmLabel}
          </button>
          <button onClick={onCancel} disabled={loading} className="btn-outline flex-1 justify-center">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Cycle Stats Grid ─────────────────────────────────────────
function CycleStats({ stats }) {
  const items = [
    { icon: Users,       label: 'NC Members',       value: stats.nc_members,       color: 'text-navy' },
    { icon: FileText,    label: 'Nominations',       value: stats.recommendations,  color: 'text-orange' },
    { icon: Shield,      label: 'Vetting Decisions', value: stats.vetting_decisions,color: 'text-purple-600' },
    { icon: Award,       label: 'Nominees',          value: stats.nominees,         color: 'text-teal' },
    { icon: MessageSquare,label: 'Objections',       value: stats.objections,       color: 'text-red' },
    { icon: BarChart3,   label: 'Suggestions',       value: stats.suggestions,      color: 'text-blue-500' },
  ]
  const total = items.reduce((s, i) => s + (i.value || 0), 0)
  return (
    <div className="mt-3">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-2 text-center">
            <item.icon size={14} className={`mx-auto mb-1 ${item.color}`} />
            <div className={`text-lg font-montserrat font-bold ${item.color}`}>{item.value ?? 0}</div>
            <div className="text-xs text-gray-400 leading-tight">{item.label}</div>
          </div>
        ))}
      </div>
      {total === 0 && (
        <div className="mt-2 flex items-center gap-2 text-sm text-teal">
          <CheckCircle size={14} /> No data — this cycle is empty
        </div>
      )}
    </div>
  )
}

// ─── Audit Log Viewer ─────────────────────────────────────────
function AuditLogViewer() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [actors, setActors] = useState([]) // unique admins who performed actions
  const [filters, setFilters] = useState({ from: '', to: '', actor_id: '' })

  const load = useCallback(async (pg = 1, f = filters) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: pg, limit: 20 })
      if (f.from) params.set('from', f.from)
      if (f.to) params.set('to', f.to)
      if (f.actor_id) params.set('actor_id', f.actor_id)
      const res = await api.get(`/admin/nc-audit-log?${params}`)
      setLogs(res.data.logs || [])
      setTotal(res.data.total || 0)
      // Extract unique actors for filter dropdown
      const uniqueActors = []
      const seen = new Set()
      ;(res.data.logs || []).forEach(l => {
        if (l.actor && !seen.has(l.actor.id)) {
          seen.add(l.actor.id)
          uniqueActors.push(l.actor)
        }
      })
      if (uniqueActors.length > 0) setActors(prev => {
        const merged = [...prev]
        uniqueActors.forEach(a => { if (!merged.find(m => m.id === a.id)) merged.push(a) })
        return merged
      })
    } catch { toast.error('Failed to load audit log') }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load(1) }, [])

  const applyFilters = () => { setPage(1); load(1, filters) }
  const clearFilters = () => {
    const empty = { from: '', to: '', actor_id: '' }
    setFilters(empty); setPage(1); load(1, empty)
  }

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : '—'

  // Parse deleted counts from description
  const parseDeletedCounts = (desc) => {
    const match = desc?.match(/Deleted:\s*(\d+)\s*records/)
    return match ? parseInt(match[1]) : null
  }

  return (
    <div className="card mt-6">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <History size={16} className="text-navy" />
          <h2 className="font-montserrat font-bold text-navy text-sm">NC Action Audit Log</h2>
          <span className="text-xs text-gray-400">{total} entries</span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-gray-400 font-semibold block mb-1">From Date</label>
          <input type="date" className="form-input text-sm py-1.5"
            value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-gray-400 font-semibold block mb-1">To Date</label>
          <input type="date" className="form-input text-sm py-1.5"
            value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-gray-400 font-semibold block mb-1">Admin User</label>
          <select className="form-select text-sm py-1.5" value={filters.actor_id}
            onChange={e => setFilters(f => ({ ...f, actor_id: e.target.value }))}>
            <option value="">All Admins</option>
            {actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button onClick={applyFilters} className="btn-primary btn-sm"><Filter size={13} /> Apply</button>
        {(filters.from || filters.to || filters.actor_id) && (
          <button onClick={clearFilters} className="btn-outline btn-sm"><X size={13} /> Clear</button>
        )}
      </div>

      {/* Log Entries */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <History size={32} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm">No NC actions recorded yet.</p>
          <p className="text-xs mt-1">Reset and delete actions will appear here.</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {logs.map(log => {
              const cfg = ACTION_CONFIG[log.action] || { label: log.action, color: 'text-gray-500', bg: 'bg-gray-100', icon: History }
              const deletedCount = parseDeletedCounts(log.description)
              return (
                <div key={log.id} className="px-4 py-4 hover:bg-gray-50 transition-all">
                  <div className="flex items-start gap-3">
                    {/* Action Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <cfg.icon size={15} className={cfg.color} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Action + Badge */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {deletedCount !== null && (
                          <span className="text-xs text-gray-400">
                            {deletedCount} records cascade-deleted
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-700 leading-relaxed">{log.description}</p>

                      {/* Meta */}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-navy rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {log.actor?.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-navy">{log.actor?.name || 'Unknown'}</span>
                          <span className="text-xs text-gray-400">({log.actor?.role?.replace(/_/g, ' ') || '—'})</span>
                        </div>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => { const p = page - 1; setPage(p); load(p) }}
                  className="btn-outline btn-sm">← Prev</button>
                <button disabled={page * 20 >= total} onClick={() => { const p = page + 1; setPage(p); load(p) }}
                  className="btn-outline btn-sm">Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function NCDataManager() {
  const [cycles, setCycles] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [loadingStats, setLoadingStats] = useState({})
  const [confirm, setConfirm] = useState(null)
  const [acting, setActing] = useState(false)
  const [activeTab, setActiveTab] = useState('cycles') // 'cycles' | 'audit'

  useEffect(() => {
    api.get('/admin/cycles')
      .then(r => setCycles(r.data.cycles || []))
      .catch(() => toast.error('Failed to load cycles'))
      .finally(() => setLoading(false))
  }, [])

  const loadStats = async (cycleId) => {
    if (stats[cycleId] !== undefined) return
    setLoadingStats(prev => ({ ...prev, [cycleId]: true }))
    try {
      const res = await api.get(`/admin/cycles/${cycleId}/stats`)
      setStats(prev => ({ ...prev, [cycleId]: res.data.stats }))
    } catch (err) {
      setStats(prev => ({ ...prev, [cycleId]: { error: true, message: err.response?.data?.error || err.message } }))
    } finally {
      setLoadingStats(prev => ({ ...prev, [cycleId]: false }))
    }
  }

  const toggleExpand = (id) => {
    const next = !expanded[id]
    setExpanded(prev => ({ ...prev, [id]: next }))
    if (next) loadStats(id)
  }

  const totalDataCount = (s) => {
    if (!s || s.error) return 0
    return (s.nc_members || 0) + (s.recommendations || 0) + (s.vetting_decisions || 0) +
           (s.nominees || 0) + (s.objections || 0) + (s.suggestions || 0)
  }

  const handleConfirm = async () => {
    if (!confirm) return
    setActing(true)
    try {
      if (confirm.type === 'reset') {
        const res = await api.delete(`/nc/cycle/${confirm.cycle.id}/all-data`)
        toast.success(res.data.message || 'Cycle data cleared')
        // Invalidate stats so they reload
        setStats(prev => ({ ...prev, [confirm.cycle.id]: undefined }))
      } else if (confirm.type === 'delete') {
        const res = await api.delete(`/nc/cycle/${confirm.cycle.id}`)
        setCycles(prev => prev.filter(c => c.id !== confirm.cycle.id))
        toast.success(res.data.message || `Cycle deleted`)
      }
      setConfirm(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed. Check console for details.')
      console.error('[NC DELETE ERROR]', err.response?.data)
    } finally { setActing(false) }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">NC Data Manager</h1>
          <p className="page-subtitle">View, reset, and delete nomination cycle data</p>
        </div>
        <span className="badge badge-gray">{cycles.length} cycles</span>
      </div>

      {/* Warning Banner */}
      <div className="card p-4 mb-5 bg-red/5 border border-red/20">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-red flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red">
            <strong>Super Admin Only.</strong> Use <strong>Reset Cycle</strong> to clear data while keeping the cycle shell,
            or <strong>Delete Cycle</strong> to remove everything permanently. All actions are logged in the audit trail below.
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {[{ id: 'cycles', label: 'Nomination Cycles', icon: ClipboardList }, { id: 'audit', label: 'Audit Log', icon: History }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* Cycles Tab */}
      {activeTab === 'cycles' && (
        <>
          {cycles.length === 0 ? (
            <div className="card p-12 text-center">
              <ClipboardList size={40} className="text-gray-200 mx-auto mb-3" />
              <h3 className="font-montserrat font-bold text-navy mb-1">No Nomination Cycles</h3>
              <p className="text-gray-400 text-sm">No nomination cycles have been created yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cycles.map(c => {
                const isExpanded = expanded[c.id]
                const cycleStats = stats[c.id]
                const isLoadingStats = loadingStats[c.id]
                const dataCount = cycleStats && !cycleStats.error ? totalDataCount(cycleStats) : null

                return (
                  <div key={c.id} className="card overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-montserrat font-bold text-navy">{c.title}</h3>
                            <span className={`badge ${STATUS_COLOR[c.status] || 'badge-gray'}`}>
                              {STATUS_LABEL[c.status] || c.status}
                            </span>
                            {dataCount !== null && (
                              <span className={`text-xs font-semibold ${dataCount > 0 ? 'text-orange' : 'text-teal'}`}>
                                {dataCount > 0 ? `${dataCount} records` : 'Empty'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {c.spiritual_year} · {c.cycle_type} · Created {formatDate(c.created_at)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                          <button onClick={() => toggleExpand(c.id)} className="btn-outline btn-sm">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {isExpanded ? 'Hide' : 'View Data'}
                          </button>
                          <button onClick={() => setConfirm({ type: 'reset', cycle: c })}
                            className="btn-outline btn-sm text-orange border-orange/30 hover:bg-orange/5">
                            <RefreshCw size={13} /> Reset
                          </button>
                          <button onClick={() => setConfirm({ type: 'delete', cycle: c })}
                            className="btn-outline btn-sm text-red border-red/30 hover:bg-red/5">
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>

                      {/* Expanded Stats */}
                      {isExpanded && (
                        isLoadingStats ? (
                          <div className="flex items-center gap-2 text-sm text-gray-400 py-3 mt-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange" />
                            Loading data counts...
                          </div>
                        ) : cycleStats?.error ? (
                          <div className="mt-3 text-sm text-red bg-red/5 rounded-xl px-3 py-2">
                            ⚠️ {cycleStats.message || 'Failed to load stats'}
                          </div>
                        ) : cycleStats ? (
                          <CycleStats stats={cycleStats} />
                        ) : null
                      )}
                    </div>

                    {/* Dates Bar */}
                    <div className="border-t border-gray-50 px-5 py-2 bg-gray-50 flex flex-wrap gap-4 text-xs text-gray-400">
                      {c.nomination_open_date && <span>Nominations: {formatDate(c.nomination_open_date)} → {formatDate(c.nomination_close_date)}</span>}
                      {c.publication_date && <span>Publish: {formatDate(c.publication_date)}</span>}
                      {c.objection_deadline && <span>Objections: {formatDate(c.objection_deadline)}</span>}
                      {c.agm_date && <span>AGM: {formatDate(c.agm_date)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && <AuditLogViewer />}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === 'reset' ? 'Reset Cycle Data' : 'Delete Entire Cycle'}
        message={confirm?.type === 'reset'
          ? `Clear all nomination data for "${confirm?.cycle?.title}" but keep the cycle shell. You can reuse the cycle after resetting.`
          : `Permanently delete the cycle "${confirm?.cycle?.title}" and ALL associated data. This cannot be undone.`}
        items={confirm?.type === 'reset' ? [
          'All member nominations/recommendations',
          'All NC vetting decisions',
          'All published nominees',
          'All objections submitted',
          'All NC member appointments',
          'All free-text suggestions',
          'All by-nominations',
        ] : [
          'The nomination cycle itself',
          'All member nominations/recommendations',
          'All NC vetting decisions',
          'All published nominees',
          'All objections submitted',
          'All NC member appointments',
          'All free-text suggestions',
          'All by-nominations',
        ]}
        confirmLabel={confirm?.type === 'reset' ? 'Reset — Clear All Data' : 'Delete Everything'}
        confirmClass={confirm?.type === 'reset'
          ? 'bg-orange text-white hover:bg-orange/90'
          : 'bg-red text-white hover:bg-red/90'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
        loading={acting}
      />
    </div>
  )
}