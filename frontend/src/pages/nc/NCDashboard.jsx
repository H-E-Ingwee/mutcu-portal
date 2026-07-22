import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ChevronRight, Send, MessageSquare, AlertTriangle } from 'lucide-react'

export default function NCDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    api.get('/nc/dashboard').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  const publish = async () => {
    if (!window.confirm('Publish all approved nominees to members? This cannot be undone.')) return
    setPublishing(true)
    try {
      await api.post('/nc/publish', { cycle_id: data.cycle.id })
      toast.success('Nominees published successfully!')
      setData(prev => ({ ...prev, cycle: { ...prev.cycle, status: 'nominees_published' } }))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to publish') }
    finally { setPublishing(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>
  if (!data?.cycle) return <div className="max-w-lg mx-auto mt-12 text-center"><div className="card p-8"><h2 className="font-montserrat font-bold text-navy text-lg mb-2">No Active Cycle</h2><p className="text-gray-500 text-sm">The EC Admin will create a nomination cycle when ready.</p></div></div>

  const { cycle, positions, suggestionCount, objectionCount, publishedCount } = data

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">NC Dashboard</h1><p className="page-subtitle">{cycle.title} — Vetting Phase</p></div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/nc/suggestions" className="btn-outline btn-sm relative">
            <MessageSquare size={14} />Suggestions
            {suggestionCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-orange text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{suggestionCount}</span>}
          </Link>
          <Link to="/nc/objections" className="btn-outline btn-sm relative">
            <AlertTriangle size={14} />Objections
            {objectionCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{objectionCount}</span>}
          </Link>
          {cycle.status === 'vetting' && (
            <button onClick={publish} disabled={publishing} className="btn-primary btn-sm">
              <Send size={14} />{publishing ? 'Publishing...' : 'Publish Nominees'}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Positions', value: positions?.length || 0, color: 'text-navy' },
          { label: 'Vetting Done', value: positions?.filter(p => p.approved_count > 0).length || 0, color: 'text-teal' },
          { label: 'Nominees Published', value: publishedCount, color: 'text-orange' },
          { label: 'Pending Vetting', value: positions?.filter(p => p.recommendation_count > 0 && p.approved_count === 0).length || 0, color: 'text-red' },
        ].map((s, i) => (
          <div key={i} className="card p-4 text-center">
            <div className={`text-2xl font-montserrat font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs font-montserrat font-semibold text-gray-400 uppercase tracking-wide mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Positions Table */}
      <div className="card">
        <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">EC Positions — Vetting Status</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Position</th><th>Recommendations</th><th>Candidates</th><th>Approved</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {(positions || []).map(pos => (
                <tr key={pos.id}>
                  <td>
                    <div className="font-bold text-navy text-sm">{pos.title}</div>
                    {pos.gender_constraint && <div className="text-xs text-gray-400">{pos.gender_constraint} only</div>}
                  </td>
                  <td><span className="font-bold text-navy">{pos.recommendation_count}</span></td>
                  <td><span className="font-bold text-navy">{pos.unique_candidates}</span></td>
                  <td><span className="font-bold text-teal">{pos.approved_count}</span></td>
                  <td>
                    {pos.approved_count > 0 ? <span className="badge badge-teal">Done</span>
                      : pos.recommendation_count > 0 ? <span className="badge badge-orange">Needs Vetting</span>
                      : <span className="badge badge-gray">No Recs</span>}
                  </td>
                  <td><Link to={`/nc/position/${pos.id}`} className="btn-outline btn-sm"><ChevronRight size={14} />Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
