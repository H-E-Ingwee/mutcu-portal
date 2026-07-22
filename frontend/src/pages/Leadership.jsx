import { useEffect, useState } from 'react'
import api from '../lib/api'
import { History } from 'lucide-react'

export default function Leadership() {
  const [current, setCurrent] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('current')

  useEffect(() => {
    Promise.all([
      api.get('/leadership/current').catch(() => ({ data: { ec: [] } })),
      api.get('/leadership/history').catch(() => ({ data: { history: [] } })),
    ]).then(([curRes, histRes]) => {
      setCurrent(curRes.data.ec || [])
      setHistory(histRes.data.history || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Leadership History</h1><p className="page-subtitle">MUTCU Executive Council — past and present</p></div></div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('current')} className={`px-4 py-2 rounded-lg text-sm font-montserrat font-bold transition-all ${tab==='current'?'bg-navy text-white':'bg-white text-gray-500 border border-gray-200'}`}>Current EC</button>
        <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-montserrat font-bold transition-all ${tab==='history'?'bg-navy text-white':'bg-white text-gray-500 border border-gray-200'}`}>Full History</button>
      </div>

      {tab === 'current' ? (
        current.length === 0 ? (
          <div className="card p-10 text-center"><History size={40} className="text-gray-300 mx-auto mb-3" /><div className="text-gray-400 text-sm">No current EC commissioned yet.</div></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {current.sort((a,b) => (a.position?.display_order||0)-(b.position?.display_order||0)).map(appt => {
              const photoUrl = appt.user?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.user?.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`
              return (
                <div key={appt.id} className="card p-5 text-center">
                  <img src={photoUrl} alt={appt.user?.name} className="w-16 h-16 rounded-full object-cover border-2 border-orange mx-auto mb-3" />
                  <div className="font-montserrat font-bold text-navy text-sm mb-0.5">{appt.user?.name}</div>
                  <div className="text-orange text-xs font-montserrat font-bold mb-1">{appt.position?.title}</div>
                  <div className="text-gray-400 text-xs">{appt.user?.primary_ministry || 'General Member'}</div>
                  {appt.spiritual_year && <div className="badge badge-navy mt-2">{appt.spiritual_year}</div>}
                </div>
              )
            })}
          </div>
        )
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>Position</th><th>Spiritual Year</th><th>Term</th></tr></thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">No leadership history yet.</td></tr>
                ) : history.map((appt, i) => {
                  const photoUrl = appt.user?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.user?.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`
                  return (
                    <tr key={i}>
                      <td><div className="flex items-center gap-2.5"><img src={photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" /><span className="font-bold text-navy text-sm">{appt.user?.name}</span></div></td>
                      <td className="text-sm text-gray-600">{appt.position?.title}</td>
                      <td className="text-sm text-gray-500">{appt.spiritual_year || '—'}</td>
                      <td><span className="badge badge-teal">Term {appt.term_number}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
