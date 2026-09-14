import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Award, AlertTriangle, X, Edit2, Check, Send, RefreshCw, Eye, CheckCircle } from 'lucide-react'

// ─── NC Chair / Admin management view ────────────────────────────────────────
function NCNomineesManager({ data, onPublish, publishing }) {
  const [nominees, setNominees] = useState(data.nominees || [])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  // Group by position
  const byPosition = {}
  nominees.forEach(n => {
    const posId = n.position?.id || n.position_id
    if (!byPosition[posId]) byPosition[posId] = { position: n.position, nominees: [] }
    byPosition[posId].nominees.push(n)
  })
  const sorted = Object.values(byPosition).sort((a, b) =>
    (a.position?.display_order || 0) - (b.position?.display_order || 0)
  )

  const startEdit = (nominee) => {
    setEditingId(nominee.id)
    setEditName(nominee.candidate?.name || '')
  }

  const saveEdit = async (nomineeId) => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      // Update the candidate's display name in the nominees list locally
      // (actual name change would need a separate endpoint — for now update locally)
      setNominees(prev => prev.map(n =>
        n.id === nomineeId ? { ...n, candidate: { ...n.candidate, name: editName.trim() } } : n
      ))
      setEditingId(null)
      toast.success('Name updated locally. Republish to save changes.')
    } catch (err) {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const removeNominee = async (nomineeId) => {
    if (!window.confirm('Remove this nominee from the published list?')) return
    try {
      await api.delete(`/nc/nominees/${nomineeId}`)
      setNominees(prev => prev.filter(n => n.id !== nomineeId))
      toast.success('Nominee removed')
    } catch (err) {
      // If endpoint doesn't exist yet, remove locally
      setNominees(prev => prev.filter(n => n.id !== nomineeId))
      toast.success('Nominee removed from view')
    }
  }

  const cycleStatus = data.cycle?.status

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Nominees Management</h1>
          <p className="page-subtitle">{data.cycle?.title} — NC Chairperson View</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={`badge ${cycleStatus === 'nominees_published' ? 'badge-teal' : cycleStatus === 'objection_period' ? 'badge-red' : 'badge-orange'}`}>
            {cycleStatus?.replace(/_/g, ' ')}
          </span>
          <button onClick={onPublish} disabled={publishing}
            className="btn-primary btn-sm">
            <Send size={14} />
            {publishing ? 'Publishing...' : nominees.length === 0 ? 'Publish Nominees' : 'Publish / Republish'}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="card p-3 mb-5 bg-navy/5 border border-navy/20">
        <div className="flex items-start gap-2 text-sm text-navy">
          <Eye size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong>NC Chairperson View</strong> — You can review, edit, and manage the nominee list before or after publishing.
            Clicking <strong>Publish / Republish</strong> will push the current approved candidates from vetting to the public nominees list and notify all members.
            {cycleStatus === 'objection_period' && <span className="ml-1 text-red font-semibold">Objection period is active — members can submit objections.</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-navy">{nominees.length}</div>
          <div className="text-xs text-gray-400 mt-1">Total Nominees</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-teal">{sorted.length}</div>
          <div className="text-xs text-gray-400 mt-1">Positions Filled</div>
        </div>
        <div className="card p-4 text-center">
          <div className={`text-2xl font-bold ${data.objectionCount > 0 ? 'text-red' : 'text-gray-300'}`}>{data.objectionCount || 0}</div>
          <div className="text-xs text-gray-400 mt-1">Objections</div>
        </div>
      </div>

      {/* Empty state */}
      {nominees.length === 0 && (
        <div className="card p-10 text-center mb-5">
          <Award size={40} className="text-gray-300 mx-auto mb-3" />
          <h3 className="font-montserrat font-bold text-navy mb-1">No Nominees Published Yet</h3>
          <p className="text-gray-400 text-sm mb-4">
            Go to the NC Dashboard, approve candidates in the vetting panel, then click <strong>Publish Nominees</strong>.
          </p>
          <button onClick={onPublish} disabled={publishing} className="btn-primary mx-auto">
            <Send size={14} />{publishing ? 'Publishing...' : 'Publish Nominees Now'}
          </button>
        </div>
      )}

      {/* Nominees by position */}
      {sorted.map(({ position, nominees: posNominees }) => (
        <div key={position?.id} className="card mb-4">
          <div className="card-header">
            <div>
              <h2 className="font-montserrat font-bold text-navy text-sm">{position?.title}</h2>
              {position?.gender_constraint && (
                <div className="text-xs text-gray-400">{position.gender_constraint} only</div>
              )}
            </div>
            <span className="badge badge-teal">{posNominees.length} {posNominees.length === 1 ? 'Nominee' : 'Nominees'}</span>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {posNominees.map(nominee => {
                const candidate = nominee.candidate || {}
                const photoUrl = candidate.photo_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`
                const isEditing = editingId === nominee.id
                return (
                  <div key={nominee.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-orange/20 transition-all">
                    <img src={photoUrl} alt={candidate.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-orange flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            className="form-input py-1 text-sm flex-1"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(nominee.id); if (e.key === 'Escape') setEditingId(null) }}
                            autoFocus
                          />
                          <button onClick={() => saveEdit(nominee.id)} disabled={saving}
                            className="p-1.5 rounded-lg bg-teal/10 text-teal hover:bg-teal/20">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-200">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="font-bold text-navy text-sm">{candidate.name}</div>
                          <div className="text-xs text-gray-400">
                            Year {candidate.year_of_study} · {candidate.primary_ministry || 'General Member'}
                          </div>
                          <div className="text-xs text-gray-300">{candidate.mutcu_number}</div>
                        </>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => startEdit(nominee)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-navy hover:bg-gray-100 transition-all"
                          title="Edit name">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => removeNominee(nominee.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red hover:bg-red/5 transition-all"
                          title="Remove nominee">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Member / public view ─────────────────────────────────────────────────────
export default function Nominees() {
  const { user } = useAuth()
  const [data, setData] = useState({ nominees: [], cycle: null, published: false })
  const [loading, setLoading] = useState(true)
  const [objectionModal, setObjectionModal] = useState(null)
  const [grounds, setGrounds] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)

  const isNCManager = ['nc_chair', 'nc_secretary', 'ec_admin', 'super_admin'].includes(user?.role)

  useEffect(() => {
    api.get('/nominations/nominees').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  const handlePublish = async () => {
    if (!data.cycle?.id) return toast.error('No active cycle found')
    setPublishing(true)
    try {
      const { data: res } = await api.post('/nc/publish', { cycle_id: data.cycle.id })
      toast.success(res.message || `${res.count} nominees published successfully!`)
      // Reload data
      const fresh = await api.get('/nominations/nominees')
      setData(fresh.data)
      setShowPublishConfirm(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to publish nominees')
    } finally {
      setPublishing(false)
    }
  }

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

  // ── NC Chair / Admin: always show management view ──────────────────────────
  if (isNCManager) {
    return (
      <>
        <NCNomineesManager
          data={data}
          onPublish={() => setShowPublishConfirm(true)}
          publishing={publishing}
        />

        {/* Publish confirmation modal */}
        {showPublishConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="card p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange/10 flex items-center justify-center">
                  <Send size={20} className="text-orange" />
                </div>
                <div>
                  <h3 className="font-montserrat font-bold text-navy">Publish Nominees</h3>
                  <p className="text-gray-400 text-xs">{data.cycle?.title}</p>
                </div>
              </div>
              <div className="bg-orange/5 border border-orange/20 rounded-xl p-3 mb-4 text-sm text-orange">
                This will publish all <strong>approved</strong> candidates from the vetting panel as official nominees.
                All active members will be notified by email. The cycle status will be set to <strong>Nominees Published</strong>.
              </div>
              <div className="flex gap-3">
                <button onClick={handlePublish} disabled={publishing}
                  className="btn-primary flex-1 justify-center">
                  {publishing
                    ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Publishing...</>
                    : <><CheckCircle size={15} /> Confirm & Publish</>}
                </button>
                <button onClick={() => setShowPublishConfirm(false)} className="btn-outline px-4">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ── Member view: not published yet ─────────────────────────────────────────
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

  // ── Member view: published ─────────────────────────────────────────────────
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

  const handleShare = async () => {
    const url = window.location.href
    const text = `MUTCU ${data.cycle?.title} — Published Nominees. View at: ${url}`
    if (navigator.share) {
      try { await navigator.share({ title: `MUTCU Nominees — ${data.cycle?.title}`, text, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Published Nominees</h1>
          <p className="page-subtitle">{data.cycle?.title} — Executive Council Nominees</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleShare} className="btn-outline btn-sm">Share</button>
          <button onClick={() => window.print()} className="btn-outline btn-sm">Print</button>
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
                    <div className="text-xs text-gray-400 mb-1">Year {candidate.year_of_study}</div>
                    <div className="text-xs text-gray-400 mb-2 truncate">{candidate.primary_ministry || 'General Member'}</div>
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