import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  ArrowLeft, ThumbsUp, ThumbsDown, Clock, UserPlus,
  Sparkles, Printer, Eye, AlertTriangle, Zap, ChevronDown, ChevronUp
} from 'lucide-react'

export default function NCPosition() {
  const { positionId } = useParams()
  const { user, isNCAction } = useAuth()
  const canAct = isNCAction ? isNCAction() : false

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addResults, setAddResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [aiSummaries, setAiSummaries] = useState({})
  const [loadingAI, setLoadingAI] = useState({})
  const [expandedCards, setExpandedCards] = useState({})
  const [bulkRejecting, setBulkRejecting] = useState(false)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    api.get(`/nc/position/${positionId}`).then(r => setData(r.data)).finally(() => setLoading(false))
  }, [positionId])

  const saveDecision = async (candidateId, decision, reason) => {
    if (!canAct) return toast.error('Only NC Chairperson or Secretary can make vetting decisions')
    if (!decision) return toast.error('Please select a decision')
    setSaving(prev => ({ ...prev, [candidateId]: true }))
    try {
      await api.post('/nc/vet', {
        cycle_id: data.cycle.id, position_id: positionId,
        candidate_id: candidateId, decision, reason
      })
      toast.success(`Decision saved — ${decision}`)
      setData(prev => ({
        ...prev,
        decisions: [
          ...(prev.decisions || []).filter(d => d.candidate_id !== candidateId),
          { candidate_id: candidateId, decision, reason }
        ]
      }))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save decision') }
    finally { setSaving(prev => ({ ...prev, [candidateId]: false })) }
  }

  const getAISummary = async (candidate) => {
    if (!canAct) return toast.error('Only NC Chairperson or Secretary can generate AI summaries')
    setLoadingAI(prev => ({ ...prev, [candidate.id]: true }))
    try {
      const response = await api.post('/nc/ai-summary', {
        candidate,
        position: data?.position,
        recommendations: candidate.recommendations,
        eligibility: candidate.eligibility,
      })
      setAiSummaries(prev => ({ ...prev, [candidate.id]: response.data.summary }))
      toast.success('AI summary generated')
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI summary failed')
    } finally {
      setLoadingAI(prev => ({ ...prev, [candidate.id]: false }))
    }
  }

  const bulkRejectIneligible = async () => {
    if (!canAct) return toast.error('Only NC Chairperson or Secretary can reject candidates')
    const ineligibleCount = (data?.candidates || []).filter(c => !c.eligibility?.eligible).length
    if (ineligibleCount === 0) return toast('No ineligible candidates found', { icon: 'ℹ️' })
    if (!window.confirm(`Reject all ${ineligibleCount} ineligible candidate(s) for this position? This will auto-fill rejection reasons based on failed checks.`)) return
    setBulkRejecting(true)
    try {
      const { data: res } = await api.post('/nc/bulk-reject-ineligible', {
        cycle_id: data.cycle.id, position_id: positionId
      })
      toast.success(res.message)
      // Refresh position data
      const fresh = await api.get(`/nc/position/${positionId}`)
      setData(fresh.data)
    } catch (err) { toast.error(err.response?.data?.error || 'Bulk reject failed') }
    finally { setBulkRejecting(false) }
  }

  const searchMembers = async (q) => {
    if (!q || q.length < 2) { setAddResults([]); return }
    setSearching(true)
    try {
      const { data: res } = await api.get(`/nominations/eligible/${positionId}`)
      const existing = new Set((data?.candidates || []).map(c => c.id))
      const filtered = (res.members || [])
        .filter(m => !existing.has(m.id) && (
          m.name.toLowerCase().includes(q.toLowerCase()) ||
          (m.ministry || '').toLowerCase().includes(q.toLowerCase())
        ))
      setAddResults(filtered.slice(0, 8))
    } catch { } finally { setSearching(false) }
  }

  const addNCCandidate = async (member) => {
    if (!canAct) return toast.error('Only NC Chairperson or Secretary can add candidates')
    setSaving(prev => ({ ...prev, [member.id]: true }))
    try {
      await api.post('/nc/vet', {
        cycle_id: data.cycle.id, position_id: positionId,
        candidate_id: member.id, decision: 'deferred',
        reason: 'Added by NC — not in member recommendations'
      })
      toast.success(`${member.name} added to vetting list`)
      setData(prev => ({
        ...prev,
        candidates: [...(prev.candidates || []), {
          ...member, recommendation_count: 0, recommendations: [],
          eligibility: { eligible: true, checks: [] }, objection_count: 0
        }],
        decisions: [...(prev.decisions || []), { candidate_id: member.id, decision: 'deferred', reason: 'Added by NC' }]
      }))
      setShowAddModal(false)
      setAddSearch('')
      setAddResults([])
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add candidate') }
    finally { setSaving(prev => ({ ...prev, [member.id]: false })) }
  }

  const buildFullReportHTML = (report) => {
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const css = `* { margin:0;padding:0;box-sizing:border-box; } body { font-family:Arial,sans-serif;color:#1a1a2e;background:#fff; }
      .header { background:linear-gradient(135deg,#04003D,#0a0060);color:white;padding:24px 40px;display:flex;justify-content:space-between;align-items:center; }
      .header h1 { font-size:20px;font-weight:800;color:#FF9700; } .header p { font-size:10px;color:rgba(255,255,255,0.5);margin-top:3px; }
      .header-right { text-align:right;font-size:10px;color:rgba(255,255,255,0.5); }
      .body { padding:28px 40px; } .section-title { font-size:13px;font-weight:800;color:#04003D;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #FF9700;padding-bottom:6px;margin:20px 0 14px; }
      .candidate { border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:12px;page-break-inside:avoid; }
      .candidate-header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px; }
      .candidate-name { font-size:14px;font-weight:800;color:#04003D; }
      .badge { display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700; }
      .badge-approved { background:#D1FAE5;color:#065F46; } .badge-rejected { background:#FEE2E2;color:#991B1B; }
      .badge-deferred { background:#FEF3C7;color:#92400E; } .badge-pending { background:#F3F4F6;color:#6B7280; }
      .ai-summary { background:#F0F4FF;border-left:3px solid #FF9700;padding:8px 12px;margin-top:8px;font-size:10px;color:#374151;line-height:1.6; }
      .footer { background:#F5F7FA;padding:14px 40px;text-align:center;font-size:9px;color:#9CA3AF;border-top:1px solid #E5E7EB;margin-top:32px; }
      @media print { body { -webkit-print-color-adjust:exact;print-color-adjust:exact; } }`

    let posHTML = ''
    for (const posReport of (report.positions || [])) {
      const decisions = posReport.decisions || []
      if (decisions.length === 0) continue
      posHTML += `<div class="section-title">${posReport.position?.title || ''}</div>`
      for (const d of decisions) {
        const decClass = d.decision === 'approved' ? 'badge-approved' : d.decision === 'rejected' ? 'badge-rejected' : d.decision === 'deferred' ? 'badge-deferred' : 'badge-pending'
        const decLabel = d.decision ? (d.decision.charAt(0).toUpperCase() + d.decision.slice(1)) : 'Pending'
        posHTML += `<div class="candidate"><div class="candidate-header"><div>
          <div class="candidate-name">${d.candidate?.name || ''}</div>
          <div style="font-size:10px;color:#6B7280;margin-top:2px">${d.candidate?.mutcu_number || ''} · Year ${d.candidate?.year_of_study || '?'} · ${d.candidate?.primary_ministry || 'General'} · ${d.candidate?.gender || ''}</div>
          </div><div style="text-align:right"><span class="badge ${decClass}">${decLabel}</span>
          <div style="font-size:9px;color:#6B7280;margin-top:4px">${d.recommendation_count || 0} recommendation${(d.recommendation_count || 0) !== 1 ? 's' : ''}</div></div></div>
          ${d.reason ? `<div style="font-size:10px;color:#374151;margin-bottom:6px"><strong>NC Reason:</strong> ${d.reason}</div>` : ''}
          ${d.ai_summary ? `<div class="ai-summary"><strong>AI Summary:</strong> ${d.ai_summary}</div>` : ''}
          </div>`
      }
    }

    const ncNames = (report.ncMembers || []).map(m => m.user?.name || '').join(', ') || 'Not recorded'
    return `<!DOCTYPE html><html><head><title>NC Vetting Report</title><style>${css}</style></head><body>
      <div class="header"><div><h1>MUTCU DMS — NC Vetting Report</h1><p>${report.cycle?.title || ''} · ${report.cycle?.spiritual_year || ''}</p></div>
      <div class="header-right">Full Report<br>Generated: ${date}<br>By: ${report.generatedBy || ''}</div></div>
      <div class="body">${posHTML}
      <div class="section-title">Nomination College Members</div>
      <div style="font-size:11px;color:#374151">${ncNames}</div>
      </div><div class="footer">MUTCU Digital Management System · portal.mutcu.org · Inspire Love, Hope &amp; Godliness</div></body></html>`
  }

  const printReport = async () => {
    setPrinting(true)
    try {
      const { data: report } = await api.get('/nc/report')
      const html = buildFullReportHTML(report)
      const win = window.open('', '_blank')
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => { win.print() }, 500)
    } catch (err) {
      toast.error('Failed to generate report')
    } finally { setPrinting(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>
  if (!data) return null

  const { cycle, position, candidates, decisions } = data
  const getDecision = id => decisions?.find(d => d.candidate_id === id)
  const maxCount = Math.max(...(candidates || []).map(c => c.recommendation_count || 0), 1)
  const ineligibleCount = (candidates || []).filter(c => !c.eligibility?.eligible).length
  const vettedCount = (decisions || []).length
  const totalCandidates = (candidates || []).length

  const decisionColors = {
    approved: 'bg-green-50 border-green-200 text-green-700',
    rejected: 'bg-red/5 border-red/20 text-red',
    deferred: 'bg-orange/5 border-orange/20 text-orange',
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/nc" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2"><ArrowLeft size={12} />Back to NC Dashboard</Link>
          <h1 className="page-title">{position?.title}</h1>
          <p className="page-subtitle">
            {totalCandidates} candidate{totalCandidates !== 1 ? 's' : ''} · {candidates?.reduce((s, c) => s + (c.recommendation_count || 0), 0)} total recommendations
            {position?.gender_constraint && <span className="badge badge-navy ml-2">{position.gender_constraint} only</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={printReport} disabled={printing} className="btn-outline btn-sm">
            <Printer size={14} />{printing ? 'Generating...' : 'Print Report'}
          </button>
          {canAct && ineligibleCount > 0 && (
            <button onClick={bulkRejectIneligible} disabled={bulkRejecting} className="btn-outline btn-sm text-red border-red/30 hover:bg-red/5">
              <Zap size={14} />{bulkRejecting ? 'Rejecting...' : `Reject ${ineligibleCount} Ineligible`}
            </button>
          )}
          {canAct && (
            <button onClick={() => setShowAddModal(true)} className="btn-outline btn-sm">
              <UserPlus size={14} />Add Candidate (NC)
            </button>
          )}
        </div>
      </div>

      {/* Vetting progress bar */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-montserrat font-bold text-navy">Vetting Progress</span>
          <span className="text-sm font-bold text-orange">{vettedCount}/{totalCandidates} vetted</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-orange rounded-full transition-all" style={{ width: totalCandidates > 0 ? `${(vettedCount / totalCandidates) * 100}%` : '0%' }} />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-400">
          <span className="text-green-600 font-semibold">✓ {(decisions || []).filter(d => d.decision === 'approved').length} approved</span>
          <span className="text-red font-semibold">✗ {(decisions || []).filter(d => d.decision === 'rejected').length} rejected</span>
          <span className="text-orange font-semibold">⏸ {(decisions || []).filter(d => d.decision === 'deferred').length} deferred</span>
          <span className="ml-auto">{totalCandidates - vettedCount} pending</span>
        </div>
      </div>

      {/* View-only notice */}
      {!canAct && (
        <div className="card p-3 mb-4 bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 text-sm">
            <Eye size={16} />
            <span>You have <strong>view-only access</strong>. Only the NC Chairperson and Secretary can make vetting decisions.</span>
          </div>
        </div>
      )}

      {/* Recommendation Tally */}
      {(candidates || []).length > 0 && (
        <div className="card mb-6">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Recommendation Tally</h2></div>
          <div className="card-body space-y-3">
            {[...(candidates || [])].sort((a, b) => (b.recommendation_count || 0) - (a.recommendation_count || 0)).map((c, i) => {
              const pct = maxCount > 0 ? ((c.recommendation_count || 0) / maxCount) * 100 : 0
              const decision = getDecision(c.id)
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-navy">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-navy">{c.name}</span>
                      <div className="flex items-center gap-2">
                        {decision && <span className={`badge text-xs ${decision.decision === 'approved' ? 'badge-teal' : decision.decision === 'rejected' ? 'badge-red' : 'badge-orange'}`}>{decision.decision}</span>}
                        {c.objection_count > 0 && <span className="badge badge-red text-xs">⚠ {c.objection_count} objection{c.objection_count !== 1 ? 's' : ''}</span>}
                        <span className="text-xs font-bold text-gray-500">{c.recommendation_count || 0} rec{(c.recommendation_count || 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${decision?.decision === 'approved' ? 'bg-teal' : decision?.decision === 'rejected' ? 'bg-red/50' : 'bg-orange'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Detailed Candidate Cards */}
      {[...(candidates || [])].sort((a, b) => (b.recommendation_count || 0) - (a.recommendation_count || 0)).map(candidate => {
        const decision = getDecision(candidate.id)
        const photoUrl = candidate.photo_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`
        const elig = candidate.eligibility || {}
        const isNCAdded = candidate.recommendation_count === 0
        const isExpanded = expandedCards[candidate.id]
        const aiSummary = aiSummaries[candidate.id]

        return (
          <div key={candidate.id} className={`card mb-4 ${decision?.decision === 'approved' ? 'border-l-4 border-teal' : decision?.decision === 'rejected' ? 'border-l-4 border-red/30' : ''}`}>
            <div className="card-body">
              <div className="flex items-start gap-4 flex-wrap">
                {/* Photo */}
                <div className="relative flex-shrink-0">
                  <img src={photoUrl} alt={candidate.name} className="w-16 h-16 rounded-full object-cover border-2 border-orange" />
                  {isNCAdded && <div className="absolute -bottom-1 -right-1 bg-navy text-white text-xs rounded-full px-1.5 py-0.5 font-bold">NC</div>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-montserrat font-bold text-navy text-base mb-0.5">{candidate.name}</div>
                  <div className="text-gray-400 text-xs mb-2">
                    Year {candidate.year_of_study} · {candidate.primary_ministry || 'General'} · {candidate.mutcu_number}
                    {candidate.gender && ` · ${candidate.gender}`}
                  </div>

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {isNCAdded
                      ? <span className="badge badge-navy">Added by NC</span>
                      : <span className="badge badge-orange font-bold">{candidate.recommendation_count} member recommendation{candidate.recommendation_count !== 1 ? 's' : ''}</span>}
                    {elig.eligible
                      ? <span className="badge badge-teal">✓ All checks passed</span>
                      : <span className="badge badge-red">✗ Eligibility issues</span>}
                    {candidate.objection_count > 0 && (
                      <span className="badge badge-red flex items-center gap-1">
                        <AlertTriangle size={10} />{candidate.objection_count} objection{candidate.objection_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Eligibility checks */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(elig.checks || []).map((check, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded font-montserrat font-semibold ${check.passed ? 'bg-green-100 text-green-700' : 'bg-red/10 text-red'}`}>
                        {check.passed ? '✓' : '✗'} {check.label}
                      </span>
                    ))}
                  </div>

                  {/* Expand/collapse recommendations */}
                  {candidate.recommendations?.length > 0 && (
                    <button onClick={() => setExpandedCards(prev => ({ ...prev, [candidate.id]: !prev[candidate.id] }))}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-navy transition-colors mb-2">
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {isExpanded ? 'Hide' : 'Show'} {candidate.recommendations.length} prayerful note{candidate.recommendations.length !== 1 ? 's' : ''}
                    </button>
                  )}
                  {isExpanded && (
                    <div className="space-y-1.5 mb-3">
                      {candidate.recommendations.map((rec, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 italic">
                          {rec.note ? `"${rec.note}"` : <span className="text-gray-400">No note provided</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Summary */}
                  {aiSummary && (
                    <div className="bg-blue-50 border-l-3 border-orange rounded-lg px-3 py-2 mb-3 text-xs text-gray-700 leading-relaxed">
                      <span className="font-bold text-orange">✦ AI Summary: </span>{aiSummary}
                    </div>
                  )}

                  {/* AI button */}
                  {canAct && (
                    <button onClick={() => getAISummary(candidate)} disabled={loadingAI[candidate.id]}
                      className="flex items-center gap-1 text-xs text-orange hover:text-orange/80 font-semibold transition-colors">
                      <Sparkles size={12} />
                      {loadingAI[candidate.id] ? 'Generating...' : aiSummary ? 'Regenerate AI Summary' : 'Generate AI Summary'}
                    </button>
                  )}
                </div>

                {/* Decision Panel */}
                <div className="w-full sm:w-60 flex-shrink-0">
                  {decision && (
                    <div className={`rounded-lg p-3 mb-3 text-xs font-montserrat font-bold border ${decisionColors[decision.decision] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                      Current: {decision.decision.charAt(0).toUpperCase() + decision.decision.slice(1)}
                      {decision.reason && <div className="font-normal mt-0.5 text-xs opacity-80">{decision.reason}</div>}
                    </div>
                  )}

                  {/* Vetting form — only for NC Chair/Secretary/Admin */}
                  {canAct
                    ? <VettingForm
                        candidateId={candidate.id}
                        currentDecision={decision}
                        onSave={saveDecision}
                        saving={saving[candidate.id]}
                      />
                    : <div className="text-xs text-gray-400 italic p-2 bg-gray-50 rounded-lg text-center flex items-center justify-center gap-1">
                        <Eye size={12} />View only — NC Chair/Secretary can vet
                      </div>
                  }
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {(candidates || []).length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-gray-400 text-sm mb-3">No recommendations for this position yet.</div>
          {canAct && (
            <button onClick={() => setShowAddModal(true)} className="btn-outline btn-sm mx-auto">
              <UserPlus size={14} />Add a candidate as NC
            </button>
          )}
        </div>
      )}

      {/* Add NC Candidate Modal */}
      {showAddModal && canAct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="font-montserrat font-bold text-navy mb-1">Add Candidate (NC Decision)</h3>
            <p className="text-gray-500 text-sm mb-4">Add a member not recommended by the congregation. This is the NC's constitutional right.</p>
            <input type="text" className="form-input mb-3" placeholder="Search by name or ministry..."
              value={addSearch} onChange={e => { setAddSearch(e.target.value); searchMembers(e.target.value) }} autoFocus />
            <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
              {searching && <div className="text-center py-3 text-gray-400 text-sm">Searching...</div>}
              {addResults.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  onClick={() => addNCCandidate(m)}>
                  <img src={m.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=04003D&color=FF9700&size=200&bold=true`}
                    alt={m.name} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                  <div className="flex-1">
                    <div className="font-semibold text-navy text-sm">{m.name}</div>
                    <div className="text-xs text-gray-400">Year {m.year_of_study} · {m.ministry}</div>
                  </div>
                  <button className="btn-teal btn-sm text-xs" disabled={saving[m.id]}>
                    {saving[m.id] ? '...' : 'Add'}
                  </button>
                </div>
              ))}
              {addSearch.length >= 2 && !searching && addResults.length === 0 && (
                <div className="text-center py-3 text-gray-400 text-sm">No eligible members found</div>
              )}
            </div>
            <button onClick={() => { setShowAddModal(false); setAddSearch(''); setAddResults([]) }} className="btn-outline w-full justify-center">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function VettingForm({ candidateId, currentDecision, onSave, saving }) {
  const [decision, setDecision] = useState(currentDecision?.decision || '')
  const [reason, setReason] = useState(currentDecision?.reason || '')

  // Sync if parent updates decision
  useEffect(() => {
    setDecision(currentDecision?.decision || '')
    setReason(currentDecision?.reason || '')
  }, [currentDecision?.decision, currentDecision?.reason])

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { value: 'approved', label: 'Approve', icon: ThumbsUp, color: 'border-teal text-teal bg-teal/5' },
          { value: 'rejected', label: 'Reject', icon: ThumbsDown, color: 'border-red/30 text-red bg-red/5' },
          { value: 'deferred', label: 'Defer', icon: Clock, color: 'border-orange/30 text-orange bg-orange/5' },
        ].map(opt => (
          <button key={opt.value} onClick={() => setDecision(opt.value)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 text-xs font-montserrat font-bold transition-all ${decision === opt.value ? opt.color : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
            <opt.icon size={14} />
            {opt.label}
          </button>
        ))}
      </div>
      <input type="text" className="form-input text-xs" placeholder="Reason (optional for approve, recommended for reject)"
        value={reason} onChange={e => setReason(e.target.value)} />
      <button onClick={() => onSave(candidateId, decision, reason)}
        disabled={saving || !decision}
        className="btn-primary btn-sm w-full justify-center">
        {saving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : null}
        {saving ? 'Saving...' : decision ? `Save — ${decision.charAt(0).toUpperCase() + decision.slice(1)}` : 'Select a decision'}
      </button>
    </div>
  )
}