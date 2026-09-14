import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Plus, CheckCircle, Lock, AlertTriangle, Calendar, X, Save } from 'lucide-react'

export default function YearManager() {
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState({})
  const [form, setForm] = useState({ label: '', start_date: '', end_date: '', notes: '' })

  const load = async () => {
    try {
      const res = await api.get('/treasury/years')
      setYears(res.data.years || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Auto-fill dates when label is typed (e.g. "2027/2028" → Sep 1 2027 to Aug 31 2028)
  const handleLabelChange = (val) => {
    setForm(p => ({ ...p, label: val }))
    const match = val.match(/^(\d{4})\/(\d{4})$/)
    if (match) {
      const startYear = match[1]
      const endYear = match[2]
      setForm(p => ({
        ...p,
        label: val,
        start_date: `${startYear}-09-01`,
        end_date: `${endYear}-08-31`,
      }))
    }
  }

  const create = async () => {
    if (!form.label || !form.start_date || !form.end_date) return toast.error('Label, start date, and end date are required')
    setSaving(true)
    try {
      const res = await api.post('/treasury/years', form)
      toast.success(res.data.message)
      setShowForm(false)
      setForm({ label: '', start_date: '', end_date: '', notes: '' })
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create year') }
    finally { setSaving(false) }
  }

  const activate = async (id, label) => {
    if (!window.confirm(`Set "${label}" as the active financial year? All new transactions will be tagged to this year.`)) return
    setActing(p => ({ ...p, [id]: 'activating' }))
    try {
      const res = await api.put(`/treasury/years/${id}/activate`)
      toast.success(res.data.message)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to activate') }
    finally { setActing(p => ({ ...p, [id]: null })) }
  }

  const close = async (id, label) => {
    if (!window.confirm(`Close and lock "${label}" for audit? This action is IRREVERSIBLE — no further edits will be allowed for this year.`)) return
    setActing(p => ({ ...p, [id]: 'closing' }))
    try {
      const res = await api.put(`/treasury/years/${id}/close`)
      toast.success(res.data.message)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to close year') }
    finally { setActing(p => ({ ...p, [id]: null })) }
  }

  const deleteYear = async (id, label) => {
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return
    try {
      await api.delete(`/treasury/years/${id}`)
      toast.success(`${label} deleted`)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete') }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Year Manager</h1>
          <p className="page-subtitle">MUTCU financial year runs 1 September → 31 August</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
          <Plus size={14} /> New Financial Year
        </button>
      </div>

      {/* Info Banner */}
      <div className="card p-4 mb-5 bg-navy/5 border border-navy/10">
        <div className="flex items-start gap-3 text-sm text-navy">
          <Calendar size={16} className="flex-shrink-0 mt-0.5 text-orange" />
          <div>
            <strong>How Financial Years Work:</strong>
            <ul className="mt-1 space-y-1 text-gray-600 text-xs">
              <li>• <strong>Active year</strong> — all new income, budgets, and requisitions are tagged to this year automatically</li>
              <li>• <strong>Closed year</strong> — locked after AGM audit; no further edits allowed (permanent record)</li>
              <li>• MUTCU audit period: <strong>1 September → 31 August</strong></li>
              <li>• Only one year can be active at a time</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card p-5 mb-5 border-l-4 border-orange">
          <h3 className="font-montserrat font-bold text-navy mb-4">Create New Financial Year</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="form-label">Year Label <span className="text-orange">*</span></label>
              <input className="form-input" placeholder="e.g. 2027/2028"
                value={form.label} onChange={e => handleLabelChange(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Format: YYYY/YYYY — dates auto-fill when you type this</p>
            </div>
            <div>
              <label className="form-label">Notes (Optional)</label>
              <input className="form-input" placeholder="e.g. Post-AGM year"
                value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Start Date <span className="text-orange">*</span></label>
              <input type="date" className="form-input" value={form.start_date}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">End Date <span className="text-orange">*</span></label>
              <input type="date" className="form-input" value={form.end_date}
                onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={create} disabled={saving} className="btn-primary">
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Save size={14} /> Create Year</>}
            </button>
            <button onClick={() => { setShowForm(false); setForm({ label: '', start_date: '', end_date: '', notes: '' }) }}
              className="btn-outline px-4"><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      {/* Years List */}
      {years.length === 0 ? (
        <div className="card p-10 text-center">
          <Calendar size={40} className="text-gray-200 mx-auto mb-3" />
          <h3 className="font-montserrat font-bold text-navy mb-1">No Financial Years Yet</h3>
          <p className="text-gray-400 text-sm mb-4">Create your first financial year to start tracking budgets and income.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mx-auto"><Plus size={14} /> Create First Year</button>
        </div>
      ) : (
        <div className="space-y-3">
          {years.map(yr => (
            <div key={yr.id} className={`card p-5 ${yr.is_active ? 'border-l-4 border-orange' : yr.is_closed ? 'border-l-4 border-gray-300 opacity-75' : 'border-l-4 border-transparent'}`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-montserrat font-bold text-navy text-lg">{yr.label}</h3>
                      {yr.is_active && (
                        <span className="badge badge-orange flex items-center gap-1">
                          <CheckCircle size={10} /> Active
                        </span>
                      )}
                      {yr.is_closed && (
                        <span className="badge badge-gray flex items-center gap-1">
                          <Lock size={10} /> Closed
                        </span>
                      )}
                      {!yr.is_active && !yr.is_closed && (
                        <span className="badge badge-navy">Inactive</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDate(yr.start_date)} → {formatDate(yr.end_date)}
                      {yr.notes && <span className="ml-2 text-gray-300">· {yr.notes}</span>}
                    </div>
                    {yr.is_closed && yr.closed_at && (
                      <div className="text-xs text-gray-300 mt-0.5">
                        Closed on {formatDate(yr.closed_at)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Activate button — only for non-active, non-closed years */}
                  {!yr.is_active && !yr.is_closed && (
                    <button onClick={() => activate(yr.id, yr.label)}
                      disabled={acting[yr.id] === 'activating'}
                      className="btn-outline btn-sm">
                      {acting[yr.id] === 'activating'
                        ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-navy" />
                        : <><CheckCircle size={13} /> Set Active</>}
                    </button>
                  )}

                  {/* Close button — only for inactive, non-closed years */}
                  {!yr.is_active && !yr.is_closed && (
                    <button onClick={() => close(yr.id, yr.label)}
                      disabled={acting[yr.id] === 'closing'}
                      className="btn-outline btn-sm text-orange border-orange/30 hover:bg-orange/5">
                      {acting[yr.id] === 'closing'
                        ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange" />
                        : <><Lock size={13} /> Close for Audit</>}
                    </button>
                  )}

                  {/* Delete — only for inactive, non-closed, no data */}
                  {!yr.is_active && !yr.is_closed && (
                    <button onClick={() => deleteYear(yr.id, yr.label)}
                      className="btn-outline btn-sm text-red border-red/30 hover:bg-red/5">
                      <X size={13} />
                    </button>
                  )}

                  {/* Closed year — show lock icon only */}
                  {yr.is_closed && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Lock size={12} /> Locked for audit
                    </div>
                  )}
                </div>
              </div>

              {/* Active year warning */}
              {yr.is_active && (
                <div className="mt-3 bg-orange/5 border border-orange/20 rounded-lg px-3 py-2 text-xs text-orange flex items-center gap-2">
                  <AlertTriangle size={12} />
                  All new income entries, budgets, and requisitions are being tagged to this year.
                  To switch years, create a new year and set it as active.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}