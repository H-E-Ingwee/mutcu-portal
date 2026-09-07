import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  Send, MessageSquare, AlertTriangle, ChevronRight, Users,
  Shield, Plus, X, Check, Trash2, Eye, Clock
} from 'lucide-react'

export default function NCDashboard() {
  const { user, isNCAction } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [dissolving, setDissolving] = useState(false)
  const [showByNom, setShowByNom] = useState(false)
  const [byNomForm, setByNomForm] = useState({ position_id: '', reason: 'vacancy', vacated_by: '' })
  const [saving, setSaving] = useState(false)

  const canAct = isNCAction ? isNCAction() : false

  useEffect(() => {
    api.get('/nc/dashboard').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  const publish = async () => {
    if (!canAct) return toast.error('Only NC Chairperson or Secretary can publish nominees')
    if (!window.confirm('Publish all approved nominees to members? This cannot be undone.')) return
    setPublishing(true)
    try {
      await api.post('/nc/publish', { cycle_id: data.cycle.id })
      toast.success('Nominees published successfully!')
      setData(prev => ({ ...prev, cycle: { ...prev.cycle, status: 'nominees_published' } }))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to publish') }
    finally { setPublishing(false) }
  }

  const dissolveNC = async () => {
    if (!window.confirm('Dissolve the Nomination College? All NC members will be returned to full member status.')) return
    setDissolving(true)
    try {
      await api.post(`/nc/dissolve/${data.cycle.id}`)
      toast.success('Nomination College dissolved successfully')
      setData(prev => ({ ...prev, cycle: { ...prev.cycle, nc_dissolution_date: new Date().toISOString() } }))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setDissolving(false) }
  }

  const openByNomination = async () => {
    if (!canAct) return toast.error('Only NC Chairperson can open a By-Nomination')
    if (!byNomForm.position_id) return toast.error('Please select a position')
    setSaving(true)
    try {
      await api.post('/nc/by-nominations', { ...byNomForm, cycle_id: data.cycle.id })
      toast.success('By-Nomination process opened')
      setShowByNom(false)
      setByNomForm({ position_id: '', reason: 'vacancy', vacated_by: '' })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const deleteNominationData = async () => {
    if (!window.confirm('Delete all nomination data for this cycle? This cannot be undone.')) return
    try {
      await api.delete(`/nominations/data/${data.cycle.id}`)
      toast.success('Nomination data deleted')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>
  if (!data?.cycle) return (
    <div className="max-w-lg mx-auto mt-12 text-center">
      <div className="card p-8"><h2 className="font-montserrat font-bold text-navy text-lg mb-2">No Active Cycle</h2><p className="text-gray-500 text-sm">The EC Admin will create a nomination cycle when ready.</p></div>
    </div>
  )

  const { cycle, positions, suggestionCount, objectionCount, publishedCount, ncMembers, byNominations, userCanAct } = data

  const cycleStatusLabel = { nominations_open: 'Nominations Open', vetting: 'NC Vetting', nominees_published: 'Nominees Published', objection_period: 'Objection Period', pre_agm: 'Pre-AGM', commissioned: 'Commissioned' }
  const statusColor = { nominations_open: 'bg-green-100 text-green-700', vetting: 'bg-orange/10 text-orange', nominees_published: 'bg-teal/10 text-teal' }

  // Role badge
  const myNCRole = ncMembers?.find(m => m.user_id === user?.id)?.nc_role
  const roleLabel = myNCRole === 'chairperson' ? '🏛️ NC Chairperson' : myNCRole === 'secretary' ? '📋 NC Secretary' : '👁️ NC Member (View Only)'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">NC Dashboard</h1>
          <p className="page-subtitle">
            {cycle.title} — <span className={`badge ${statusColor[cycle.status] || 'badge-gray'}`}>{cycleStatusLabel[cycle.status] || cycle.status}</span>
            {myNCRole && <span className="ml-2 text-xs text-gray-400">{roleLabel}</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/nc/suggestions" className="btn-outline btn-sm relative">
            <MessageSquare size={14} />Suggestions
            {suggestionCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-orange text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{suggestionCount}</span>}
          </Link>
          <Link to="/nc/objections" className="btn-outline btn-sm relative">
            <AlertTriangle size={14} />Objections
            {objectionCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{objectionCount}</span>}
          </Link>
          {canAct && cycle.status === 'vetting' && (
            <button onClick={publish} disabled={publishing} className="btn-primary btn-sm">
              <Send size={14} />{publishing ? 'Publishing...' : 'Publish Nominees'}
            </button>
          )}
          {canAct && cycle.status === 'commissioned' && !cycle.nc_dissolution_date && (
            <button onClick={dissolveNC} disabled={dissolving} className="btn-outline btn-sm text-red border-red/30 hover:bg-red/5">
              <Shield size={14} />{dissolving ? 'Dissolving...' : 'Dissolve NC (21 days post-AGM)'}
            </button>
          )}
          {['super_admin', 'ec_admin', 'nc_chair'].includes(user?.role) && ['commissioned', 'cancelled'].includes(cycle.status) && (
            <button onClick={deleteNominationData} className="btn-outline btn-sm text-red border-red/30">
              <Trash2 size={14} />Delete Nomination Data
            </button>
          )}
        </div>
      </div>

      {/* Role notice for view-only members */}
      {!canAct && (
        <div className="card p-3 mb-4 bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 text-sm">
            <Eye size={16} />
            <span>You are an NC Member with <strong>view-only access</strong>. Only the NC Chairperson and Secretary can make vetting decisions.</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Positions', value: positions?.length || 0, color: 'text-navy' },
          { label: 'Approved', value: positions?.filter(p => p.approved_count > 0).length || 0, color: 'text-teal' },
          { label: 'Nominees Published', value: publishedCount, color: 'text-orange' },
          { label: 'Needs Vetting', value: positions?.filter(p => p.recommendation_count > 0 && p.approved_count === 0).length || 0, color: 'text-red' },
        ].map((s, i) => (
          <div key={i} className="card p-4 text-center">
            <div className={`text-2xl font-montserrat font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs font-montserrat font-semibold text-gray-400 uppercase tracking-wide mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions Grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(positions || []).map(pos => (
              <Link key={pos.id} to={`/nc/position/${pos.id}`}
                className="card p-4 hover:border-orange/30 hover:shadow-md transition-all border border-transparent group">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-montserrat font-bold text-navy text-sm">{pos.title}</div>
                    {pos.gender_constraint && <div className="text-xs text-gray-400">{pos.gender_constraint} only</div>}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-orange transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span><Users size={11} className="inline mr-1" />{pos.recommendation_count} recommendations</span>
                    <span>{pos.unique_candidates} candidates</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange rounded-full" style={{ width: pos.recommendation_count > 0 ? '100%' : '0%' }} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  {pos.approved_count > 0
                    ? <span className="badge badge-teal">✓ {pos.approved_count} approved</span>
                    : pos.recommendation_count > 0
                      ? <span className="badge badge-orange">Needs vetting</span>
                      : <span className="badge badge-gray">No recommendations</span>}
                  <span className="text-xs text-orange font-semibold group-hover:underline">Review →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* NC Members */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-montserrat font-bold text-navy text-sm">NC Members ({ncMembers?.length || 0}/12)</h2>
            </div>
            <div>
              {(ncMembers || []).map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 last:border-0">
                  <img src={m.user?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user?.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`}
                    alt="" className="w-7 h-7 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy truncate">{m.user?.name}</div>
                    <div className="text-xs text-gray-400">{m.nc_role}</div>
                  </div>
                  {m.nc_role === 'chairperson' && <span className="badge badge-orange text-xs">Chair</span>}
                  {m.nc_role === 'secretary' && <span className="badge badge-teal text-xs">Sec</span>}
                </div>
              ))}
              {(!ncMembers || ncMembers.length === 0) && (
                <div className="text-center py-4 text-gray-400 text-sm">No NC members appointed yet</div>
              )}
            </div>
          </div>

          {/* By-Nominations */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-montserrat font-bold text-navy text-sm">By-Nominations</h2>
              {canAct && cycle.status === 'commissioned' && (
                <button onClick={() => setShowByNom(true)} className="btn-outline btn-sm text-xs"><Plus size={12} />Open</button>
              )}
            </div>
            <div>
              {(byNominations || []).length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">No by-nominations</div>
              ) : (byNominations || []).map(bn => (
                <div key={bn.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="font-semibold text-navy text-sm">{bn.position?.title}</div>
                  <div className="text-xs text-gray-400">Reason: {bn.reason} · Status: {bn.status}</div>
                  {bn.objection_deadline && (
                    <div className="text-xs text-orange">Objection deadline: {new Date(bn.objection_deadline).toLocaleDateString('en-GB')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* By-Nomination Modal */}
      {showByNom && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">Open By-Nomination</h3>
              <button onClick={() => setShowByNom(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Position *</label>
                <select className="form-select" value={byNomForm.position_id} onChange={e => setByNomForm(f => ({ ...f, position_id: e.target.value }))}>
                  <option value="">Select position...</option>
                  {(positions || []).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Reason</label>
                <select className="form-select" value={byNomForm.reason} onChange={e => setByNomForm(f => ({ ...f, reason: e.target.value }))}>
                  <option value="vacancy">Vacancy</option>
                  <option value="resignation">Resignation</option>
                  <option value="termination">Termination</option>
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                A By-Nomination College of 5 members will be formed. Members will have 7 days to prayerfully consider the nominee, with a 3-day objection window (Art. 18.2).
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={openByNomination} disabled={saving} className="btn-primary flex-1 justify-center">
                <Check size={15} />{saving ? 'Opening...' : 'Open By-Nomination'}
              </button>
              <button onClick={() => setShowByNom(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}