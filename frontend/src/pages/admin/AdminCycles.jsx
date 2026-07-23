import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Plus, ChevronRight, Play, Settings } from 'lucide-react'

const STATUS_ORDER = ['setup','prayer_period','nominations_open','vetting','nominees_published','objection_period','pre_agm','commissioned']
const STATUS_LABEL = { setup:'Setup', prayer_period:'Prayer Period', nominations_open:'Nominations Open', vetting:'NC Vetting', nominees_published:'Nominees Published', objection_period:'Objection Period', pre_agm:'Pre-AGM', commissioned:'Commissioned' }
const STATUS_COLOR = { setup:'badge-gray', prayer_period:'badge-navy', nominations_open:'badge-green', vetting:'badge-orange', nominees_published:'badge-teal', objection_period:'badge-red', pre_agm:'badge-navy', commissioned:'badge-navy' }
const STATUS_NEXT = { setup:'prayer_period', prayer_period:'nominations_open', nominations_open:'vetting', vetting:'nominees_published', nominees_published:'objection_period', objection_period:'pre_agm', pre_agm:'commissioned' }

export default function AdminCycles() {
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState({})
  const [showStatusModal, setShowStatusModal] = useState(null)

  useEffect(() => { api.get('/admin/cycles').then(r => setCycles(r.data.cycles||[])).finally(() => setLoading(false)) }, [])

  const advance = async (id, currentStatus) => {
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Nomination Cycles</h1></div><Link to="/admin/cycles/create" className="btn-primary btn-sm"><Plus size={14} />New Cycle</Link></div>

      {cycles.length === 0 ? (
        <div className="card p-10 text-center"><div className="text-gray-400 text-sm mb-3">No cycles created yet.</div><Link to="/admin/cycles/create" className="btn-primary btn-sm mx-auto">Create First Cycle</Link></div>
      ) : cycles.map(c => (
        <div key={c.id} className="card mb-4">
          <div className="card-body">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-montserrat font-bold text-navy">{c.title}</h2>
                  <span className={`badge ${STATUS_COLOR[c.status]||'badge-gray'}`}>{STATUS_LABEL[c.status]||c.status}</span>
                </div>
                <div className="text-xs text-gray-400 mb-3">{c.spiritual_year} · {c.cycle_type}</div>

                {/* Status Progress Bar */}
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  {STATUS_ORDER.filter(s => s !== 'commissioned').map((s, i) => {
                    const currentIdx = STATUS_ORDER.indexOf(c.status)
                    const thisIdx = STATUS_ORDER.indexOf(s)
                    const done = thisIdx < currentIdx
                    const current = thisIdx === currentIdx
                    return (
                      <div key={s} className="flex items-center gap-1">
                        <div className={`h-1.5 w-8 rounded-full transition-all ${done ? 'bg-teal' : current ? 'bg-orange' : 'bg-gray-200'}`} />
                        {i < STATUS_ORDER.filter(s => s !== 'commissioned').length - 1 && <ChevronRight size={10} className="text-gray-300" />}
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
                {/* Advance Status Button */}
                {c.status !== 'commissioned' && STATUS_NEXT[c.status] && (
                  <button onClick={() => advance(c.id, c.status)} disabled={advancing[c.id]}
                    className="btn-primary btn-sm">
                    {advancing[c.id] ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <Play size={13} />}
                    Advance to {STATUS_LABEL[STATUS_NEXT[c.status]]}
                  </button>
                )}
                {/* Set Status Button */}
                <button onClick={() => setShowStatusModal(c)} className="btn-outline btn-sm">
                  <Settings size={13} />Set Status
                </button>
                <Link to={`/admin/cycles/${c.id}/appoint-nc`} className="btn-outline btn-sm text-xs justify-center">Appoint NC</Link>
                {c.status === 'pre_agm' && (
                  <button onClick={() => commission(c.id)} className="btn-teal btn-sm">Commission EC</button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Set Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-sm w-full">
            <h3 className="font-montserrat font-bold text-navy mb-1">Set Cycle Status</h3>
            <p className="text-gray-500 text-sm mb-4">{showStatusModal.title}</p>
            <div className="space-y-2 mb-4">
              {STATUS_ORDER.map(s => (
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
    </div>
  )
}
