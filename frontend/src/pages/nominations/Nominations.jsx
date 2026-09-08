import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Search, Send, MessageSquare, CheckCircle, List, Grid, User, AlertCircle } from 'lucide-react'

export default function Nominations() {
  const { user } = useAuth()
  const [cycle, setCycle] = useState(null)
  const [positions, setPositions] = useState([])
  const [myRecs, setMyRecs] = useState([])
  const [mySuggestions, setMySuggestions] = useState([])
  const [recommendedPositions, setRecommendedPositions] = useState([])
  const [suggestedPositions, setSuggestedPositions] = useState([])
  const [selectedPosition, setSelectedPosition] = useState('')
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [note, setNote] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState('system') // system | freetext
  const [viewMode, setViewMode] = useState('grid') // grid | list
  const [freeText, setFreeText] = useState({ suggested_name: '', description: '', why_recommend: '' })
  const [loading, setLoading] = useState(true)
  const [totalEligible, setTotalEligible] = useState(0)

  useEffect(() => {
    Promise.all([
      api.get('/nominations/cycle'),
      api.get('/positions'),
      api.get('/nominations/my-recommendations'),
    ]).then(([cycleRes, posRes, recRes]) => {
      setCycle(cycleRes.data.cycle)
      setPositions(posRes.data.positions || [])
      setMyRecs(recRes.data.recommendations || [])
      setMySuggestions(recRes.data.suggestions || [])
      setRecommendedPositions(recRes.data.recommended_positions || [])
      setSuggestedPositions(recRes.data.suggested_positions || [])
    }).finally(() => setLoading(false))
  }, [])

  // Load eligible members when position or search changes
  const loadMembers = useCallback(async (posId, searchTerm) => {
    if (!posId) { setMembers([]); setTotalEligible(0); return }
    setLoadingMembers(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      const r = await api.get(`/nominations/eligible/${posId}?${params}`)
      setMembers(r.data.members || [])
      setTotalEligible(r.data.total || r.data.members?.length || 0)
    } catch {
      toast.error('Could not load eligible members')
      setMembers([])
    } finally {
      setLoadingMembers(false)
    }
  }, [])

  useEffect(() => {
    setSelectedCandidate(null)
    setMembers([])
    setSearch('')
    setSearchInput('')
    setTotalEligible(0)
    if (selectedPosition) loadMembers(selectedPosition, '')
  }, [selectedPosition])

  // Debounced server-side search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedPosition) {
        setSearch(searchInput)
        loadMembers(selectedPosition, searchInput)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, selectedPosition])

  const alreadyRecommended = posId => recommendedPositions.includes(posId)
  const alreadySuggested = posId => suggestedPositions.includes(posId)
  const alreadyActed = posId => alreadyRecommended(posId) || alreadySuggested(posId)

  const submitRecommendation = async e => {
    e.preventDefault()
    if (!selectedCandidate) return toast.error('Please select a candidate')
    if (alreadyRecommended(selectedPosition)) return toast.error('You have already recommended for this position')
    setSubmitting(true)
    try {
      await api.post('/nominations/recommend', {
        cycle_id: cycle.id,
        position_id: selectedPosition,
        candidate_id: selectedCandidate.id,
        prayerful_note: note,
      })
      toast.success('Prayerful recommendation submitted!')
      setRecommendedPositions(prev => [...prev, selectedPosition])
      setMyRecs(prev => [...prev, { position_id: selectedPosition, candidate: selectedCandidate }])
      setSelectedPosition('')
      setSelectedCandidate(null)
      setNote('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const submitSuggestion = async e => {
    e.preventDefault()
    if (!freeText.suggested_name || !selectedPosition) return toast.error('Please fill in required fields')
    if (alreadySuggested(selectedPosition)) return toast.error('You have already submitted a suggestion for this position')
    if (alreadyRecommended(selectedPosition)) return toast.error('You have already recommended for this position. You cannot also suggest.')
    setSubmitting(true)
    try {
      await api.post('/nominations/suggest', {
        cycle_id: cycle.id,
        position_id: selectedPosition,
        ...freeText,
      })
      toast.success('Anonymous suggestion submitted to the Nomination College!')
      setSuggestedPositions(prev => [...prev, selectedPosition])
      setMySuggestions(prev => [...prev, { position_id: selectedPosition }])
      setFreeText({ suggested_name: '', description: '', why_recommend: '' })
      setSelectedPosition('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  if (!cycle || cycle.status !== 'nominations_open') {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="card p-8">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={24} className="text-gray-400" />
          </div>
          <h2 className="font-montserrat font-bold text-navy text-lg mb-2">Nominations Not Open</h2>
          <p className="text-gray-500 text-sm">
            {cycle ? `Current status: ${cycle.status?.replace(/_/g, ' ')}` : 'No active nomination cycle at this time.'}
          </p>
        </div>
      </div>
    )
  }

  const blockedRoles = ['nc_member', 'nc_chair', 'nc_secretary', 'ec_admin', 'super_admin', 'cu_secretary']
  if (blockedRoles.includes(user?.role)) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="card p-8">
          <h2 className="font-montserrat font-bold text-navy text-lg mb-2">Not Eligible to Recommend</h2>
          <p className="text-gray-500 text-sm">NC members and administrators cannot submit recommendations.</p>
        </div>
      </div>
    )
  }

  const selectedPos = positions.find(p => p.id === selectedPosition)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Submit Recommendation</h1>
          <p className="page-subtitle">{cycle.title} — Prayerfully recommend members for EC positions</p>
        </div>
      </div>

      {/* My activity summary */}
      {(myRecs.length > 0 || mySuggestions.length > 0) && (
        <div className="card p-4 mb-5 bg-teal/5 border border-teal/20">
          <div className="flex items-start gap-3">
            <CheckCircle size={18} className="text-teal flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              {myRecs.length > 0 && (
                <div className="mb-1">
                  <strong className="text-navy">Recommendations submitted:</strong>{' '}
                  <span className="text-gray-600">{myRecs.map(r => positions.find(p => p.id === r.position_id)?.title || '').filter(Boolean).join(', ')}</span>
                </div>
              )}
              {mySuggestions.length > 0 && (
                <div>
                  <strong className="text-navy">Anonymous suggestions submitted:</strong>{' '}
                  <span className="text-gray-600">{mySuggestions.map(s => positions.find(p => p.id === s.position_id)?.title || '').filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setMode('system')}
          className={`px-4 py-2 rounded-lg text-sm font-montserrat font-bold transition-all ${mode === 'system' ? 'bg-navy text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
          Browse Members
        </button>
        <button onClick={() => setMode('freetext')}
          className={`px-4 py-2 rounded-lg text-sm font-montserrat font-bold transition-all ${mode === 'freetext' ? 'bg-navy text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
          Suggest by Description
        </button>
      </div>

      {mode === 'system' ? (
        <div className="card">
          <div className="card-header">
            <h2 className="font-montserrat font-bold text-navy text-sm">Prayerful Recommendation</h2>
          </div>
          <div className="card-body">
            <form onSubmit={submitRecommendation} className="space-y-4">
              {/* Position selector */}
              <div>
                <label className="form-label">Select Position *</label>
                <select className="form-select" value={selectedPosition}
                  onChange={e => { setSelectedPosition(e.target.value); setSelectedCandidate(null) }}>
                  <option value="">Choose a position...</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id} disabled={alreadyActed(p.id)}>
                      {p.title}
                      {alreadyRecommended(p.id) ? ' ✓ Recommended' : ''}
                      {alreadySuggested(p.id) ? ' ✓ Suggested' : ''}
                      {p.gender_constraint ? ` (${p.gender_constraint} only)` : ''}
                    </option>
                  ))}
                </select>
                {selectedPos?.gender_constraint && (
                  <p className="text-xs text-orange mt-1 font-semibold">
                    ⚠️ This position requires a {selectedPos.gender_constraint} candidate (Art. 12.9.B)
                  </p>
                )}
              </div>

              {selectedPosition && (
                <>
                  {/* Already acted notice */}
                  {alreadyActed(selectedPosition) && (
                    <div className="bg-orange/5 border border-orange/20 rounded-lg p-3 flex items-center gap-2 text-sm text-orange">
                      <AlertCircle size={16} />
                      You have already {alreadyRecommended(selectedPosition) ? 'recommended' : 'suggested'} for this position. Only one action per position is allowed.
                    </div>
                  )}

                  {!alreadyActed(selectedPosition) && (
                    <>
                      {/* Search + view toggle */}
                      <div className="flex gap-2 items-center">
                        <div className="flex-1 relative">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="text" className="form-input pl-9"
                            placeholder="Search by name, ministry, or MUTCU number..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)} />
                        </div>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                          <button type="button" onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}>
                            <Grid size={16} className={viewMode === 'grid' ? 'text-navy' : 'text-gray-400'} />
                          </button>
                          <button type="button" onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}>
                            <List size={16} className={viewMode === 'list' ? 'text-navy' : 'text-gray-400'} />
                          </button>
                        </div>
                      </div>

                      {/* Member count */}
                      {!loadingMembers && (
                        <div className="text-xs text-gray-400">
                          {totalEligible} eligible member{totalEligible !== 1 ? 's' : ''} found
                          {searchInput && ` for "${searchInput}"`}
                        </div>
                      )}

                      {/* Members display */}
                      {loadingMembers ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange mx-auto mb-2" />
                          <div className="text-xs text-gray-400">Loading eligible members...</div>
                        </div>
                      ) : members.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          <User size={32} className="mx-auto mb-2 text-gray-200" />
                          {searchInput ? `No eligible members found matching "${searchInput}"` : 'No eligible members found for this position.'}
                        </div>
                      ) : viewMode === 'grid' ? (
                        /* Grid view */
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-80 overflow-y-auto p-1">
                          {members.map(m => (
                            <div key={m.id} onClick={() => setSelectedCandidate(m)}
                              className={`cursor-pointer rounded-xl p-2 text-center transition-all border-2 ${selectedCandidate?.id === m.id ? 'border-orange bg-orange/5' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}>
                              <img src={m.photo} alt={m.name}
                                className={`w-12 h-12 rounded-full object-cover mx-auto mb-1.5 border-2 ${selectedCandidate?.id === m.id ? 'border-orange' : 'border-gray-200'}`} />
                              <div className="text-xs font-bold text-navy leading-tight truncate">{m.name}</div>
                              <div className="text-xs text-gray-400">Yr {m.year_of_study}</div>
                              <div className="text-xs text-gray-300 truncate">{m.ministry}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* List view */
                        <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-xl">
                          {members.map((m, i) => (
                            <div key={m.id} onClick={() => setSelectedCandidate(m)}
                              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b border-gray-50 last:border-0 ${selectedCandidate?.id === m.id ? 'bg-orange/5 border-l-2 border-l-orange' : 'hover:bg-gray-50'}`}>
                              <img src={m.photo} alt={m.name}
                                className={`w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 ${selectedCandidate?.id === m.id ? 'border-orange' : 'border-gray-200'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-navy text-sm">{m.name}</div>
                                <div className="text-xs text-gray-400">
                                  Year {m.year_of_study} {m.course_type === 'diploma' ? '(Diploma)' : ''} · {m.ministry}
                                  {m.secondary_ministry && ` · ${m.secondary_ministry}`}
                                </div>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                {m.mutcu_number && <div className="text-xs font-montserrat font-bold text-orange">{m.mutcu_number}</div>}
                                <div className="text-xs text-gray-400 capitalize">{m.gender}</div>
                              </div>
                              {selectedCandidate?.id === m.id && (
                                <div className="w-5 h-5 bg-orange rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Selected candidate */}
                      {selectedCandidate && (
                        <div className="flex items-center gap-3 bg-teal/5 border border-teal/30 rounded-lg p-3">
                          <img src={selectedCandidate.photo} alt={selectedCandidate.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-teal" />
                          <div className="flex-1">
                            <div className="font-bold text-navy text-sm">{selectedCandidate.name}</div>
                            <div className="text-xs text-gray-400">
                              Year {selectedCandidate.year_of_study} · {selectedCandidate.ministry}
                              {selectedCandidate.mutcu_number && ` · ${selectedCandidate.mutcu_number}`}
                            </div>
                          </div>
                          <button type="button" onClick={() => setSelectedCandidate(null)}
                            className="text-gray-400 hover:text-gray-600 text-xs">Change</button>
                        </div>
                      )}

                      <button type="submit" disabled={submitting || !selectedCandidate} className="btn-primary">
                        <Send size={15} />{submitting ? 'Submitting...' : 'Submit Prayerful Recommendation'}
                      </button>
                    </>
                  )}
                </>
              )}
            </form>
          </div>
        </div>
      ) : (
        /* Free-text suggestion mode */
        <div className="card">
          <div className="card-header">
            <h2 className="font-montserrat font-bold text-navy text-sm">Anonymous Suggestion</h2>
          </div>
          <div className="card-body">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 mb-4">
              <strong>Anonymous:</strong> Your name will NOT be attached to this suggestion. The NC will evaluate it prayerfully.
              You can only submit one suggestion per position.
            </div>
            <form onSubmit={submitSuggestion} className="space-y-4">
              <div>
                <label className="form-label">Position *</label>
                <select className="form-select" value={selectedPosition}
                  onChange={e => setSelectedPosition(e.target.value)} required>
                  <option value="">Choose a position...</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id} disabled={alreadyActed(p.id)}>
                      {p.title}
                      {alreadyRecommended(p.id) ? ' ✓ Recommended' : ''}
                      {alreadySuggested(p.id) ? ' ✓ Suggested' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPosition && alreadyActed(selectedPosition) && (
                <div className="bg-orange/5 border border-orange/20 rounded-lg p-3 flex items-center gap-2 text-sm text-orange">
                  <AlertCircle size={16} />
                  You have already {alreadyRecommended(selectedPosition) ? 'recommended' : 'suggested'} for this position.
                </div>
              )}

              {selectedPosition && !alreadyActed(selectedPosition) && (
                <>
                  <div>
                    <label className="form-label">Name (as you know them) *</label>
                    <input type="text" className="form-input" placeholder="e.g. John from Missions Ministry"
                      value={freeText.suggested_name} onChange={e => setFreeText({ ...freeText, suggested_name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Description <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                    <textarea className="form-input" rows={2}
                      placeholder="Year of study, ministry, physical description to help NC identify them..."
                      value={freeText.description} onChange={e => setFreeText({ ...freeText, description: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Why Recommend? <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                    <textarea className="form-input" rows={2}
                      placeholder="Prayerful reason for your suggestion..."
                      value={freeText.why_recommend} onChange={e => setFreeText({ ...freeText, why_recommend: e.target.value })} />
                  </div>
                  <button type="submit" disabled={submitting} className="btn-teal">
                    <Send size={15} />{submitting ? 'Submitting...' : 'Submit Anonymous Suggestion'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}