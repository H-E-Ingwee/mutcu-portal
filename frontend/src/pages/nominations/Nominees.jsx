import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Award, AlertTriangle, X } from 'lucide-react'

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
      setObjectionModal(null)
      setGrounds('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
    </div>
  )

  // Show "not published" state
  if (!data.published) {
    const statusMessages = {
      setup: 'The nomination cycle is being set up by the EC Admin.',
      prayer_period: 'The CU is in a prayer and fasting period before nominations open.',
      nominations_open: 'Members are currently submitting prayerful recommendations. The Nomination College will vet candidates after nominations close.',
      vetting: 'The Nomination College is prayerfully vetting candidates. Nominees will be published soon.',
      pre_agm: 'The final nominee list is being confirmed before the AGM.',
      commissioned: 'The new EC has been commissioned.',
    }
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="card p-8">
          <Award size={40} className="text-gray-300 mx-auto mb-4" />
          <h2 className="font-montserrat font-bold text-navy text-lg mb-2">Nominees Not Yet Published</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            {data.cycle
              ? statusMessages[data.cycle.status] || `Current status: ${data.cycle.status?.replace(/_/g, ' ')}`
              : 'No active nomination cycle at this time.'}
          </p>
          {data.cycle?.title && (
            <div className="mt-3 bg-navy/5 rounded-lg px-4 py-2 inline-block">
              <span className="text-xs font-montserrat font-bold text-navy">{data.cycle.title}</span>
            </div>
          )}
          {data.cycle?.publication_date && (
            <p className="text-gray-400 text-xs mt-3">
              Expected publication: {new Date(data.cycle.publication_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Group nominees by position
  const byPosition = {}
  data.nominees.forEach(n => {
    const posId = n.position?.id || n.position_id
    if (!byPosition[posId]) byPosition[posId] = { position: n.position, nominees: [] }
    byPosition[posId].nominees.push(n)
  })
  const sorted = Object.values(byPosition).sort((a, b) =>
    (a.position?.display_order || 0) - (b.position?.display_order || 0)
  )

  const canObjection = data.cycle?.status === 'objection_period' &&
    user?.membership_type === 'full' &&
    user?.enrollment_status === 'active'

  // Show empty state if published but no nominees
  if (sorted.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="card p-8">
          <Award size={40} className="text-gray-300 mx-auto mb-4" />
          <h2 className="font-montserrat font-bold text-navy text-lg mb-2">No Nominees Published Yet</h2>
          <p className="text-gray-500 text-sm">The Nomination College has not yet published any nominees for {data.cycle?.title}.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Published Nominees</h1>
          <p className="page-subtitle">{data.cycle?.title} — Executive Council Nominees</p>
        </div>
      </div>

      {/* Objection period banner */}
      {data.cycle?.status === 'objection_period' && (
        <div className="card p-4 mb-5 border-l-4 border-orange bg-orange/5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-orange flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-navy text-sm mb-1">Objection Period is Open</div>
              <div className="text-gray-600 text-sm">
                {data.cycle.objection_deadline
                  ? `The objection window is open until ${new Date(data.cycle.objection_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`
                  : 'The objection window is currently open.'}
                {canObjection
                  ? ' Full members may submit written objections below.'
                  : ' Only active full members may submit objections.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nominees by position */}
      {sorted.map(({ position, nominees }) => (
        <div key={position?.id} className="card mb-5">
          <div className="card-header">
            <div>
              <h2 className="font-montserrat font-bold text-navy text-sm">{position?.title}</h2>
              {position?.gender_constraint && (
                <div className="text-xs text-gray-400">{position.gender_constraint} only</div>
              )}
            </div>
            <span className="badge badge-teal">{nominees.length} {nominees.length === 1 ? 'Nominee' : 'Nominees'}</span>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {nominees.map(nominee => {
                const candidate = nominee.candidate || {}
                const photoUrl = candidate.photo_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`
                return (
                  <div key={nominee.id} className="text-center p-4 border border-gray-100 rounded-xl hover:border-orange/30 hover:shadow-sm transition-all">
                    <img src={photoUrl} alt={candidate.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-orange mx-auto mb-2" />
                    <div className="font-bold text-navy text-sm mb-0.5">{candidate.name}</div>
                    <div className="text-xs text-gray-400 mb-1">
                      Year {candidate.year_of_study}
                    </div>
                    <div className="text-xs text-gray-400 mb-2 truncate">
                      {candidate.primary_ministry || 'General Member'}
                    </div>
                    {canObjection && (
                      <button
                        onClick={() => setObjectionModal(nominee)}
                        className="text-xs text-red border border-red/30 rounded-lg px-2 py-1 hover:bg-red/5 transition-all w-full">
                        Submit Objection
                      </button>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-montserrat font-bold text-navy">Submit Objection</h3>
              <button onClick={() => { setObjectionModal(null); setGrounds('') }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-sm font-semibold text-navy">{objectionModal.candidate?.name}</div>
              <div className="text-xs text-gray-400">{objectionModal.position?.title}</div>
            </div>
            <div className="bg-orange/5 border border-orange/20 rounded-lg p-3 mb-4 text-xs text-orange">
              <strong>Constitutional requirement (Art. 17.2.v):</strong> Objections must be specific, factual, and constitutionally grounded. Minimum 50 characters.
            </div>
            <form onSubmit={submitObjection} className="space-y-4">
              <div>
                <label className="form-label">Grounds for Objection *</label>
                <textarea className="form-input" rows={4}
                  placeholder="State specific, factual, and constitutionally grounded grounds for your objection..."
                  value={grounds} onChange={e => setGrounds(e.target.value)} required minLength={50} />
                <div className={`text-xs mt-1 ${grounds.length >= 50 ? 'text-teal' : 'text-gray-400'}`}>
                  {grounds.length}/50 minimum characters {grounds.length >= 50 ? '✓' : ''}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setObjectionModal(null); setGrounds('') }}
                  className="btn-outline flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={submitting || grounds.length < 50}
                  className="btn-primary flex-1 justify-center">
                  {submitting ? 'Submitting...' : 'Submit Objection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}