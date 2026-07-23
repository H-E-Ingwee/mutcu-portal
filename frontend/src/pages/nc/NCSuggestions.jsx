import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Search, UserCheck, UserX, HelpCircle, X } from 'lucide-react'

export default function NCSuggestions() {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [linkModal, setLinkModal] = useState(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [processing, setProcessing] = useState({})

  useEffect(() => {
    api.get('/nc/suggestions').then(r => setSuggestions(r.data.suggestions||[])).finally(() => setLoading(false))
  }, [])

  const doAction = async (id, action, notes='') => {
    setProcessing(prev => ({...prev, [id]: true}))
    try {
      await api.post(`/nc/suggestions/${id}/action`, { action, nc_notes: notes })
      toast.success('Suggestion updated')
      setSuggestions(prev => prev.map(s => s.id===id ? {...s, nc_action: action} : s))
    } catch { toast.error('Failed to update') }
    finally { setProcessing(prev => ({...prev, [id]: false})) }
  }

  const searchMembers = async (q) => {
    if (!q || q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const { data } = await api.get(`/nominations/eligible/${linkModal.position_id}`)
      const filtered = (data.members||[]).filter(m =>
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        (m.ministry||'').toLowerCase().includes(q.toLowerCase())
      )
      setSearchResults(filtered.slice(0,6))
    } catch {} finally { setSearching(false) }
  }

  const linkToMember = async (suggestion, member) => {
    setProcessing(prev => ({...prev, [suggestion.id]: true}))
    try {
      await api.post(`/nc/suggestions/${suggestion.id}/action`, {
        action: 'linked',
        nc_notes: `Linked to ${member.name} (${member.mutcu_number})`
      })
      toast.success(`Suggestion linked to ${member.name}`)
      setSuggestions(prev => prev.map(s => s.id===suggestion.id ? {...s, nc_action:'linked', linked_name: member.name} : s))
      setLinkModal(null)
      setSearchQ('')
      setSearchResults([])
    } catch { toast.error('Failed to link') }
    finally { setProcessing(prev => ({...prev, [suggestion.id]: false})) }
  }

  const actionConfig = {
    pending: { label: 'Pending Review', color: 'badge-orange' },
    linked: { label: 'Linked to Member', color: 'badge-teal' },
    known: { label: 'Known — Investigating', color: 'badge-navy' },
    not_known: { label: 'Not Known', color: 'badge-gray' },
    dismissed: { label: 'Dismissed', color: 'badge-gray' },
    unidentifiable: { label: 'Unidentifiable', color: 'badge-red' },
  }

  // Group by position
  const byPosition = {}
  suggestions.forEach(s => {
    const key = s.position?.title || 'Unknown'
    if (!byPosition[key]) byPosition[key] = []
    byPosition[key].push(s)
  })

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/nc" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2"><ArrowLeft size={12} />Back</Link>
          <h1 className="page-title">Member Suggestions</h1>
          <p className="page-subtitle">{suggestions.length} suggestions · {suggestions.filter(s=>s.nc_action==='pending').length} pending review</p>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="card p-10 text-center"><div className="text-gray-400 text-sm">No free-text suggestions submitted.</div></div>
      ) : (
        Object.entries(byPosition).map(([posTitle, posSuggestions]) => (
          <div key={posTitle} className="card mb-5">
            <div className="card-header">
              <h2 className="font-montserrat font-bold text-navy text-sm">{posTitle}</h2>
              <span className="badge badge-navy">{posSuggestions.length} suggestions</span>
            </div>
            <div className="divide-y divide-gray-50">
              {posSuggestions.map(s => (
                <div key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-navy text-sm">"{s.suggested_name}"</span>
                        <span className={`badge ${actionConfig[s.nc_action]?.color||'badge-gray'}`}>
                          {actionConfig[s.nc_action]?.label||s.nc_action}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mb-1">Suggested by: {s.suggester?.name}</div>
                      {s.description && <div className="text-xs text-gray-500 italic mb-1">Description: {s.description}</div>}
                      {s.why_recommend && <div className="text-xs text-gray-500 mb-1">Why: {s.why_recommend}</div>}
                      {s.nc_notes && <div className="text-xs text-teal font-semibold">NC Note: {s.nc_notes}</div>}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => { setLinkModal(s); setSearchQ(''); setSearchResults([]) }}
                        disabled={!!processing[s.id]}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-teal/30 text-teal bg-teal/5 text-xs font-semibold hover:bg-teal/10 transition-all">
                        <UserCheck size={12} />Known — Link
                      </button>
                      <button onClick={() => doAction(s.id, 'not_known')}
                        disabled={!!processing[s.id]}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50 transition-all">
                        <HelpCircle size={12} />Not Known
                      </button>
                      <button onClick={() => doAction(s.id, 'unidentifiable')}
                        disabled={!!processing[s.id]}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red/20 text-red text-xs font-semibold hover:bg-red/5 transition-all">
                        <UserX size={12} />Unidentifiable
                      </button>
                      <button onClick={() => doAction(s.id, 'dismissed')}
                        disabled={!!processing[s.id]}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-400 text-xs font-semibold hover:bg-gray-50 transition-all">
                        <X size={12} />Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Link to Member Modal */}
      {linkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="font-montserrat font-bold text-navy mb-1">Link Suggestion to Member</h3>
            <p className="text-gray-500 text-sm mb-4">
              Suggestion: <strong>"{linkModal.suggested_name}"</strong><br/>
              Search for the actual member in the system:
            </p>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" className="form-input pl-9" placeholder="Search by name or ministry..."
                value={searchQ} onChange={e => { setSearchQ(e.target.value); searchMembers(e.target.value) }} autoFocus />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
              {searching && <div className="text-center py-3 text-gray-400 text-sm">Searching...</div>}
              {searchResults.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-teal/30"
                  onClick={() => linkToMember(linkModal, m)}>
                  <img src={m.photo} alt={m.name} className="w-9 h-9 rounded-full object-cover" />
                  <div className="flex-1">
                    <div className="font-semibold text-navy text-sm">{m.name}</div>
                    <div className="text-xs text-gray-400">Year {m.year_of_study} · {m.ministry}</div>
                  </div>
                  <span className="text-xs text-teal font-bold">Link →</span>
                </div>
              ))}
              {searchQ.length >= 2 && !searching && searchResults.length === 0 && (
                <div className="text-center py-3 text-gray-400 text-sm">No eligible members found</div>
              )}
            </div>
            <button onClick={() => { setLinkModal(null); setSearchQ(''); setSearchResults([]) }} className="btn-outline w-full justify-center">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
