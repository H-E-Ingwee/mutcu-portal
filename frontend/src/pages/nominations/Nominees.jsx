import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Award, AlertTriangle } from 'lucide-react'

export default function Nominees() {
  const { user } = useAuth()
  const [data, setData] = useState({ nominees: [], cycle: null, published: false })
  const [loading, setLoading] = useState(true)
  const [objectionModal, setObjectionModal] = useState(null)
  const [grounds, setGrounds] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/nominations/nominees').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  const submitObjection = async e => {
    e.preventDefault()
    if (grounds.length < 50) return toast.error('Grounds must be at least 50 characters')
    setSubmitting(true)
    try {
      await api.post('/nominations/objections', { nominee_id: objectionModal.id, grounds })
      toast.success('Objection submitted to the Nomination College')
      setObjectionModal(null); setGrounds('')
    } catch (err) { toast.error(err.response?.data?.error || 'Submission failed') }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  if (!data.published) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="card p-8">
          <Award size={40} className="text-gray-300 mx-auto mb-4" />
          <h2 className="font-montserrat font-bold text-navy text-lg mb-2">Nominees Not Yet Published</h2>
          <p className="text-gray-500 text-sm">{data.cycle ? `The Nomination College is vetting candidates for ${data.cycle.title}.` : 'No active nomination cycle.'}</p>
          {data.cycle?.publication_date && <p className="text-gray-400 text-xs mt-2">Expected: {new Date(data.cycle.publication_date).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}</p>}
        </div>
      </div>
    )
  }

  // Group by position
  const byPosition = {}
  data.nominees.forEach(n => {
    const posId = n.position?.id || n.position_id
    if (!byPosition[posId]) byPosition[posId] = { position: n.position, nominees: [] }
    byPosition[posId].nominees.push(n)
  })
  const sorted = Object.values(byPosition).sort((a, b) => (a.position?.display_order||0) - (b.position?.display_order||0))
  const canObjection = data.cycle?.status === 'objection_period' && user?.membership_type === 'full'

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Published Nominees</h1><p className="page-subtitle">{data.cycle?.title} — Executive Council Nominees</p></div>
      </div>

      {canObjection && (
        <div className="alert-warning mb-5">
          <AlertTriangle size={16} />
          <div>The objection window is open until <strong>{new Date(data.cycle.objection_deadline).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}</strong>. Full members may submit written objections.</div>
        </div>
      )}

      {sorted.map(({ position, nominees }) => (
        <div key={position?.id} className="card mb-5">
          <div className="card-header">
            <h2 className="font-montserrat font-bold text-navy text-sm">{position?.title}</h2>
            <span className="badge badge-teal">{nominees.length} {nominees.length === 1 ? 'Nominee' : 'Nominees'}</span>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {nominees.map(nominee => {
                const candidate = nominee.candidate || {}
                const photoUrl = candidate.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`
                return (
                  <div key={nominee.id} className="text-center p-4 border border-gray-100 rounded-xl hover:border-orange/30 transition-all">
                    <img src={photoUrl} alt={candidate.name} className="w-16 h-16 rounded-full object-cover border-3 border-orange mx-auto mb-2 border-2" />
                    <div className="font-bold text-navy text-sm mb-0.5">{candidate.name}</div>
                    <div className="text-xs text-gray-400 mb-2">Year {candidate.year_of_study} · {candidate.primary_ministry || 'General'}</div>
                    {canObjection && (
                      <button onClick={() => setObjectionModal(nominee)} className="text-xs text-red border border-red/30 rounded-lg px-2 py-1 hover:bg-red/5 transition-all">Object</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Objection Modal */}
      {objectionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="font-montserrat font-bold text-navy mb-1">Submit Objection</h3>
            <p className="text-gray-500 text-sm mb-4">Objecting to: <strong>{objectionModal.candidate?.name}</strong></p>
            <form onSubmit={submitObjection} className="space-y-4">
              <div>
                <label className="form-label">Grounds for Objection *</label>
                <textarea className="form-input" rows={4} placeholder="State specific, factual, and constitutionally grounded grounds (min 50 characters)..." value={grounds} onChange={e => setGrounds(e.target.value)} required minLength={50} />
                <div className="text-xs text-gray-400 mt-1">{grounds.length}/50 minimum characters</div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setObjectionModal(null); setGrounds('') }} className="btn-outline flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">{submitting ? 'Submitting...' : 'Submit Objection'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
