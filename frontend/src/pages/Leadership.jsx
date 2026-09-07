import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { History, Filter, Search, Plus, Edit2, Trash2, X, Check } from 'lucide-react'

export default function Leadership() {
  const { isAdmin } = useAuth()
  const [current, setCurrent] = useState([])
  const [history, setHistory] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('current')
  const [showManual, setShowManual] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [manualForm, setManualForm] = useState({ position_id: '', spiritual_year: '', term_number: 1, commissioned_at: '', is_current: false, notes: '', user_name: '' })
  const [saving, setSaving] = useState(false)

  // Filters for history
  const [searchName, setSearchName] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterPosition, setFilterPosition] = useState('')

  useEffect(() => {
    
    ]).then(([curRes, histRes]) => {
      setCurrent(curRes.data.ec || [])
      setHistory(histRes.data.history || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
    </div>
  )

  // Derive filter options from history
  const spiritualYears = [...new Set(history.map(a => a.spiritual_year).filter(Boolean))].sort().reverse()
  const positionTitles = [...new Set(history.map(a => a.position?.title).filter(Boolean))].sort()

  const saveManualEntry = async () => {
    if (!manualForm.position_id || !manualForm.spiritual_year) return toast.error('Position and spiritual year are required')
    setSaving(true)
    try {
      if (editEntry) {
        await api.put(`/leadership/${editEntry.id}`, manualForm)
        toast.success('Entry updated')
      } else {
        await api.post('/leadership/manual', manualForm)
        toast.success('Leadership entry added')
      }
      const [curRes, histRes] = await Promise.all([api.get('/leadership/current'), api.get('/leadership/history')])
      setCurrent(curRes.data.ec || [])
      setHistory(histRes.data.history || [])
      setShowManual(false)
      setEditEntry(null)
      setManualForm({ position_id: '', spiritual_year: '', term_number: 1, commissioned_at: '', is_current: false, notes: '', user_name: '' })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const deleteEntry = async (id) => {
    if (!window.confirm('Delete this leadership entry?')) return
    try {
      await api.delete(`/leadership/${id}`)
      setHistory(prev => prev.filter(a => a.id !== id))
      setCurrent(prev => prev.filter(a => a.id !== id))
      toast.success('Entry deleted')
    } catch { toast.error('Failed') }
  }

  // Apply filters
  const filteredHistory = history.filter(appt => {
    const matchName = !searchName || appt.user?.name?.toLowerCase().includes(searchName.toLowerCase())
    const matchYear = !filterYear || appt.spiritual_year === filterYear
    const matchPos  = !filterPosition || appt.position?.title === filterPosition
    return matchName && matchYear && matchPos
  })

  const adminCanEdit = isAdmin && isAdmin()

  // Group history by spiritual year
  const groupedHistory = {}
  filteredHistory.forEach(appt => {
    const year = appt.spiritual_year || 'Unknown'
    if (!groupedHistory[year]) groupedHistory[year] = []
    groupedHistory[year].push(appt)
  })
  const sortedYears = Object.keys(groupedHistory).sort().reverse()

  const sortedCurrent = [...current].sort((a, b) =>
    (a.position?.display_order || 0) - (b.position?.display_order || 0)
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leadership History</h1>
          <p className="page-subtitle">MUTCU Executive Council — past and present</p>
        </div>
        {adminCanEdit && (
          <button onClick={() => { setShowManual(true); setEditEntry(null) }} className="btn-primary btn-sm">
            <Plus size={14} />Add Entry
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('current')}
          className={`px-4 py-2 rounded-lg text-sm font-montserrat font-bold transition-all ${tab === 'current' ? 'bg-navy text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
          Current EC
          {current.length > 0 && <span className="ml-2 badge badge-orange">{current.length}</span>}
        </button>
        <button onClick={() => setTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-montserrat font-bold transition-all ${tab === 'history' ? 'bg-navy text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
          Full History
          {history.length > 0 && <span className="ml-2 badge badge-gray">{history.length}</span>}
        </button>
      </div>

      {/* ── Current EC ── */}
      {tab === 'current' && (
        current.length === 0 ? (
          <div className="card p-10 text-center">
            <History size={40} className="text-gray-300 mx-auto mb-3" />
            <div className="text-gray-400 text-sm">No current EC commissioned yet.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCurrent.map(appt => {
              const photoUrl = appt.user?.photo_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.user?.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`
              return (
                <div key={appt.id} className="card p-5 text-center hover:shadow-md transition-all">
                  <div className="relative inline-block mb-3">
                    <img src={photoUrl} alt={appt.user?.name}
                      className="w-20 h-20 rounded-full object-cover border-3 border-orange mx-auto"
                      style={{ border: '3px solid #FF9700' }} />
                    {appt.term_number > 1 && (
                      <div className="absolute -bottom-1 -right-1 bg-orange text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {appt.term_number}
                      </div>
                    )}
                  </div>
                  <div className="font-montserrat font-bold text-navy text-sm mb-0.5">{appt.user?.name}</div>
                  <div className="text-orange text-xs font-montserrat font-bold mb-1">{appt.position?.title}</div>
                  <div className="text-gray-400 text-xs mb-2">{appt.user?.primary_ministry || 'General Member'}</div>
                  {appt.spiritual_year && (
                    <span className="badge badge-navy text-xs">{appt.spiritual_year}</span>
                  )}
                  {appt.term_number > 1 && (
                    <div className="text-xs text-orange mt-1">Term {appt.term_number}</div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── History ── */}
      {tab === 'history' && (
        <div>
          {/* Filters */}
          <div className="card p-4 mb-5">
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-48 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" className="form-input pl-9 text-sm" placeholder="Search by name..."
                  value={searchName} onChange={e => setSearchName(e.target.value)} />
              </div>
              <select className="form-select text-sm w-40" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                <option value="">All Years</option>
                {spiritualYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              
              </select>
              {(searchName || filterYear || filterPosition) && (
                <button onClick={() => { setSearchName(''); setFilterYear(''); setFilterPosition('') }}
                  className="btn-outline btn-sm">Clear</button>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Showing {filteredHistory.length} of {history.length} appointments
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="card p-10 text-center">
              <History size={40} className="text-gray-300 mx-auto mb-3" />
              <div className="text-gray-400 text-sm">No leadership history found.</div>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedYears.map(year => (
                <div key={year}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="font-montserrat font-bold text-navy text-sm">{year} Spiritual Year</div>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="badge badge-navy">{groupedHistory[year].length} members</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {groupedHistory[year]
                      .sort((a, b) => (a.position?.display_order || 0) - (b.position?.display_order || 0))
                      .map((appt, i) => {
                        const photoUrl = appt.user?.photo_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.user?.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`
                        return (
                          <div key={i} className="card p-3 flex items-center gap-3 hover:shadow-sm transition-all">
                            <img src={photoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-navy text-sm truncate">{appt.user?.name}</div>
                              <div className="text-orange text-xs font-semibold truncate">{appt.position?.title}</div>
                              <div className="text-gray-400 text-xs">{appt.user?.primary_ministry || 'General'}</div>
                            </div>
                            <span className="badge badge-teal flex-shrink-0">T{appt.term_number}</span>
                            {adminCanEdit && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => { setEditEntry(appt); setManualForm({ position_id: appt.position_id, spiritual_year: appt.spiritual_year || '', term_number: appt.term_number || 1, commissioned_at: appt.commissioned_at?.split('T')[0] || '', is_current: appt.is_current || false, notes: appt.notes || '' }); setShowManual(true) }} className="text-gray-300 hover:text-navy transition-colors p-0.5"><Edit2 size={11} /></button>
                                <button onClick={() => deleteEntry(appt.id)} className="text-gray-300 hover:text-red transition-colors p-0.5"><Trash2 size={11} /></button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    {/* Manual Entry Modal */}
      {showManual && adminCanEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">{editEntry ? 'Edit Leadership Entry' : 'Add Leadership Entry'}</h3>
              <button onClick={() => { setShowManual(false); setEditEntry(null) }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Position *</label>
                <select className="form-select" value={manualForm.position_id} onChange={e => setManualForm(f => ({ ...f, position_id: e.target.value }))}>
                  <option value="">Select position...</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Member Name (if not in system)</label>
                <input type="text" className="form-input" placeholder="e.g. John Doe (Historical)" value={manualForm.user_name} onChange={e => setManualForm(f => ({ ...f, user_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Spiritual Year *</label>
                  <input type="text" className="form-input" placeholder="e.g. 2024/2025" value={manualForm.spiritual_year} onChange={e => setManualForm(f => ({ ...f, spiritual_year: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Term Number</label>
                  <input type="number" className="form-input" min="1" max="2" value={manualForm.term_number} onChange={e => setManualForm(f => ({ ...f, term_number: parseInt(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Commissioned Date</label>
                <input type="date" className="form-input" value={manualForm.commissioned_at} onChange={e => setManualForm(f => ({ ...f, commissioned_at: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Notes</label>
                <input type="text" className="form-input" placeholder="Optional notes" value={manualForm.notes} onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-orange" checked={manualForm.is_current} onChange={e => setManualForm(f => ({ ...f, is_current: e.target.checked }))} />
                <span className="text-sm text-gray-700">Mark as current EC member</span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={saveManualEntry} disabled={saving} className="btn-primary flex-1 justify-center">
                <Check size={15} />{saving ? 'Saving...' : (editEntry ? 'Update Entry' : 'Add Entry')}
              </button>
              <button onClick={() => { setShowManual(false); setEditEntry(null) }} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}