import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  ClipboardList, Trash2, RefreshCw, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Users, FileText, Shield,
  MessageSquare, Award, BarChart3, X, Eye
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
        {items && items.length > 0 && (
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

// ─── Cycle Data Stats ─────────────────────────────────────────
function CycleStats({ stats }) {
  const items = [
    { icon: Users, label: 'NC Members', value: stats.nc_members, color: 'text-navy' },
    { icon: FileText, label: 'Nominations', value: stats.recommendations, color: 'text-orange' },
    { icon: Shield, label: 'Vetting Decisions', value: stats.vetting_decisions, color: 'text-purple-600' },
    { icon: Award, label: 'Nominees', value: stats.nominees, color: 'text-teal' },
    { icon: MessageSquare, label: 'Objections', value: stats.objections, color: 'text-red' },
    { icon: BarChart3, label: 'Suggestions', value: stats.suggestions, color: 'text-blue-500' },
  ]
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
      {items.map((item, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-2 text-center">
          <item.icon size={14} className={`mx-auto mb-1 ${item.color}`} />
          <div className={`text-lg font-montserrat font-bold ${item.color}`}>{item.value ?? '—'}</div>
          <div className="text-xs text-gray-400 leading-tight">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function NCDataManager() {
  const [cycles, setCycles] = useState([])
  const [stats, setStats] = useState({}) // { cycleId: { nc_members, recommendations, ... } }
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [loadingStats, setLoadingStats] = useState({})
  const [confirm, setConfirm] = useState(null) // { type, cycle }
  const [acting, setActing] = useState(false)

  useEffect(() => {
    api.get('/admin/cycles').then(r => {
      setCycles(r.data.cycles || [])
    }).catch(() => toast.error('Failed to load cycles'))
    .finally(() => setLoading(false))
  }, [])

  const loadStats = async (cycleId) => {
    if (stats[cycleId]) return // already loaded
    setLoadingStats(prev => ({ ...prev, [cycleId]: true }))
    try {
      const res = await api.get(`/admin/cycles/${cycleId}/stats`)
      setStats(prev => ({ ...prev, [cycleId]: res.data.stats }))
    } catch {
      setStats(prev => ({ ...prev, [cycleId]: { error: true } }))
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
        await api.delete(`/nc/cycle/${confirm.cycle.id}/all-data`)
        toast.success(`Cycle data cleared — "${confirm.cycle.title}" shell preserved`)
        // Reset stats for this cycle
        setStats(prev => ({ ...prev, [confirm.cycle.id]: undefined }))
        // Reload stats
        setTimeout(() => loadStats(confirm.cycle.id), 500)
      } else if (confirm.type === 'delete') {
        await api.delete(`/nc/cycle/${confirm.cycle.id}`)
        setCycles(prev => prev.filter(c => c.id !== confirm.cycle.id))
        toast.success(`Cycle "${confirm.cycle.title}" permanently deleted`)
      }
      setConfirm(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed')
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
        <div className="flex items-center gap-2">
          <span className="badge badge-gray">{cycles.length} cycles</span>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="card p-4 mb-5 bg-red/5 border border-red/20">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-red flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red">
            <strong>Super Admin Only.</strong> This module allows permanent deletion of nomination data.
            Use <strong>Reset Cycle</strong> to clear data while keeping the cycle shell, or <strong>Delete Cycle</strong> to remove everything.
            All deletions are irreversible and logged in the audit trail.
          </div>
        </div>
      </div>

      {/* Cycles List */}
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
            const hasData = cycleStats && !cycleStats.error && totalDataCount(cycleStats) > 0
            const isLoading = loadingStats[c.id]

            return (
              <div key={c.id} className="card overflow-hidden">
                {/* Cycle Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-montserrat font-bold text-navy">{c.title}</h3>
                        <span className={`badge ${STATUS_COLOR[c.status] || 'badge-gray'}`}>
                          {STATUS_LABEL[c.status] || c.status}
                        </span>
                        {cycleStats && !cycleStats.error && (
                          <span className="text-xs text-gray-400">
                            {totalDataCount(cycleStats)} records
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {c.spiritual_year} · {c.cycle_type} ·
                        Created {formatDate(c.created_at)}
                        {c.agm_date && ` · AGM: ${formatDate(c.agm_date)}`}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                      {/* View/Expand */}
                      <button onClick={() => toggleExpand(c.id)}
                        className="btn-outline btn-sm">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? 'Hide' : 'View Data'}
                      </button>

                      {/* Reset Cycle — clears data, keeps shell */}
                      <button
                        onClick={() => setConfirm({ type: 'reset', cycle: c })}
                        className="btn-outline btn-sm text-orange border-orange/30 hover:bg-orange/5">
                        <RefreshCw size={13} /> Reset Cycle
                      </button>

                      {/* Delete Cycle — removes everything */}
                      <button
                        onClick={() => setConfirm({ type: 'delete', cycle: c })}
                        className="btn-outline btn-sm text-red border-red/30 hover:bg-red/5">
                        <Trash2 size={13} /> Delete Cycle
                      </button>
                    </div>
                  </div>

                  {/* Expanded Stats */}
                  {isExpanded && (
                    <div className="mt-3">
                      {isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange" />
                          Loading data counts...
                        </div>
                      ) : cycleStats?.error ? (
                        <div className="text-sm text-red bg-red/5 rounded-xl px-3 py-2">
                          Failed to load stats for this cycle.
                        </div>
                      ) : cycleStats ? (
                        <>
                          <CycleStats stats={cycleStats} />
                          {totalDataCount(cycleStats) === 0 && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-teal">
                              <CheckCircle size={14} /> No data — this cycle is empty
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Key Dates Bar */}
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

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === 'reset' ? `Reset Cycle Data` : `Delete Entire Cycle`}
        message={confirm?.type === 'reset'
          ? `This will clear all nomination data for "${confirm?.cycle?.title}" but keep the cycle shell. You can reuse the cycle after resetting.`
          : `This will permanently delete the cycle "${confirm?.cycle?.title}" and ALL associated data. This cannot be undone.`}
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