import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'

export default function AdminCycles() {
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.get('/admin/cycles').then(r => setCycles(r.data.cycles||[])).finally(() => setLoading(false)) }, [])

  const commission = async id => {
    if (!window.confirm('Commission the new EC? This finalises the cycle.')) return
    try {
      await api.post(`/admin/cycles/${id}/commission`)
      toast.success('New EC commissioned!')
      setCycles(prev => prev.map(c => c.id === id ? {...c, status: 'commissioned'} : c))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const statusLabel = { setup:'Setup', prayer_period:'Prayer Period', nominations_open:'Nominations Open', vetting:'NC Vetting', nominees_published:'Nominees Published', objection_period:'Objection Period', pre_agm:'Pre-AGM', commissioned:'Commissioned' }
  const statusBadge = { setup:'badge-gray', prayer_period:'badge-navy', nominations_open:'badge-green', vetting:'badge-orange', nominees_published:'badge-teal', objection_period:'badge-red', commissioned:'badge-navy' }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Nomination Cycles</h1></div><Link to="/admin/cycles/create" className="btn-primary btn-sm"><Plus size={14} />New Cycle</Link></div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cycle</th><th>Type</th><th>Status</th><th>Nominations</th><th>AGM</th><th>Actions</th></tr></thead>
            <tbody>
              {cycles.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">No cycles created yet.</td></tr>
              : cycles.map(c => (
                <tr key={c.id}>
                  <td><div className="font-bold text-navy text-sm">{c.title}</div><div className="text-xs text-gray-400">{c.spiritual_year}</div></td>
                  <td><span className="badge badge-navy">{c.cycle_type}</span></td>
                  <td><span className={`badge ${statusBadge[c.status]||'badge-gray'}`}>{statusLabel[c.status]||c.status}</span></td>
                  <td className="text-sm text-gray-500">{c.nomination_open_date ? new Date(c.nomination_open_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '—'} – {c.nomination_close_date ? new Date(c.nomination_close_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'}</td>
                  <td className="text-sm text-gray-500">{c.agm_date ? new Date(c.agm_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'}</td>
                  <td>
                    <div className="flex gap-1.5">
                      <Link to={`/admin/cycles/${c.id}/appoint-nc`} className="btn-outline btn-sm text-xs">Appoint NC</Link>
                      {c.status === 'vetting' && <button onClick={() => commission(c.id)} className="btn-teal btn-sm text-xs">Commission EC</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
