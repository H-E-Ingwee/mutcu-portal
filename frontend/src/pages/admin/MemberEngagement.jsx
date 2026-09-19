import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Users, TrendingUp, AlertTriangle, CheckCircle, XCircle, Search, Download, RefreshCw, BarChart3 } from 'lucide-react'

const TIERS = {
  highly_engaged: { label: '🔥 Highly Engaged', color: 'text-teal', bg: 'bg-teal/10', border: 'border-teal/30', min: 80 },
  active:         { label: '✅ Active',          color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', min: 60 },
  moderate:       { label: '🟡 Moderate',        color: 'text-orange', bg: 'bg-orange/10', border: 'border-orange/30', min: 40 },
  low:            { label: '⚠️ Low',             color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', min: 20 },
  inactive:       { label: '❌ Inactive',         color: 'text-red', bg: 'bg-red/10', border: 'border-red/30', min: 0 },
}

const SCORE_COLOR = (score) =>
  score >= 80 ? 'bg-teal' : score >= 60 ? 'bg-green-500' : score >= 40 ? 'bg-orange' : score >= 20 ? 'bg-yellow-400' : 'bg-red'

export default function MemberEngagement() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState('')
  const [filterMinistry, setFilterMinistry] = useState('')
  const [sortBy, setSortBy] = useState('score')
  const [aiInsight, setAiInsight] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/analytics/engagement')
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load engagement data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const getAIInsight = async () => {
    if (!data) return
    setLoadingAI(true)
    try {
      const res = await api.post('/ai/admin/engagement-analysis', {
        tier_counts: data.tier_counts,
        avg_score: data.avg_score,
        total: data.total,
        low_engagement: data.members.filter(m => m.tier === 'low' || m.tier === 'inactive').length,
      })
      setAiInsight(res.data.analysis)
    } catch { toast.error('AI analysis failed') }
    finally { setLoadingAI(false) }
  }

  const exportCSV = () => {
    if (!data) return
    const headers = ['Name', 'MUTCU Number', 'Ministry', 'Year', 'Score', 'Tier', 'Attendance', 'Nominations', 'RSVPs', 'Profile Complete', 'Faith Renewed']
    const rows = filtered.map(m => [
      m.name, m.mutcu_number || '', m.primary_ministry || 'General', m.year_of_study || '',
      m.score, TIERS[m.tier]?.label || m.tier,
      m.attendance_count, m.nomination_count, m.rsvp_count,
      m.profile_complete ? 'Yes' : 'No', m.faith_renewed ? 'Yes' : 'No',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'MUTCU-Engagement.csv'; a.click()
  }

  const ministries = data ? [...new Set(data.members.map(m => m.primary_ministry).filter(Boolean))].sort() : []

  const filtered = (data?.members || []).filter(m => {
    const q = search.toLowerCase()
    return (
      (!search || m.name?.toLowerCase().includes(q) || m.mutcu_number?.toLowerCase().includes(q)) &&
      (!filterTier || m.tier === filterTier) &&
      (!filterMinistry || m.primary_ministry === filterMinistry)
    )
  }).sort((a, b) => {
    if (sortBy === 'score') return b.score - a.score
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'attendance') return b.attendance_count - a.attendance_count
    return 0
  })

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Member Engagement</h1>
          <p className="page-subtitle">Engagement scores based on attendance, nominations, RSVPs, and activity</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline btn-sm"><RefreshCw size={13} /> Refresh</button>
          <button onClick={exportCSV} className="btn-outline btn-sm"><Download size={13} /> Export CSV</button>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {Object.entries(TIERS).map(([key, cfg]) => (
            <button key={key} onClick={() => setFilterTier(filterTier === key ? '' : key)}
              className={`card p-3 text-center cursor-pointer transition-all hover:shadow-md ${filterTier === key ? `border-2 ${cfg.border}` : ''}`}>
              <div className={`text-2xl font-montserrat font-bold ${cfg.color}`}>{data.tier_counts[key] || 0}</div>
              <div className="text-xs text-gray-400 mt-0.5 leading-tight">{cfg.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Average Score */}
      {data && (
        <div className="card p-4 mb-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Average Engagement Score</div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-montserrat font-bold text-navy">{data.avg_score}<span className="text-lg text-gray-400">/100</span></div>
                  <div className="flex-1 w-32 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full ${SCORE_COLOR(data.avg_score)}`} style={{ width: `${data.avg_score}%` }} />
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400 border-l border-gray-100 pl-4">
                <div>{data.total} active members</div>
                <div className="text-teal font-semibold">{data.tier_counts.highly_engaged + data.tier_counts.active} engaged ({Math.round(((data.tier_counts.highly_engaged + data.tier_counts.active) / data.total) * 100)}%)</div>
                <div className="text-red font-semibold">{data.tier_counts.inactive} inactive</div>
              </div>
            </div>
            <button onClick={getAIInsight} disabled={loadingAI}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50">
              {loadingAI ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : '✨'}
              {loadingAI ? 'Analyzing...' : 'AI Insight'}
            </button>
          </div>

          {/* AI Insight */}
          {aiInsight && (
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-2">✨ AI Engagement Analysis</div>
              {aiInsight.split('\n').filter(p => p.trim()).map((para, i) => (
                <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2">{para}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-8 py-1.5 text-sm" placeholder="Search by name or MUTCU number..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select text-sm py-1.5" value={filterMinistry} onChange={e => setFilterMinistry(e.target.value)}>
          <option value="">All Ministries</option>
          {ministries.map(m => <option key={m} value={m}>{m.replace(' Ministry', '')}</option>)}
        </select>
        <select className="form-select text-sm py-1.5" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="score">Sort: Score</option>
          <option value="name">Sort: Name</option>
          <option value="attendance">Sort: Attendance</option>
        </select>
        {(search || filterTier || filterMinistry) && (
          <button onClick={() => { setSearch(''); setFilterTier(''); setFilterMinistry('') }}
            className="btn-outline btn-sm text-xs">Clear</button>
        )}
        <span className="text-xs text-gray-400 self-center">{filtered.length} members</span>
      </div>

      {/* Member Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Member</th>
                <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Score</th>
                <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Tier</th>
                <th className="text-center px-3 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Attend</th>
                <th className="text-center px-3 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Nominate</th>
                <th className="text-center px-3 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">RSVP</th>
                <th className="text-center px-3 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Profile</th>
                <th className="text-center px-3 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Faith</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No members found</td></tr>
              ) : filtered.map(m => {
                const tier = TIERS[m.tier] || TIERS.inactive
                return (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=04003D&color=FF9700&size=40&bold=true`}
                          alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-navy text-sm">{m.name}</div>
                          <div className="text-xs text-gray-400">{m.primary_ministry?.replace(' Ministry', '') || 'General'} · Year {m.year_of_study}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className={`h-full rounded-full ${SCORE_COLOR(m.score)}`} style={{ width: `${m.score}%` }} />
                        </div>
                        <span className={`text-sm font-bold ${tier.color}`}>{m.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${tier.color} ${tier.bg} ${tier.border}`}>
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-sm font-bold ${m.attendance_count > 0 ? 'text-teal' : 'text-gray-300'}`}>{m.attendance_count}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {m.nomination_count > 0 ? <CheckCircle size={16} className="text-teal mx-auto" /> : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-sm font-bold ${m.rsvp_count > 0 ? 'text-orange' : 'text-gray-300'}`}>{m.rsvp_count || '—'}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {m.profile_complete ? <CheckCircle size={16} className="text-teal mx-auto" /> : <XCircle size={16} className="text-gray-300 mx-auto" />}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {m.faith_renewed ? <CheckCircle size={16} className="text-teal mx-auto" /> : <XCircle size={16} className="text-red mx-auto" />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score breakdown legend */}
      <div className="card p-4 mt-4 bg-navy/5 border border-navy/10">
        <div className="text-xs font-semibold text-navy mb-2">How scores are calculated:</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs text-gray-500">
          {[
            ['Profile complete', '+10 pts'],
            ['Faith declaration renewed', '+15 pts'],
            ['Each service attended', '+5 pts (max 30)'],
            ['Nomination submitted', '+20 pts'],
            ['Each RSVP', '+5 pts (max 10)'],
            ['Recent activity (30 days)', '+10 pts'],
          ].map(([label, pts]) => (
            <div key={label} className="flex justify-between gap-2">
              <span>{label}</span>
              <span className="font-semibold text-orange">{pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}