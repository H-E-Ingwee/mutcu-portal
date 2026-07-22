import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'

export default function NCSuggestions() {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.get('/nc/suggestions').then(r => setSuggestions(r.data.suggestions||[])).finally(() => setLoading(false)) }, [])

  const action = async (id, act) => {
    try {
      await api.post(`/nc/suggestions/${id}/action`, { action: act })
      toast.success('Suggestion updated')
      setSuggestions(prev => prev.map(s => s.id === id ? {...s, nc_action: act} : s))
    } catch (err) { toast.error('Failed to update') }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header"><div><Link to="/nc" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2"><ArrowLeft size={12} />Back</Link><h1 className="page-title">Member Suggestions</h1></div></div>
      {suggestions.length === 0 ? (
        <div className="card p-8 text-center"><div className="text-gray-400 text-sm">No free-text suggestions submitted.</div></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Suggested Name</th><th>Position</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {suggestions.map(s => (
                  <tr key={s.id}>
                    <td><div className="font-bold text-navy text-sm">{s.suggested_name}</div><div className="text-xs text-gray-400">by {s.suggester?.name}</div></td>
                    <td className="text-sm text-gray-600">{s.position?.title}</td>
                    <td className="text-sm text-gray-500 max-w-xs">{s.description || '—'}</td>
                    <td>
                      {s.nc_action === 'pending' ? <span className="badge badge-orange">Pending</span>
                        : s.nc_action === 'linked' ? <span className="badge badge-teal">Linked</span>
                        : s.nc_action === 'dismissed' ? <span className="badge badge-gray">Dismissed</span>
                        : <span className="badge badge-red">Unidentifiable</span>}
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <button onClick={() => action(s.id, 'dismissed')} className="btn-outline btn-sm text-xs">Dismiss</button>
                        <button onClick={() => action(s.id, 'unidentifiable')} className="btn-outline btn-sm text-xs">Unidentifiable</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
