import { useEffect, useState } from 'react'
import api from '../lib/api'
import { History, Filter, Search } from 'lucide-react'

export default function Leadership() {
  const [current, setCurrent] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('current')

  // Filters for history
  const [searchName, setSearchName] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterPosition, setFilterPosition] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/leadership/current').catch(() => ({ data: { ec: [] } })),
      api.get('/leadership/history').catch(() => ({ data: { history: [] } })),
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
  const positions = [...new Set(history.map(a => a.position?.title).filter(Boolean))].sort()

  // Apply filters
  const filteredHistory = history.filter(appt => {
    const matchName = !searchName || appt.user?.name?.toLowerCase().includes(searchName.toLowerCase())
    const matchYear = !filterYear || appt.spiritual_year === filterYear
    const matchPos  = !filterPosition || appt.position?.title === filterPosition
    return matchName && matchYear && matchPos
  })

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
              <select className="form-select text-sm w-52" value={filterPosition} onChange={e => setFilterPosition(e.target.value)}>
                <option value="">All Positions</option>
                {positions.map(p => <option key={p} value={p}>{p}</option>)}
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
    </div>
  )
}