import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, ThumbsUp, ThumbsDown, Clock, UserPlus, Sparkles, Printer } from 'lucide-react'

export default function NCPosition() {
  const { positionId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addResults, setAddResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    api.get(`/nc/position/${positionId}`).then(r => setData(r.data)).finally(() => setLoading(false))
  }, [positionId])

  const saveDecision = async (candidateId, decision, reason) => {
    setSaving(prev => ({ ...prev, [candidateId]: true }))
    try {
      await api.post('/nc/vet', {
        cycle_id: data.cycle.id, position_id: positionId,
        candidate_id: candidateId, decision, reason
      })
      toast.success('Decision saved')
      setData(prev => ({
        ...prev,
        decisions: [
          ...(prev.decisions||[]).filter(d => d.candidate_id !== candidateId),
          { candidate_id: candidateId, decision, reason }
        ]
      }))
    } catch (err) { toast.error('Failed to save') }
    finally { setSaving(prev => ({ ...prev, [candidateId]: false })) }
  }

  const searchMembers = async (q) => {
    if (!q || q.length < 2) { setAddResults([]); return }
    setSearching(true)
    try {
      const { data: res } = await api.get(`/nominations/eligible/${positionId}`)
      const filtered = (res.members||[]).filter(m =>
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        (m.ministry||'').toLowerCase().includes(q.toLowerCase())
      )
      setAddResults(filtered.slice(0, 8))
    } catch {} finally { setSearching(false) }
  }

  const [aiSummaries, setAiSummaries] = useState({})
  const [loadingAI, setLoadingAI] = useState({})

  const getAISummary = async (candidate) => {
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

  const buildReportHTML = (report, posReport) => {
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const css = '* { margin:0;padding:0;box-sizing:border-box; } body { font-family:Arial,sans-serif;color:#1a1a2e;background:#fff; } .header { background:linear-gradient(135deg,#04003D,#0a0060);color:white;padding:24px 40px;display:flex;justify-content:space-between;align-items:center; } .header h1 { font-size:20px;font-weight:800;color:#FF9700; } .header p { font-size:10px;color:rgba(255,255,255,0.5);margin-top:3px; } .header-right { text-align:right;font-size:10px;color:rgba(255,255,255,0.5); } .body { padding:28px 40px; } .section-title { font-size:13px;font-weight:800;color:#04003D;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #FF9700;padding-bottom:6px;margin:20px 0 14px; } .candidate { border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:12px;page-break-inside:avoid; } .candidate-header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px; } .candidate-name { font-size:14px;font-weight:800;color:#04003D; } .badge { display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700; } .badge-approved { background:#D1FAE5;color:#065F46; } .badge-rejected { background:#FEE2E2;color:#991B1B; } .badge-deferred { background:#FEF3C7;color:#92400E; } .badge-pending { background:#F3F4F6;color:#6B7280; } .ai-summary { background:#F0F4FF;border-left:3px solid #FF9700;padding:8px 12px;margin-top:8px;font-size:10px;color:#374151;line-height:1.6; } .footer { background:#F5F7FA;padding:14px 40px;text-align:center;font-size:9px;color:#9CA3AF;border-top:1px solid #E5E7EB;margin-top:32px; } @media print { body { -webkit-print-color-adjust:exact;print-color-adjust:exact; } }'

    let candidatesHTML = ''
    const decisions = posReport.decisions || []
    for (let i = 0; i < decisions.length; i++) {
      const d = decisions[i]
      const decClass = d.decision === 'approved' ? 'badge-approved' : d.decision === 'rejected' ? 'badge-rejected' : d.decision === 'deferred' ? 'badge-deferred' : 'badge-pending'
      const decLabel = d.decision ? (d.decision.charAt(0).toUpperCase() + d.decision.slice(1)) : 'Pending'
      const recCount = d.recommendation_count || 0
      candidatesHTML += '<div class="candidate">'
      candidatesHTML += '<div class="candidate-header">'
      candidatesHTML += '<div>'
      candidatesHTML += '<div class="candidate-name">' + (d.candidate?.name || '') + '</div>'
      candidatesHTML += '<div style="font-size:10px;color:#6B7280;margin-top:2px">' + (d.candidate?.mutcu_number || '') + ' &middot; Year ' + (d.candidate?.year_of_study || '?') + ' &middot; ' + (d.candidate?.primary_ministry || 'General') + ' &middot; ' + (d.candidate?.gender || '') + '</div>'
      candidatesHTML += '</div>'
      candidatesHTML += '<div style="text-align:right"><span class="badge ' + decClass + '">' + decLabel + '</span>'
      candidatesHTML += '<div style="font-size:9px;color:#6B7280;margin-top:4px">' + recCount + ' recommendation' + (recCount !== 1 ? 's' : '') + '</div></div>'
      candidatesHTML += '</div>'
      if (d.reason) candidatesHTML += '<div style="font-size:10px;color:#374151;margin-bottom:6px"><strong>NC Reason:</strong> ' + d.reason + '</div>'
      if (d.ai_summary) candidatesHTML += '<div class="ai-summary"><strong>AI Summary:</strong> ' + d.ai_summary + '</div>'
      candidatesHTML += '</div>'
    }

    const ncNames = (report.ncMembers || []).map(function(m) { return m.user?.name || '' }).join(', ') || 'Not recorded'

    return '<!DOCTYPE html><html><head><title>NC Vetting Report</title><style>' + css + '</style></head><body>'
      + '<div class="header"><div><h1>MUTCU DMS &mdash; NC Vetting Report</h1><p>' + (report.cycle?.title || '') + ' &middot; ' + (report.cycle?.spiritual_year || '') + '</p></div>'
      + '<div class="header-right">Position: <strong style="color:#FF9700">' + (posReport.position?.title || '') + '</strong><br>Generated: ' + date + '<br>By: ' + (report.generatedBy || '') + '</div></div>'
      + '<div class="body"><div class="section-title">Candidates (' + decisions.length + ')</div>'
      + candidatesHTML
      + '<div class="section-title">NC Members</div><div style="font-size:11px;color:#374151">' + ncNames + '</div>'
      + '</div><div class="footer">MUTCU Digital Management System &middot; portal.mutcu.org &middot; Inspire Love, Hope &amp; Godliness</div>'
      + '</body></html>'
  }

  const printReport = async () => {
    try {
      const { data: report } = await api.get('/nc/report')
      const posReport = report.positions?.find(function(p) { return p.position?.id === positionId })
      if (!posReport) return toast.error('No report data for this position')
      const html = buildReportHTML(report, posReport)
      const win = window.open('', '_blank')
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(function() { win.print() }, 500)
    } catch (err) {
      toast.error('Failed to generate report')
    }
  }

  const addNCCandidate = async (member) => {
    setSaving(prev => ({ ...prev, [member.id]: true }))
    try {
      await api.post('/nc/vet', {
        cycle_id: data.cycle.id, position_id: positionId,
        candidate_id: member.id, decision: 'deferred',
        reason: 'Added by NC — not in member recommendations'
      })
      toast.success(`${member.name} added to vetting list`)
      // Add to candidates list
      setData(prev => ({
        ...prev,
        candidates: [...(prev.candidates||[]), { ...member, recommendation_count: 0, recommendations: [], eligibility: { eligible: true, checks: [] } }],
        decisions: [...(prev.decisions||[]), { candidate_id: member.id, decision: 'deferred', reason: 'Added by NC' }]
      }))
      setShowAddModal(false)
      setAddSearch('')
      setAddResults([])
    } catch (err) { toast.error('Failed to add') }
    finally { setSaving(prev => ({ ...prev, [member.id]: false })) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>
  if (!data) return null

  const { cycle, position, candidates, decisions } = data
  const getDecision = id => decisions?.find(d => d.candidate_id === id)
  const maxCount = Math.max(...(candidates||[]).map(c => c.recommendation_count||0), 1)

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
            {candidates?.length||0} candidates · {candidates?.reduce((s,c)=>s+(c.recommendation_count||0),0)} total recommendations
            {position?.gender_constraint && <span className="badge badge-navy ml-2">{position.gender_constraint} only</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={printReport} className="btn-outline btn-sm">
            <Printer size={14} />Print Report
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-outline btn-sm">
            <UserPlus size={14} />Add Candidate (NC)
          </button>
        </div>
      </div>

      {/* Tally Overview */}
      {candidates?.length > 0 && (
        <div className="card mb-6">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Recommendation Tally</h2></div>
          <div className="card-body space-y-3">
            {[...(candidates||[])].sort((a,b)=>(b.recommendation_count||0)-(a.recommendation_count||0)).map((c,i) => {
              const pct = maxCount > 0 ? ((c.recommendation_count||0)/maxCount)*100 : 0
              const decision = getDecision(c.id)
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-navy">{i+1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-navy">{c.name}</span>
                      <div className="flex items-center gap-2">
                        {decision && <span className={`badge text-xs ${decision.decision==='approved'?'badge-teal':decision.decision==='rejected'?'badge-red':'badge-orange'}`}>{decision.decision}</span>}
                        <span className="text-xs font-bold text-gray-500">{c.recommendation_count||0} rec{(c.recommendation_count||0)!==1?'s':''}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${decision?.decision==='approved'?'bg-teal':decision?.decision==='rejected'?'bg-red/50':'bg-orange'}`}
                        style={{width:`${pct}%`}} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Detailed Candidate Cards */}
      {[...(candidates||[])].sort((a,b)=>(b.recommendation_count||0)-(a.recommendation_count||0)).map(candidate => {
        const decision = getDecision(candidate.id)
        const photoUrl = candidate.photo_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`
        const elig = candidate.eligibility || {}
        const isNCAdded = candidate.recommendation_count === 0

        return (
          <div key={candidate.id} className={`card mb-4 ${decision?.decision==='approved'?'border-l-4 border-teal':decision?.decision==='rejected'?'border-l-4 border-red/30':''}`}>
            <div className="card-body">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="relative flex-shrink-0">
                  <img src={photoUrl} alt={candidate.name} className="w-16 h-16 rounded-full object-cover border-2 border-orange" />
                  {isNCAdded && (
                    <div className="absolute -bottom-1 -right-1 bg-navy text-white text-xs rounded-full px-1.5 py-0.5 font-bold">NC</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-montserrat font-bold text-navy text-base mb-0.5">{candidate.name}</div>
                  <div className="text-gray-400 text-xs mb-2">
                    Year {candidate.year_of_study} · {candidate.primary_ministry||'General'} · {candidate.mutcu_number}
                  </div>

                  {/* Recommendation count badge */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {isNCAdded ? (
                      <span className="badge badge-navy">Added by NC</span>
                    ) : (
                      <span className="badge badge-orange font-bold">{candidate.recommendation_count} member recommendation{candidate.recommendation_count!==1?'s':''}</span>
                    )}
                    {elig.eligible
                      ? <span className="badge badge-teal">All checks passed</span>
                      : <span className="badge badge-red">Eligibility issues</span>}
                  </div>

                  {/* Eligibility checks */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(elig.checks||[]).map((check,i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded font-montserrat font-semibold ${check.passed?'bg-green-100 text-green-700':'bg-red/10 text-red'}`}>
                        {check.passed?'✓':'✗'} {check.label}
                      </span>
                    ))}
                  </div>

                  
                </div>

                {/* Decision Panel */}
                <div className="w-full sm:w-56 flex-shrink-0">
                  {decision && (
                    <div className={`rounded-lg p-3 mb-3 text-xs font-montserrat font-bold border ${decisionColors[decision.decision]||'bg-gray-50 border-gray-200 text-gray-600'}`}>
                      Decision: {decision.decision.charAt(0).toUpperCase()+decision.decision.slice(1)}
                      {decision.reason && <div className="font-normal mt-0.5 text-xs opacity-80">{decision.reason}</div>}
                    </div>
                  )}
                  <VettingForm
                    candidateId={candidate.id}
                    currentDecision={decision}
                    onSave={saveDecision}
                    saving={saving[candidate.id]}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {candidates?.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-gray-400 text-sm">No recommendations for this position yet.</div>
          <button onClick={() => setShowAddModal(true)} className="btn-outline btn-sm mt-3 mx-auto">
            <UserPlus size={14} />Add a candidate as NC
          </button>
        </div>
      )}

      {/* Add NC Candidate Modal */}
      {showAddModal && (
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
                  <img src={m.photo} alt={m.name} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                  <div className="flex-1">
                    <div className="font-semibold text-navy text-sm">{m.name}</div>
                    <div className="text-xs text-gray-400">Year {m.year_of_study} · {m.ministry}</div>
                  </div>
                  <button className="btn-teal btn-sm text-xs">Add</button>
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
  const [decision, setDecision] = useState(currentDecision?.decision||'')
  const [reason, setReason] = useState(currentDecision?.reason||'')

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { value: 'approved', label: 'Approve', icon: ThumbsUp, color: 'border-teal text-teal bg-teal/5' },
          { value: 'rejected', label: 'Reject', icon: ThumbsDown, color: 'border-red/30 text-red bg-red/5' },
          { value: 'deferred', label: 'Defer', icon: Clock, color: 'border-orange/30 text-orange bg-orange/5' },
        ].map(opt => (
          <button key={opt.value} onClick={() => setDecision(opt.value)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 text-xs font-montserrat font-bold transition-all ${decision===opt.value ? opt.color : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
            <opt.icon size={14} />
            {opt.label}
          </button>
        ))}
      </div>
      <input type="text" className="form-input text-xs" placeholder="Reason (optional)"
        value={reason} onChange={e => setReason(e.target.value)} />
      <button onClick={() => onSave(candidateId, decision, reason)}
        disabled={saving||!decision}
        className="btn-primary btn-sm w-full justify-center">
        {saving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : null}
        {saving ? 'Saving...' : 'Save Decision'}
      </button>
    </div>
  )
}
