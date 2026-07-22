import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'

export default function MembersPending() {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState({})

  useEffect(() => { api.get('/members/pending').then(r => setPending(r.data.members||[])).finally(() => setLoading(false)) }, [])

  const approve = async id => {
    setProcessing(prev => ({...prev, [id]: 'approving'}))
    try {
      const { data } = await api.post(`/members/${id}/approve`)
      toast.success(data.message)
      setPending(prev => prev.filter(m => m.id !== id))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to approve') }
    finally { setProcessing(prev => ({...prev, [id]: null})) }
  }

  const reject = async id => {
    if (!window.confirm('Reject this registration?')) return
    setProcessing(prev => ({...prev, [id]: 'rejecting'}))
    try {
      await api.post(`/members/${id}/reject`)
      toast.success('Registration rejected')
      setPending(prev => prev.filter(m => m.id !== id))
    } catch (err) { toast.error('Failed to reject') }
    finally { setProcessing(prev => ({...prev, [id]: null})) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header">
        <div><Link to="/secretary/members" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2"><ArrowLeft size={12} />Back to Register</Link><h1 className="page-title">Pending Approvals</h1><p className="page-subtitle">{pending.length} members awaiting review</p></div>
      </div>
      {pending.length === 0 ? (
        <div className="card p-8 text-center"><CheckCircle size={40} className="text-green-400 mx-auto mb-3" /><div className="text-gray-500 text-sm">All registrations are up to date.</div></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>Student ID</th><th>Ministry</th><th>Registered</th><th>Declaration</th><th>Actions</th></tr></thead>
              <tbody>
                {pending.map(m => {
                  const photoUrl = m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <img src={photoUrl} alt={m.name} className="w-10 h-10 rounded-full object-cover border-2 border-orange" />
                          <div><div className="font-bold text-navy text-sm">{m.name}</div><div className="text-xs text-gray-400">{m.email}</div></div>
                        </div>
                      </td>
                      <td className="text-sm text-gray-500">{m.student_id||'—'}</td>
                      <td className="text-sm text-gray-500">{m.primary_ministry||'General'}</td>
                      <td className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString('en-GB')}</td>
                      <td>{m.faith_declaration_signed ? <span className="badge badge-teal">Signed</span> : <span className="badge badge-orange">Not signed</span>}</td>
                      <td>
                        <div className="flex gap-1.5">
                          <button onClick={() => approve(m.id)} disabled={!!processing[m.id]} className="btn-teal btn-sm">
                            {processing[m.id]==='approving' ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <CheckCircle size={13} />}
                            Approve
                          </button>
                          <button onClick={() => reject(m.id)} disabled={!!processing[m.id]} className="btn-outline btn-sm text-red border-red/30">
                            <XCircle size={13} />Reject
                          </button>
                          <Link to={`/secretary/members/${m.id}/edit`} className="btn-outline btn-sm text-xs">View</Link>
                        </div>
                      </td>
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
