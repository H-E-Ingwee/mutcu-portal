import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Plus, ChevronRight, Play, Settings, Eye, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const STATUS_ORDER = ['setup','prayer_period','nominations_open','vetting','nominees_published','objection_period','pre_agm','commissioned']
const STATUS_LABEL = { setup:'Setup', prayer_period:'Prayer Period', nominations_open:'Nominations Open', vetting:'NC Vetting', nominees_published:'Nominees Published', objection_period:'Objection Period', pre_agm:'Pre-AGM', commissioned:'Commissioned' }
const STATUS_COLOR = { setup:'badge-gray', prayer_period:'badge-navy', nominations_open:'badge-green', vetting:'badge-orange', nominees_published:'badge-teal', objection_period:'badge-red', pre_agm:'badge-navy', commissioned:'badge-navy' }
const STATUS_NEXT = { setup:'prayer_period', prayer_period:'nominations_open', nominations_open:'vetting', vetting:'nominees_published', nominees_published:'objection_period', objection_period:'pre_agm', pre_agm:'commissioned' }

// Statuses NC Chair is allowed to set directly
const NC_CHAIR_ALLOWED_STATUSES = ['vetting','nominees_published','objection_period','pre_agm']

export default function AdminCycles() {
  const { user } = useAuth()
  const isAdmin = ['super_admin','ec_admin'].includes(user?.role)
  const isNCChair = user?.role === 'nc_chair'
  const isNCSecretary = user?.role === 'nc_secretary'
  // NC Chair gets action buttons; NC Secretary is read-only
  const canAct = isAdmin || isNCChair
  const isReadOnly = isNCSecretary

  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState({})
  const [showStatusModal, setShowStatusModal] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newCycle, setNewCycle] = useState({ title: '', spiritual_year: '', cycle_type: 'annual', nomination_open_date: '', nomination_close_date: '', publication_date: '', objection_deadline: '', agm_date: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/cycles').then(r => setCycles(r.data.cycles||[])).finally(() => setLoading(false))
  }, [])

  const advance = async (id) => {
    setAdvancing(prev => ({...prev, [id]: true}))
    try {
      const { data } = await api.post(`/admin/cycles/${id}/advance-status`)
      toast.success(data.message)
      setCycles(prev => prev.map(c => c.id === id ? {...c, status: data.cycle.status} : c))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setAdvancing(prev => ({...prev, [id]: false})) }
  }

  const setStatus = async (id, status) => {
    try {
      const { data } = await api.post(`/admin/cycles/${id}/set-status`, { status })
      toast.success(data.message)
      setCycles(prev => prev.map(c => c.id === id ? {...c, status: data.cycle.status} : c))
      setShowStatusModal(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const commission = async id => {
    if (!window.confirm('Commission the new EC? This finalises the cycle.')) return
    try {
      await api.post(`/admin/cycles/${id}/commission`)
      toast.success('New EC commissioned!')
      setCycles(prev => prev.map(c => c.id === id ? {...c, status: 'commissioned'} : c))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const deleteData = async (c) => {
    if (!window.confirm(`Delete ALL nomination data for "${c.title}"?\n\nThis will permanently delete:\n• All nominations submitted\n• All vetting decisions\n• All published nominees\n• All objections\n• All NC member records\n\nThe cycle itself will remain. This CANNOT be undone.`)) return
    try {
      await api.delete(`/nc/cycle/${c.id}/all-data`)
      toast.success('All nomination data deleted')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const deleteCycle = async (c) => {
    if (!window.confirm(`Permanently delete the entire cycle "${c.title}" and ALL its data?\n\nThis CANNOT be undone.`)) return
    try {
      await api.delete(`/nc/cycle/${c.id}`)
      setCycles(prev => prev.filter(x => x.id !== c.id))
      toast.success(`Cycle "${c.title}" deleted`)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const createCycle = async () => {
    if (!newCycle.title || !newCycle.spiritual_year) return toast.error('Title and spiritual year are required')
    setSaving(true)
    try {
      const { data } = await api.post('/admin/cycles', newCycle)
      toast.success('Nomination cycle created!')
      setCycles(prev => [data.cycle, ...prev])
      setShowNewModal(false)
      setNewCycle({ title: '', spiritual_year: '', cycle_type: 'annual', nomination_open_date: '', nomination_close_date: '', publication_date: '', objection_deadline: '', agm_date: '' })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create cycle') }
    finally { setSaving(false) }
  }

  // Which statuses can the current user set in the modal?
  const availableStatuses = isNCChair
    ? STATUS_ORDER.filter(s => NC_CHAIR_ALLOWED_STATUSES.includes(s))
    : STATUS_ORDER

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-montserrat font-bold text-navy text-2xl">Nomination Cycles</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isNCChair ? 'Manage nomination cycles and vetting stages' : isReadOnly ? 'View nomination cycles' : 'Create and manage nomination cycles'}
          </p>
        </div>
        {canAct && (
          <button onClick={() => setShowNewModal(true)} className="btn-primary">
            <Plus size={16} /> New Cycle
          </button>
        )}
      </div>

      {/* NC Chair info banner */}
      {isNCChair && (
        <div className="bg-teal/10 border border-teal/30 rounded-xl p-3 mb-5 flex items-start gap-2 text-sm text-teal">
          <Eye size={16} className="flex-shrink-0 mt-0.5" />
          <span>As NC Chairperson, you can create cycles, configure settings, appoint NC members, and manage vetting stages (Vetting → Nominees Published → Objection Period → Pre-AGM).</span>
        </div>
      )}

      {/* Empty state */}
      {cycles.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-gray-300 text-5xl mb-3">🗳️</div>
          <h3 className="font-montserrat font-bold text-navy mb-1">No Nomination Cycles Yet</h3>
          <p className="text-gray-400 text-sm mb-4">Create the first nomination cycle to begin the election process.</p>
          {canAct && (
            <button onClick={() => setShowNewModal(true)} className="btn-primary mx-auto">
              <Plus size={16} /> Create First Cycle
            </button>
          )}
        </div>
      ) : (
        cycles.map(c => (
          <div key={c.id} className="card mb-4">
            <div className="card-body">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="font-montserrat font-bold text-navy">{c.title}</h2>
                    <span className={`badge ${STATUS_COLOR[c.status]||'badge-gray'}`}>{STATUS_LABEL[c.status]||c.status}</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-3">{c.spiritual_year} · {c.cycle_type}</div>

                  {/* Status Progress Bar */}
                  <div className="flex items-center gap-1 mb-3 flex-wrap">
                    {STATUS_ORDER.filter(s => s !== 'commissioned').map((s, i, arr) => {
                      const currentIdx = STATUS_ORDER.indexOf(c.status)
                      const thisIdx = STATUS_ORDER.indexOf(s)
                      const done = thisIdx < currentIdx
                      const current = thisIdx === currentIdx
                      return (
                        <div key={s} className="flex items-center gap-1">
                          <div className={`h-1.5 w-8 rounded-full transition-all ${done ? 'bg-teal' : current ? 'bg-orange' : 'bg-gray-200'}`} />
                          {i < arr.length - 1 && <ChevronRight size={10} className="text-gray-300" />}
                        </div>
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500">
                    {c.nomination_open_date && <div><span className="font-semibold">Opens:</span> {new Date(c.nomination_open_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>}
                    {c.nomination_close_date && <div><span className="font-semibold">Closes:</span> {new Date(c.nomination_close_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>}
                    {c.publication_date && <div><span className="font-semibold">Publish:</span> {new Date(c.publication_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>}
                    {c.agm_date && <div><span className="font-semibold">AGM:</span> {new Date(c.agm_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>}
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  {canAct && c.status !== 'commissioned' && STATUS_NEXT[c.status] && (
                    <button onClick={() => advance(c.id)} disabled={advancing[c.id]}
                      className="btn-primary btn-sm">
                      {advancing[c.id] ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <Play size={13} />}
                      Advance to {STATUS_LABEL[STATUS_NEXT[c.status]]}
                    </button>
                  )}
                  {canAct && (
                    <button onClick={() => setShowStatusModal(c)} className="btn-outline btn-sm">
                      <Settings size={13} /> Set Status
                    </button>
                  )}
                  {/* NC Chair can appoint NC members */}
                  {canAct && (
                    <Link to={`/admin/cycles/${c.id}/appoint-nc`} className="btn-outline btn-sm text-xs justify-center">
                      Appoint NC
                    </Link>
                  )}
                  
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Set Status Modal */}
      {showStatusModal && canAct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-sm w-full">
            <h3 className="font-montserrat font-bold text-navy mb-1">Set Cycle Status</h3>
            <p className="text-gray-500 text-sm mb-4">{showStatusModal.title}</p>
            {isNCChair && (
              <p className="text-xs text-teal bg-teal/10 rounded-lg px-3 py-2 mb-3">
                As NC Chair, you can set vetting-related statuses only.
              </p>
            )}
            <div className="space-y-2 mb-4">
              {availableStatuses.map(s => (
                <button key={s} onClick={() => setStatus(showStatusModal.id, s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${showStatusModal.status === s ? 'bg-navy text-white' : 'hover:bg-gray-50 text-gray-700 border border-gray-200'}`}>
                  {STATUS_LABEL[s]}
                  {showStatusModal.status === s && <span className="ml-2 text-xs opacity-60">(current)</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setShowStatusModal(null)} className="btn-outline w-full justify-center">Cancel</button>
          </div>
        </div>
      )}

      {/* New Cycle Modal */}
      {showNewModal && canAct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-montserrat font-bold text-navy mb-4">Create Nomination Cycle</h3>
            <div className="space-y-3">
              <div>
                <label className="form-label">Cycle Title <span className="text-orange">*</span></label>
                <input className="form-input" placeholder="e.g. MUTCU Leadership Nominations 2026/2027"
                  value={newCycle.title} onChange={e => setNewCycle(p => ({...p, title: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Spiritual Year <span className="text-orange">*</span></label>
                <input className="form-input" placeholder="e.g. 2026/2027"
                  value={newCycle.spiritual_year} onChange={e => setNewCycle(p => ({...p, spiritual_year: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Cycle Type</label>
                <select className="form-input" value={newCycle.cycle_type} onChange={e => setNewCycle(p => ({...p, cycle_type: e.target.value}))}>
                  <option value="annual">Annual</option>
                  <option value="by_election">By-Election</option>
                  <option value="interim">Interim</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Nominations Open</label>
                  <input type="date" className="form-input" value={newCycle.nomination_open_date} onChange={e => setNewCycle(p => ({...p, nomination_open_date: e.target.value}))} />
                </div>
                <div>
                  <label className="form-label">Nominations Close</label>
                  <input type="date" className="form-input" value={newCycle.nomination_close_date} onChange={e => setNewCycle(p => ({...p, nomination_close_date: e.target.value}))} />
                </div>
                <div>
                  <label className="form-label">Publication Date</label>
                  <input type="date" className="form-input" value={newCycle.publication_date} onChange={e => setNewCycle(p => ({...p, publication_date: e.target.value}))} />
                </div>
                <div>
                  <label className="form-label">Objection Deadline</label>
                  <input type="date" className="form-input" value={newCycle.objection_deadline} onChange={e => setNewCycle(p => ({...p, objection_deadline: e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="form-label">AGM Date</label>
                <input type="date" className="form-input" value={newCycle.agm_date} onChange={e => setNewCycle(p => ({...p, agm_date: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={createCycle} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : 'Create Cycle'}
              </button>
              <button onClick={() => setShowNewModal(false)} className="btn-outline px-4">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}