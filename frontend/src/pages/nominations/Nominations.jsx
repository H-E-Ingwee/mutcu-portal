import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Search, Send, MessageSquare, CheckCircle } from 'lucide-react'

export default function Nominations() {
  const { user } = useAuth()
  const [cycle, setCycle] = useState(null)
  const [positions, setPositions] = useState([])
  const [myRecs, setMyRecs] = useState([])
  const [selectedPosition, setSelectedPosition] = useState('')
  const [members, setMembers] = useState([])
  const [filteredMembers, setFilteredMembers] = useState([])
  const [search, setSearch] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [note, setNote] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState('system') // system | freetext
  const [freeText, setFreeText] = useState({ suggested_name: '', description: '', why_recommend: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/nominations/cycle'),
      api.get('/positions'),
      api.get('/nominations/my-recommendations'),
    ]).then(([cycleRes, posRes, recRes]) => {
      setCycle(cycleRes.data.cycle)
      setPositions(posRes.data.positions || [])
      setMyRecs(recRes.data.recommendations || [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedPosition) { setMembers([]); setFilteredMembers([]); setSelectedCandidate(null); return }
    setLoadingMembers(true)
    api.get(`/nominations/eligible/${selectedPosition}`)
      .then(r => { setMembers(r.data.members||[]); setFilteredMembers(r.data.members||[]) })
      .catch(() => toast.error('Could not load eligible members'))
      .finally(() => setLoadingMembers(false))
  }, [selectedPosition])

  useEffect(() => {
    if (!search) { setFilteredMembers(members); return }
    setFilteredMembers(members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || (m.ministry||'').toLowerCase().includes(search.toLowerCase())))
  }, [search, members])

  const alreadyRecommended = posId => myRecs.some(r => r.position_id === posId)

  const submitRecommendation = async e => {
    e.preventDefault()
    if (!selectedCandidate) return toast.error('Please select a candidate')
    setSubmitting(true)
    try {
      await api.post('/nominations/recommend', { cycle_id: cycle.id, position_id: selectedPosition, candidate_id: selectedCandidate.id, prayerful_note: note })
      toast.success('Recommendation submitted!')
      setMyRecs(prev => [...prev, { position_id: selectedPosition }])
      setSelectedPosition(''); setSelectedCandidate(null); setNote('')
    } catch (err) { toast.error(err.response?.data?.error || 'Submission failed') }
    finally { setSubmitting(false) }
  }

  const submitSuggestion = async e => {
    e.preventDefault()
    if (!freeText.suggested_name || !selectedPosition) return toast.error('Please fill in required fields')
    setSubmitting(true)
    try {
      await api.post('/nominations/suggest', { cycle_id: cycle.id, position_id: selectedPosition, ...freeText })
      toast.success('Suggestion submitted to the Nomination College!')
      setFreeText({ suggested_name: '', description: '', why_recommend: '' }); setSelectedPosition('')
    } catch (err) { toast.error(err.response?.data?.error || 'Submission failed') }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  if (!cycle || cycle.status !== 'nominations_open') {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="card p-8">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><MessageSquare size={24} className="text-gray-400" /></div>
          <h2 className="font-montserrat font-bold text-navy text-lg mb-2">Nominations Not Open</h2>
          <p className="text-gray-500 text-sm">{cycle ? `Current status: ${cycle.status?.replace(/_/g,' ')}` : 'No active nomination cycle at this time.'}</p>
        </div>
      </div>
    )
  }

  if (['nc_member','ec_admin','super_admin','cu_secretary'].includes(user?.role)) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="card p-8">
          <h2 className="font-montserrat font-bold text-navy text-lg mb-2">Not Eligible to Recommend</h2>
          <p className="text-gray-500 text-sm">NC members and administrators cannot submit recommendations.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Submit Recommendation</h1><p className="page-subtitle">{cycle.title} — Prayerfully recommend members for EC positions</p></div>
      </div>

      {myRecs.length > 0 && (
        <div className="alert-info mb-5">
          <CheckCircle size={16} />
          <div>You have recommended for: <strong>{myRecs.map(r => positions.find(p=>p.id===r.position_id)?.title||'').filter(Boolean).join(', ')}</strong></div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setMode('system')} className={`px-4 py-2 rounded-lg text-sm font-montserrat font-bold transition-all ${mode==='system' ? 'bg-navy text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>Browse Members</button>
        <button onClick={() => setMode('freetext')} className={`px-4 py-2 rounded-lg text-sm font-montserrat font-bold transition-all ${mode==='freetext' ? 'bg-navy text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>Suggest by Description</button>
      </div>

      {mode === 'system' ? (
        <div className="card">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Recommend a Member</h2></div>
          <div className="card-body">
            <form onSubmit={submitRecommendation} className="space-y-4">
              <div>
                <label className="form-label">Select Position *</label>
                <select className="form-select" value={selectedPosition} onChange={e => { setSelectedPosition(e.target.value); setSelectedCandidate(null); setSearch('') }}>
                  <option value="">Choose a position...</option>
                  {positions.map(p => <option key={p.id} value={p.id} disabled={alreadyRecommended(p.id)}>{p.title}{alreadyRecommended(p.id) ? ' (already recommended)' : ''}</option>)}
                </select>
              </div>

              {selectedPosition && (
                <>
                  <div>
                    <label className="form-label">Search Member</label>
                    <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" className="form-input pl-9" placeholder="Type name or ministry..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                  </div>

                  {loadingMembers ? (
                    <div className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange mx-auto" /></div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">No eligible members found for this position.</div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
                      {filteredMembers.map(m => (
                        <div key={m.id} onClick={() => setSelectedCandidate(m)} className={`member-photo-card ${selectedCandidate?.id === m.id ? 'selected' : ''}`}>
                          <img src={m.photo} alt={m.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 mx-auto mb-1.5" />
                          <div className="text-xs font-bold text-navy leading-tight">{m.name}</div>
                          <div className="text-xs text-gray-400">Yr {m.year_of_study}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedCandidate && (
                    <div className="flex items-center gap-3 bg-teal/5 border border-teal/30 rounded-lg p-3">
                      <img src={selectedCandidate.photo} alt={selectedCandidate.name} className="w-10 h-10 rounded-full object-cover border-2 border-teal" />
                      <div><div className="font-bold text-navy text-sm">{selectedCandidate.name}</div><div className="text-xs text-gray-400">Year {selectedCandidate.year_of_study} · {selectedCandidate.ministry}</div></div>
                    </div>
                  )}

                  <div>
                    <label className="form-label">Prayerful Note <span className="text-gray-400 normal-case font-normal">(optional, visible to NC only)</span></label>
                    <textarea className="form-input" rows={2} placeholder="Why do you recommend this person?" value={note} onChange={e => setNote(e.target.value)} />
                  </div>

                  <button type="submit" disabled={submitting || !selectedCandidate} className="btn-primary"><Send size={15} />{submitting ? 'Submitting...' : 'Submit Recommendation'}</button>
                </>
              )}
            </form>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Suggest by Description</h2></div>
          <div className="card-body">
            <p className="text-gray-500 text-sm mb-4">Know someone but can't find them? Describe them and the NC will evaluate your suggestion.</p>
            <form onSubmit={submitSuggestion} className="space-y-4">
              <div>
                <label className="form-label">Position *</label>
                <select className="form-select" value={selectedPosition} onChange={e => setSelectedPosition(e.target.value)} required>
                  <option value="">Choose a position...</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div><label className="form-label">Name (as you know them) *</label><input type="text" className="form-input" placeholder="e.g. John from Missions" value={freeText.suggested_name} onChange={e => setFreeText({...freeText, suggested_name: e.target.value})} required /></div>
              <div><label className="form-label">Description <span className="text-gray-400 normal-case font-normal">(optional)</span></label><textarea className="form-input" rows={2} placeholder="Year, ministry, physical description..." value={freeText.description} onChange={e => setFreeText({...freeText, description: e.target.value})} /></div>
              <div><label className="form-label">Why Recommend? <span className="text-gray-400 normal-case font-normal">(optional)</span></label><textarea className="form-input" rows={2} placeholder="Prayerful reason..." value={freeText.why_recommend} onChange={e => setFreeText({...freeText, why_recommend: e.target.value})} /></div>
              <button type="submit" disabled={submitting} className="btn-teal"><Send size={15} />{submitting ? 'Submitting...' : 'Submit Suggestion'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
