import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import {
  Shield, Plus, Search, Filter, X, Check, AlertTriangle,
  ChevronRight, Clock, CheckCircle, XCircle, RefreshCw, FileText
} from 'lucide-react'

const SEVERITY = {
  minor:    { label: 'Minor',    color: 'badge-gray',   dot: 'bg-gray-400' },
  moderate: { label: 'Moderate', color: 'badge-orange',  dot: 'bg-orange' },
  serious:  { label: 'Serious',  color: 'badge-red',     dot: 'bg-red' },
  critical: { label: 'Critical', color: 'bg-red text-white', dot: 'bg-red' },
}

const STATUS = {
  open:         { label: 'Open',         color: 'badge-orange', icon: Clock },
  under_review: { label: 'Under Review', color: 'badge-navy',   icon: RefreshCw },
  resolved:     { label: 'Resolved',     color: 'badge-teal',   icon: CheckCircle },
  dismissed:    { label: 'Dismissed',    color: 'badge-gray',   icon: XCircle },
}

const OUTCOMES = [
  { value: 'warning',   label: 'Formal Warning' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'cleared',   label: 'Cleared — No Action' },
  { value: 'dismissed', label: 'Case Dismissed' },
]

export default function AdminDisciplinary() {
  const [cases, setCases] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)

  // New case modal
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ user_id: '', title: '', description: '', severity: 'minor' })
  const [members, setMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // Resolve modal
  const [showResolve, setShowResolve] = useState(false)
  const [resolveForm, setResolveForm] = useState({ outcome: '', outcome_notes: '' })

  useEffect(() => {
    fetchCases()
    api.get('/members?limit=200&status=active').then(r => setMembers(r.data.members || [])).catch(() => {})
  }, [filterStatus, filterSeverity])

  const fetchCases = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterSeverity) params.set('severity', filterSeverity)
      const { data } = await api.get('/disciplinary?' + params)
      setCases(data.cases || [])
      setTotal(data.total || 0)
    } catch { toast.error('Failed to load cases') }
    finally { setLoading(false) }
  }

  const openCase = async (c) => {
    try {
      const { data } = await api.get('/disciplinary/' + c.id)
      setSelected(data.case)
    } catch { toast.error('Failed to load case') }
  }

  const createCase = async () => {
    if (!newForm.user_id || !newForm.title || !newForm.description) {
      return toast.error('Member, title and description are required')
    }
    setSaving(true)
    try {
      const { data } = await api.post('/disciplinary', newForm)
      toast.success(data.message)
      setCases(prev => [data.case, ...prev])
      setShowNew(false)
      setNewForm({ user_id: '', title: '', description: '', severity: 'minor' })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const resolveCase = async () => {
    if (!resolveForm.outcome) return toast.error('Please select an outcome')
    setSaving(true)
    try {
      const { data } = await api.post('/disciplinary/' + selected.id + '/resolve', resolveForm)
      toast.success(data.message)
      setSelected(data.case)
      setCases(prev => prev.map(c => c.id === selected.id ? { ...c, status: 'resolved', outcome: resolveForm.outcome } : c))
      setShowResolve(false)
      setResolveForm({ outcome: '', outcome_notes: '' })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const syncFinalists = async () => {
    setSyncing(true)
    try {
      const { data } = await api.post('/disciplinary/sync-finalists')
      toast.success(data.summary)
    } catch (err) { toast.error(err.response?.data?.error || 'Sync failed') }
    finally { setSyncing(false) }
  }

  const filteredCases = cases.filter(c =>
    !search || c.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.case_number?.toLowerCase().includes(search.toLowerCase()) ||
    c.title?.toLowerCase().includes(search.toLowerCase())
  )

  const openCount = cases.filter(c => c.status === 'open' || c.status === 'under_review').length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Disciplinary Management</h1>
          <p className="page-subtitle">{openCount} open case{openCount !== 1 ? 's' : ''} · {total} total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={syncFinalists} disabled={syncing} className="btn-outline btn-sm" title="Auto-update finalist status from year of study">
            {syncing ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-navy" /> : <RefreshCw size={14} />}
            Sync Finalists
          </button>
          <button onClick={() => setShowNew(true)} className="btn-primary btn-sm">
            <Plus size={14} />Open Case
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* ── Case List ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Filters */}
          <div className="card p-3 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" className="form-input pl-9 text-sm" placeholder="Search cases..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <select className="form-select text-xs flex-1" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </select>
              <select className="form-select text-xs flex-1" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
                <option value="">All Severity</option>
                {Object.entries(SEVERITY).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Cases */}
          <div className="card overflow-hidden flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange" />
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <Shield size={32} className="mx-auto mb-2 text-gray-200" />
                No cases found.
              </div>
            ) : filteredCases.map(c => {
              const sev = SEVERITY[c.severity] || SEVERITY.minor
              const stat = STATUS[c.status] || STATUS.open
              const photoUrl = c.user?.photo_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user?.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`
              return (
                <div key={c.id} onClick={() => openCase(c)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-all ${selected?.id === c.id ? 'bg-orange/5 border-l-2 border-l-orange' : ''}`}>
                  <img src={photoUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-navy text-sm truncate">{c.user?.name}</span>
                      <span className={`badge ${sev.color} text-xs flex-shrink-0`}>{sev.label}</span>
                    </div>
                    <div className="text-xs text-gray-600 truncate font-semibold">{c.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge ${stat.color} text-xs`}>{stat.label}</span>
                      <span className="text-xs text-gray-400">{c.case_number}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Case Detail ── */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center">
                <FileText size={48} className="text-gray-200 mx-auto mb-3" />
                <div className="text-gray-400 text-sm">Select a case to view details</div>
              </div>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {/* Header */}
              <div className="card-header">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-montserrat font-bold text-navy text-sm">{selected.case_number}</span>
                    <span className={`badge ${SEVERITY[selected.severity]?.color}`}>{SEVERITY[selected.severity]?.label}</span>
                    <span className={`badge ${STATUS[selected.status]?.color}`}>{STATUS[selected.status]?.label}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Opened {selected.opened_at ? formatDistanceToNow(new Date(selected.opened_at), { addSuffix: true }) : '—'}
                    {selected.reporter?.name && ' · Reported by ' + selected.reporter.name}
                  </div>
                </div>
                {selected.status !== 'resolved' && selected.status !== 'dismissed' && (
                  <button onClick={() => setShowResolve(true)} className="btn-primary btn-sm">
                    <Check size={14} />Resolve Case
                  </button>
                )}
              </div>

              <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                {/* Member info */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <img
                    src={selected.user?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selected.user?.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`}
                    alt="" className="w-14 h-14 rounded-full object-cover border-2 border-orange" />
                  <div>
                    <div className="font-montserrat font-bold text-navy">{selected.user?.name}</div>
                    <div className="text-xs text-gray-400">{selected.user?.email}</div>
                    <div className="flex gap-2 mt-1">
                      {selected.user?.mutcu_number && <span className="badge badge-orange">{selected.user.mutcu_number}</span>}
                      {selected.user?.primary_ministry && <span className="badge badge-navy">{selected.user.primary_ministry}</span>}
                      {selected.user?.year_of_study && <span className="badge badge-teal">Year {selected.user.year_of_study}</span>}
                    </div>
                  </div>
                </div>

                {/* Case details */}
                <div>
                  <div className="font-montserrat font-bold text-navy text-sm mb-2">{selected.title}</div>
                  <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 whitespace-pre-wrap">
                    {selected.description}
                  </div>
                </div>

                {/* Outcome */}
                {selected.outcome && (
                  <div className={`p-4 rounded-xl border ${selected.outcome === 'cleared' || selected.outcome === 'dismissed' ? 'bg-green-50 border-green-200' : 'bg-orange/5 border-orange/20'}`}>
                    <div className="font-semibold text-sm mb-1">
                      Outcome: {OUTCOMES.find(o => o.value === selected.outcome)?.label || selected.outcome}
                    </div>
                    {selected.outcome_notes && (
                      <div className="text-xs text-gray-600 leading-relaxed">{selected.outcome_notes}</div>
                    )}
                    {selected.reviewer?.name && (
                      <div className="text-xs text-gray-400 mt-2">Reviewed by {selected.reviewer.name}</div>
                    )}
                    {selected.resolved_at && (
                      <div className="text-xs text-gray-400">
                        Resolved {formatDistanceToNow(new Date(selected.resolved_at), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── New Case Modal ── */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">Open Disciplinary Case</h3>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Member *</label>
                <div className="relative mb-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" className="form-input pl-9 text-sm" placeholder="Search member..."
                    value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
                </div>
                <select className="form-select" value={newForm.user_id} onChange={e => setNewForm(f => ({ ...f, user_id: e.target.value }))}>
                  <option value="">Select member...</option>
                  {members.filter(m => !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()))
                    .slice(0, 20).map(m => (
                      <option key={m.id} value={m.id}>{m.name} — {m.mutcu_number || m.email}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="form-label">Case Title *</label>
                <input type="text" className="form-input" placeholder="Brief description of the issue"
                  value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Severity</label>
                <select className="form-select" value={newForm.severity} onChange={e => setNewForm(f => ({ ...f, severity: e.target.value }))}>
                  {Object.entries(SEVERITY).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Description *</label>
                <textarea className="form-input" rows={4} placeholder="Detailed description of the case..."
                  value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={createCase} disabled={saving} className="btn-primary flex-1 justify-center">
                <Shield size={15} />{saving ? 'Opening...' : 'Open Case'}
              </button>
              <button onClick={() => setShowNew(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve Modal ── */}
      {showResolve && selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">Resolve Case</h3>
              <button onClick={() => setShowResolve(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="font-semibold text-navy">{selected.user?.name}</div>
              <div className="text-gray-500 text-xs">{selected.title}</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Outcome *</label>
                <div className="space-y-2">
                  {OUTCOMES.map(o => (
                    <label key={o.value} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${resolveForm.outcome === o.value ? 'border-orange bg-orange/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="outcome" value={o.value} className="accent-orange"
                        checked={resolveForm.outcome === o.value}
                        onChange={e => setResolveForm(f => ({ ...f, outcome: e.target.value }))} />
                      <span className="text-sm font-semibold text-navy">{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Notes <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                <textarea className="form-input" rows={3} placeholder="Additional notes on the resolution..."
                  value={resolveForm.outcome_notes} onChange={e => setResolveForm(f => ({ ...f, outcome_notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={resolveCase} disabled={saving} className="btn-primary flex-1 justify-center">
                <Check size={15} />{saving ? 'Resolving...' : 'Resolve Case'}
              </button>
              <button onClick={() => setShowResolve(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}