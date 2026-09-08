import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  Send, MessageSquare, AlertTriangle, ChevronRight, Users,
  Shield, Plus, X, Check, Trash2, Eye, Clock, Printer,
  CheckCircle, AlertCircle, Info
} from 'lucide-react'

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function DeadlineCountdown({ label, dateStr, urgentDays = 3 }) {
  if (!dateStr) return null
  const days = daysUntil(dateStr)
  if (days === null) return null
  const isPast = days < 0
  const isUrgent = days >= 0 && days <= urgentDays
  return (
    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-semibold ${isPast ? 'bg-gray-100 text-gray-400' : isUrgent ? 'bg-red/10 text-red' : 'bg-orange/10 text-orange'}`}>
      <Clock size={12} />
      {isPast ? `${label} passed` : days === 0 ? `${label} — TODAY` : `${label} in ${days} day${days !== 1 ? 's' : ''}`}
    </div>
  )
}

export default function NCDashboard() {
  const { user, isNCAction } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [dissolving, setDissolving] = useState(false)
  const [showByNom, setShowByNom] = useState(false)
  const [byNomForm, setByNomForm] = useState({ position_id: '', reason: 'vacancy', vacated_by: '' })
  const [saving, setSaving] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishSummary, setPublishSummary] = useState(null)
  const [loadingPublishSummary, setLoadingPublishSummary] = useState(false)
  const [printing, setPrinting] = useState(false)

  const canAct = isNCAction ? isNCAction() : false

  useEffect(() => {
    api.get('/nc/dashboard').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  const openPublishModal = async () => {
    if (!canAct && !['ec_admin', 'super_admin'].includes(user?.role)) return
    setLoadingPublishSummary(true)
    setShowPublishModal(true)
    try {
      const { data: summary } = await api.get(`/nc/publish-summary?cycle_id=${data.cycle.id}`)
      setPublishSummary(summary)
    } catch (err) {
      toast.error('Failed to load publish summary')
      setShowPublishModal(false)
    } finally { setLoadingPublishSummary(false) }
  }

  const publish = async () => {
    setPublishing(true)
    try {
      const { data: res } = await api.post('/nc/publish', { cycle_id: data.cycle.id })
      toast.success(res.message || 'Nominees published successfully! All members have been notified.')
      setData(prev => ({ ...prev, cycle: { ...prev.cycle, status: 'nominees_published' } }))
      setShowPublishModal(false)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to publish nominees') }
    finally { setPublishing(false) }
  }

  const dissolveNC = async () => {
    if (!window.confirm('Dissolve the Nomination College? All NC members will be returned to full member status. This should be done 21 days after the AGM as per the Constitution.')) return
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
    if (!window.confirm('Delete ALL nomination data for this cycle? This cannot be undone. Only do this after the AGM and commissioning.')) return
    try {
      await api.delete(`/nominations/data/${data.cycle.id}`)
      toast.success('Nomination data deleted')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const printFullReport = async () => {
    setPrinting(true)
    try {
      const { data: report } = await api.get('/nc/report')
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
        posHTML += `<div class="section-title">${posReport.position?.title || ''} (${decisions.length} candidate${decisions.length !== 1 ? 's' : ''})</div>`
        if (decisions.length === 0) {
          posHTML += '<div style="font-size:11px;color:#9CA3AF;margin-bottom:12px">No candidates vetted for this position.</div>'
          continue
        }
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
      const html = `<!DOCTYPE html><html><head><title>NC Full Vetting Report</title><style>${css}</style></head><body>
        <div class="header"><div><h1>MUTCU DMS — NC Full Vetting Report</h1><p>${report.cycle?.title || ''} · ${report.cycle?.spiritual_year || ''}</p></div>
        <div class="header-right">All Positions<br>Generated: ${date}<br>By: ${report.generatedBy || ''}</div></div>
        <div class="body">${posHTML}
        <div class="section-title">Nomination College Members</div>
        <div style="font-size:11px;color:#374151">${ncNames}</div>
        </div><div class="footer">MUTCU Digital Management System · portal.mutcu.org · Inspire Love, Hope &amp; Godliness</div></body></html>`

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
  if (!data?.cycle) return (
    <div className="max-w-lg mx-auto mt-12 text-center">
      <div className="card p-8"><h2 className="font-montserrat font-bold text-navy text-lg mb-2">No Active Cycle</h2><p className="text-gray-500 text-sm">The EC Admin will create a nomination cycle when ready.</p></div>
    </div>
  )

  const { cycle, positions, suggestionCount, objectionCount, publishedCount, ncMembers, byNominations } = data

  const cycleStatusLabel = {
    nominations_open: 'Nominations Open', vetting: 'NC Vetting',
    nominees_published: 'Nominees Published', objection_period: 'Objection Period',
    pre_agm: 'Pre-AGM', commissioned: 'Commissioned'
  }
  const statusColor = {
    nominations_open: 'bg-green-100 text-green-700', vetting: 'bg-orange/10 text-orange',
    nominees_published: 'bg-teal/10 text-teal', objection_period: 'bg-red/10 text-red'
  }

  const myNCRole = ncMembers?.find(m => m.user_id === user?.id)?.nc_role
  const roleLabel = myNCRole === 'chairperson' ? '🏛️ NC Chairperson' : myNCRole === 'secretary' ? '📋 NC Secretary' : '👁️ NC Member (View Only)'

  // Accurate stats
  const totalPositions = positions?.length || 0
  const positionsWithCandidates = (positions || []).filter(p => p.unique_candidates > 0).length
  const positionsFullyVetted = (positions || []).filter(p => p.unique_candidates > 0 && p.vetted_count >= p.unique_candidates).length
  const positionsApproved = (positions || []).filter(p => p.approved_count > 0).length
  const positionsNeedingVetting = (positions || []).filter(p => p.unique_candidates > 0 && p.approved_count === 0).length

  // Vetting progress across all positions
  const totalCandidatesAcrossAll = (positions || []).reduce((s, p) => s + (p.unique_candidates || 0), 0)
  const totalVettedAcrossAll = (positions || []).reduce((s, p) => s + Math.min(p.vetted_count || 0, p.unique_candidates || 0), 0)
  const vettingPct = totalCandidatesAcrossAll > 0 ? Math.round((totalVettedAcrossAll / totalCandidatesAcrossAll) * 100) : 0

  // By-nomination button: show during vetting, objection_period, or commissioned
  const canOpenByNom = canAct && ['vetting', 'objection_period', 'nominees_published', 'pre_agm', 'commissioned'].includes(cycle.status)

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
          <button onClick={printFullReport} disabled={printing} className="btn-outline btn-sm">
            <Printer size={14} />{printing ? 'Generating...' : 'Full Report'}
          </button>
          <Link to="/nc/suggestions" className="btn-outline btn-sm relative">
            <MessageSquare size={14} />Suggestions
            {suggestionCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-orange text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{suggestionCount}</span>}
          </Link>
          <Link to="/nc/objections" className="btn-outline btn-sm relative">
            <AlertTriangle size={14} />Objections
            {objectionCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{objectionCount}</span>}
          </Link>
          
          {/* Dissolve NC */}
          {(canAct || ['ec_admin', 'super_admin'].includes(user?.role)) && cycle.status === 'commissioned' && !cycle.nc_dissolution_date && (
            <button onClick={dissolveNC} disabled={dissolving} className="btn-outline btn-sm text-red border-red/30 hover:bg-red/5">
              <Shield size={14} />{dissolving ? 'Dissolving...' : 'Dissolve NC'}
            </button>
          )}
          {/* Delete nomination data */}
          {['super_admin', 'ec_admin', 'nc_chair'].includes(user?.role) && ['commissioned', 'cancelled'].includes(cycle.status) && (
            <button onClick={deleteNominationData} className="btn-outline btn-sm text-red border-red/30">
              <Trash2 size={14} />Delete Data
            </button>
          )}
        </div>
      </div>

      {/* Deadline countdowns */}
      {cycle.status === 'vetting' && (
        <div className="flex flex-wrap gap-2 mb-4">
          <DeadlineCountdown label="Nomination close" dateStr={cycle.nomination_close_date} />
          <DeadlineCountdown label="Publication date" dateStr={cycle.publication_date} urgentDays={5} />
        </div>
      )}
      {cycle.status === 'objection_period' && (
        <div className="flex flex-wrap gap-2 mb-4">
          <DeadlineCountdown label="Objection deadline" dateStr={cycle.objection_deadline} urgentDays={2} />
        </div>
      )}
      {cycle.status === 'pre_agm' && (
        <div className="flex flex-wrap gap-2 mb-4">
          <DeadlineCountdown label="AGM" dateStr={cycle.agm_date} urgentDays={7} />
        </div>
      )}

      {/* Status guide banners */}
      {cycle.status === 'nominations_open' && (
        <div className="card p-3 mb-4 bg-green-50 border border-green-200">
          <div className="text-green-700 text-sm font-semibold">📋 Nominations are open — members are submitting recommendations. Wait for the EC Admin to advance to Vetting stage.</div>
        </div>
      )}
      {cycle.status === 'vetting' && (
        <div className="card p-3 mb-4 bg-orange/5 border border-orange/20">
          <div className="text-orange text-sm">
            <strong>🔍 Vetting Stage:</strong> Review each position below, approve/reject candidates, then click <strong>Publish Nominees</strong> above when done.
            {vettingPct < 100 && <span className="ml-2 text-xs opacity-70">({vettingPct}% of candidates vetted)</span>}
          </div>
        </div>
      )}
      {cycle.status === 'nominees_published' && (
        <div className="card p-3 mb-4 bg-teal/5 border border-teal/20">
          <div className="text-teal text-sm font-semibold">✅ Nominees published! Members can now view nominees. EC Admin will advance to Objection Period.</div>
        </div>
      )}
      {cycle.status === 'objection_period' && (
        <div className="card p-3 mb-4 bg-red/5 border border-red/20">
          <div className="text-red text-sm font-semibold">⚖️ Objection Period — review and resolve any objections submitted by members. {objectionCount > 0 && `${objectionCount} pending.`}</div>
        </div>
      )}
      {cycle.status === 'pre_agm' && (
        <div className="card p-3 mb-4 bg-navy/5 border border-navy/20">
          <div className="text-navy text-sm font-semibold">🏛️ Pre-AGM — final nominee list confirmed. Prepare for the Annual General Meeting.</div>
        </div>
      )}

      {/* View-only notice */}
      {!canAct && !['ec_admin', 'super_admin'].includes(user?.role) && (
        <div className="card p-3 mb-4 bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 text-sm">
            <Eye size={16} />
            <span>You are an NC Member with <strong>view-only access</strong>. Only the NC Chairperson and Secretary can make vetting decisions.</span>
          </div>
        </div>
      )}

      {/* Overall vetting progress (only during vetting stage) */}
      {cycle.status === 'vetting' && totalCandidatesAcrossAll > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-montserrat font-bold text-navy">Overall Vetting Progress</span>
            <span className="text-sm font-bold text-orange">{totalVettedAcrossAll}/{totalCandidatesAcrossAll} candidates vetted</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange rounded-full transition-all" style={{ width: `${vettingPct}%` }} />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-400">
            <span className="text-green-600 font-semibold">✓ {positionsApproved}/{totalPositions} positions have approved nominees</span>
            {positionsNeedingVetting > 0 && <span className="text-red font-semibold">⚠ {positionsNeedingVetting} position{positionsNeedingVetting !== 1 ? 's' : ''} need vetting</span>}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Positions', value: totalPositions, color: 'text-navy', sub: `${positionsWithCandidates} with candidates` },
          { label: 'Positions Approved', value: positionsApproved, color: 'text-teal', sub: `of ${totalPositions} positions` },
          { label: 'Nominees Published', value: publishedCount, color: 'text-orange', sub: 'active nominees' },
          { label: 'Pending Objections', value: objectionCount, color: objectionCount > 0 ? 'text-red' : 'text-gray-400', sub: 'unresolved' },
        ].map((s, i) => (
          <div key={i} className="card p-4 text-center">
            <div className={`text-2xl font-montserrat font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs font-montserrat font-semibold text-gray-400 uppercase tracking-wide mt-1">{s.label}</div>
            <div className="text-xs text-gray-300 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions Grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(positions || []).map(pos => {
              const isFullyVetted = pos.unique_candidates > 0 && (pos.vetted_count || 0) >= pos.unique_candidates
              const hasApproved = pos.approved_count > 0
              return (
                <Link key={pos.id} to={`/nc/position/${pos.id}`}
                  className="card p-4 hover:border-orange/30 hover:shadow-md transition-all border border-transparent group">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-montserrat font-bold text-navy text-sm">{pos.title}</div>
                      {pos.gender_constraint && <div className="text-xs text-gray-400">{pos.gender_constraint} only</div>}
                    </div>
                    <div className="flex items-center gap-1">
                      {isFullyVetted && hasApproved && <CheckCircle size={14} className="text-teal" />}
                      {pos.unique_candidates > 0 && !hasApproved && <AlertCircle size={14} className="text-orange" />}
                      {pos.unique_candidates === 0 && <Info size={14} className="text-gray-300" />}
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-orange transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span><Users size={11} className="inline mr-1" />{pos.recommendation_count} recommendations</span>
                      <span>{pos.unique_candidates} candidate{pos.unique_candidates !== 1 ? 's' : ''}</span>
                    </div>
                    {/* Vetting progress per position */}
                    {pos.unique_candidates > 0 && (
                      <div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange rounded-full" style={{ width: `${Math.min(((pos.vetted_count || 0) / pos.unique_candidates) * 100, 100)}%` }} />
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{pos.vetted_count || 0}/{pos.unique_candidates} vetted</div>
                      </div>
                    )}
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
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* NC Members */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-montserrat font-bold text-navy text-sm">NC Members ({ncMembers?.length || 0})</h2>
            </div>
            <div>
              {(ncMembers || []).map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 last:border-0">
                  <img src={m.user?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user?.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`}
                    alt="" className="w-7 h-7 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy truncate">{m.user?.name}</div>
                    <div className="text-xs text-gray-400 capitalize">{m.nc_role}</div>
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
              {canOpenByNom && (
                <button onClick={() => setShowByNom(true)} className="btn-outline btn-sm text-xs"><Plus size={12} />Open</button>
              )}
            </div>
            <div>
              {(byNominations || []).length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">No by-nominations</div>
              ) : (byNominations || []).map(bn => (
                <div key={bn.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="font-semibold text-navy text-sm">{bn.position?.title}</div>
                  <div className="text-xs text-gray-400 capitalize">Reason: {bn.reason} · Status: {bn.status}</div>
                  {bn.objection_deadline && (
                    <div className="text-xs text-orange">Objection deadline: {new Date(bn.objection_deadline).toLocaleDateString('en-GB')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Publish Summary Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">Publish Nominees — Review</h3>
              <button onClick={() => setShowPublishModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {loadingPublishSummary ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange" />
                <span className="ml-3 text-gray-500 text-sm">Loading summary...</span>
              </div>
            ) : publishSummary ? (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-teal/10 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-teal">{publishSummary.totalApproved}</div>
                    <div className="text-xs text-teal font-semibold">Nominees</div>
                  </div>
                  <div className="bg-navy/5 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-navy">{publishSummary.totalPositions}</div>
                    <div className="text-xs text-navy font-semibold">Positions</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${publishSummary.positionsWithGaps?.length > 0 ? 'bg-red/10' : 'bg-green-50'}`}>
                    <div className={`text-xl font-bold ${publishSummary.positionsWithGaps?.length > 0 ? 'text-red' : 'text-green-600'}`}>
                      {publishSummary.positionsWithGaps?.length || 0}
                    </div>
                    <div className={`text-xs font-semibold ${publishSummary.positionsWithGaps?.length > 0 ? 'text-red' : 'text-green-600'}`}>Gaps</div>
                  </div>
                </div>

                {/* Gaps warning */}
                {publishSummary.positionsWithGaps?.length > 0 && (
                  <div className="bg-red/5 border border-red/20 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-red flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-red text-sm font-bold mb-1">⚠ {publishSummary.positionsWithGaps.length} position{publishSummary.positionsWithGaps.length !== 1 ? 's' : ''} have no approved nominee:</div>
                        <ul className="text-red text-xs space-y-0.5">
                          {publishSummary.positionsWithGaps.map((p, i) => <li key={i}>• {p}</li>)}
                        </ul>
                        <div className="text-red/70 text-xs mt-2">These positions will have no nominees published. Consider vetting more candidates or opening a By-Nomination.</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Position breakdown */}
                <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
                  {(publishSummary.summary || []).map((p, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${p.has_gap ? 'bg-red/5' : 'bg-green-50'}`}>
                      <span className={`font-semibold ${p.has_gap ? 'text-red' : 'text-green-700'}`}>{p.position?.title}</span>
                      <span className={`text-xs font-bold ${p.has_gap ? 'text-red' : 'text-green-600'}`}>
                        {p.has_gap ? '✗ No nominee' : `✓ ${p.approved_count} nominee${p.approved_count !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-orange/5 border border-orange/20 rounded-lg p-3 mb-5 text-xs text-orange">
                  <strong>Note:</strong> Publishing will send email notifications to all members and cannot be undone. The cycle status will advance to "Nominees Published".
                </div>

                <div className="flex gap-3">
                  <button onClick={publish} disabled={publishing} className="btn-primary flex-1 justify-center">
                    <Send size={15} />{publishing ? 'Publishing...' : 'Confirm & Publish'}
                  </button>
                  <button onClick={() => setShowPublishModal(false)} className="btn-outline flex-1 justify-center">Cancel</button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

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
                  <option value="withdrawal">Nominee Withdrawal</option>
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