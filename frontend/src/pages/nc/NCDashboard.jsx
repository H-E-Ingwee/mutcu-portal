import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Send, MessageSquare, AlertTriangle, ChevronRight, Users } from 'lucide-react'

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
  if (!data?.cycle) return (
    <div className="max-w-lg mx-auto mt-12 text-center">
      <div className="card p-8"><h2 className="font-montserrat font-bold text-navy text-lg mb-2">No Active Cycle</h2><p className="text-gray-500 text-sm">The EC Admin will create a nomination cycle when ready.</p></div>
    </div>
  )

  const { cycle, positions, suggestionCount, objectionCount, publishedCount } = data

  const statusColor = {
    nominations_open: 'bg-green-100 text-green-700',
    vetting: 'bg-orange/10 text-orange',
    nominees_published: 'bg-teal/10 text-teal',
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">NC Dashboard</h1>
          <p className="page-subtitle">{cycle.title} — <span className={`badge ${statusColor[cycle.status]||'badge-gray'}`}>{cycle.status?.replace(/_/g,' ')}</span></p>
        </div>
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
          { label: 'Total Positions', value: positions?.length||0, color: 'text-navy' },
          { label: 'Approved', value: positions?.filter(p=>p.approved_count>0).length||0, color: 'text-teal' },
          { label: 'Nominees Published', value: publishedCount, color: 'text-orange' },
          { label: 'Needs Vetting', value: positions?.filter(p=>p.recommendation_count>0&&p.approved_count===0).length||0, color: 'text-red' },
        ].map((s,i) => (
          <div key={i} className="card p-4 text-center">
            <div className={`text-2xl font-montserrat font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs font-montserrat font-semibold text-gray-400 uppercase tracking-wide mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Positions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(positions||[]).map(pos => (
          <Link key={pos.id} to={`/nc/position/${pos.id}`}
            className="card p-4 hover:border-orange/30 hover:shadow-md transition-all border border-transparent group">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-montserrat font-bold text-navy text-sm">{pos.title}</div>
                {pos.gender_constraint && <div className="text-xs text-gray-400">{pos.gender_constraint} only</div>}
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-orange transition-colors" />
            </div>

            {/* Recommendation bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span><Users size={11} className="inline mr-1" />{pos.recommendation_count} recommendations</span>
                <span>{pos.unique_candidates} candidates</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange rounded-full transition-all"
                  style={{width: pos.recommendation_count > 0 ? '100%' : '0%'}} />
              </div>
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
        ))}
      </div>
    </div>
  )
}
