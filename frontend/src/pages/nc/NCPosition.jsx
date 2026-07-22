import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function NCPosition() {
  const { positionId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})

  useEffect(() => {
    api.get(`/nc/position/${positionId}`).then(r => setData(r.data)).finally(() => setLoading(false))
  }, [positionId])

  const saveDecision = async (candidateId, decision, reason) => {
    setSaving(prev => ({ ...prev, [candidateId]: true }))
    try {
      await api.post('/nc/vet', { cycle_id: data.cycle.id, position_id: positionId, candidate_id: candidateId, decision, reason })
      toast.success('Decision saved')
      setData(prev => ({
        ...prev,
        decisions: [...(prev.decisions || []).filter(d => d.candidate_id !== candidateId), { candidate_id: candidateId, decision, reason }]
      }))
    } catch (err) { toast.error('Failed to save decision') }
    finally { setSaving(prev => ({ ...prev, [candidateId]: false })) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>
  if (!data) return null

  const { cycle, position, candidates, decisions } = data
  const getDecision = candidateId => decisions?.find(d => d.candidate_id === candidateId)

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/nc" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2"><ArrowLeft size={12} />Back to NC Dashboard</Link>
          <h1 className="page-title">{position?.title}</h1>
          <p className="page-subtitle">Review recommendations and record vetting decisions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 text-center"><div className="text-2xl font-montserrat font-bold text-navy">{candidates?.length || 0}</div><div className="text-xs font-montserrat font-semibold text-gray-400 uppercase tracking-wide mt-1">Unique Candidates</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-montserrat font-bold text-teal">{decisions?.filter(d=>d.decision==='approved').length || 0}</div><div className="text-xs font-montserrat font-semibold text-gray-400 uppercase tracking-wide mt-1">Approved</div></div>
      </div>

      {(candidates || []).map(candidate => {
        const decision = getDecision(candidate.id)
        const photoUrl = candidate.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`
        const elig = candidate.eligibility || {}

        return (
          <div key={candidate.id} className="card mb-4">
            <div className="card-body">
              <div className="flex items-start gap-4 flex-wrap">
                <img src={photoUrl} alt={candidate.name} className="w-16 h-16 rounded-full object-cover border-2 border-orange flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-montserrat font-bold text-navy text-base mb-0.5">{candidate.name}</div>
                  <div className="text-gray-400 text-xs mb-2">Year {candidate.year_of_study} · {candidate.primary_ministry || 'General'} · {candidate.mutcu_number}</div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="badge badge-navy">{candidate.recommendation_count} recommendation{candidate.recommendation_count !== 1 ? 's' : ''}</span>
                    {elig.eligible ? <span className="badge badge-teal">All checks passed</span> : <span className="badge badge-red">Eligibility issues</span>}
                  </div>

                  {/* Eligibility checks */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(elig.checks || []).map((check, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded font-montserrat font-semibold ${check.passed ? 'bg-green-100 text-green-700' : 'bg-red/10 text-red'}`}>
                        {check.passed ? '✓' : '✗'} {check.label}
                      </span>
                    ))}
                  </div>

                  {/* Prayerful notes */}
                  {candidate.recommendations?.filter(r => r.note).length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="text-xs font-montserrat font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Member Notes ({candidate.recommendations.filter(r=>r.note).length})</div>
                      {candidate.recommendations.filter(r=>r.note).slice(0,3).map((r, i) => (
                        <div key={i} className="text-xs text-gray-600 italic mb-1">"{r.note}"</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Decision Panel */}
                <div className="w-full sm:w-56 flex-shrink-0">
                  {decision && (
                    <div className={`rounded-lg p-3 mb-3 text-xs font-montserrat font-bold ${decision.decision==='approved' ? 'bg-green-50 text-green-700 border border-green-200' : decision.decision==='rejected' ? 'bg-red/5 text-red border border-red/20' : 'bg-orange/5 text-orange border border-orange/20'}`}>
                      Decision: {decision.decision.charAt(0).toUpperCase()+decision.decision.slice(1)}
                      {decision.reason && <div className="font-normal mt-0.5">{decision.reason}</div>}
                    </div>
                  )}
                  <VettingForm candidateId={candidate.id} currentDecision={decision} onSave={saveDecision} saving={saving[candidate.id]} />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function VettingForm({ candidateId, currentDecision, onSave, saving }) {
  const [decision, setDecision] = useState(currentDecision?.decision || '')
  const [reason, setReason] = useState(currentDecision?.reason || '')

  return (
    <div className="space-y-2">
      <select className="form-select text-xs" value={decision} onChange={e => setDecision(e.target.value)}>
        <option value="">Select decision...</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="deferred">Deferred</option>
      </select>
      <input type="text" className="form-input text-xs" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
      <button onClick={() => onSave(candidateId, decision, reason)} disabled={saving || !decision} className="btn-primary btn-sm w-full justify-center">
        {saving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : null}
        {saving ? 'Saving...' : 'Save Decision'}
      </button>
    </div>
  )
}
