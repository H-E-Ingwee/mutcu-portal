import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

export default function AdminAppointNC() {
  const { id } = useParams()
  const [cycle, setCycle] = useState(null)
  const [ncMembers, setNcMembers] = useState([])
  const [finalists, setFinalists] = useState([])
  const [form, setForm] = useState({ user_id: '', nc_role: 'member' })
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/admin/cycles').then(r => r.data.cycles?.find(c => c.id === id)),
      api.get(`/admin/cycles/${id}/nc`),
      api.get('/admin/finalists'),
    ]).then(([cycleData, ncRes, finalistsRes]) => {
      setCycle(cycleData)
      setNcMembers(ncRes.data.nc_members||[])
      setFinalists(finalistsRes.data.finalists||[])
    }).finally(() => setLoading(false))
  }, [id])

  const add = async e => {
    e.preventDefault(); setAdding(true)
    try {
      const { data } = await api.post(`/admin/cycles/${id}/nc`, form)
      toast.success('NC member appointed')
      setNcMembers(prev => [...prev, data.nc_member])
      setForm({ user_id: '', nc_role: 'member' })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setAdding(false) }
  }

  const remove = async ncId => {
    if (!window.confirm('Remove from NC?')) return
    try {
      await api.delete(`/admin/cycles/${id}/nc/${ncId}`)
      toast.success('NC member removed')
      setNcMembers(prev => prev.filter(m => m.id !== ncId))
    } catch (err) { toast.error('Failed to remove') }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header"><div><Link to="/admin/cycles" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2"><ArrowLeft size={12} />Back</Link><h1 className="page-title">Appoint Nomination College</h1><p className="page-subtitle">{cycle?.title}</p></div></div>
      <div className="alert-info mb-5"><div className="text-sm">The Nomination College consists of 12 finalists. Select members who are finalists to form the NC.</div></div>

      {ncMembers.length > 0 && (
        <div className="card mb-5">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Current NC Members ({ncMembers.length})</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>NC Role</th><th></th></tr></thead>
              <tbody>
                {ncMembers.map(nc => {
                  const photoUrl = nc.user?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(nc.user?.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`
                  return (
                    <tr key={nc.id}>
                      <td><div className="flex items-center gap-2.5"><img src={photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" /><div className="font-bold text-navy text-sm">{nc.user?.name}</div></div></td>
                      <td><span className="badge badge-teal">{nc.nc_role}</span></td>
                      <td><button onClick={() => remove(nc.id)} className="text-red hover:bg-red/5 p-1.5 rounded"><Trash2 size={14} /></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-montserrat font-bold text-navy text-sm mb-4">Add NC Member</h2>
        <form onSubmit={add} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="form-label">Select Member *</label><select className="form-select" value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} required><option value="">Search and select a finalist...</option>{finalists.map(f=><option key={f.id} value={f.id}>{f.name} ({f.student_id||f.mutcu_number||f.email})</option>)}</select></div>
          <div><label className="form-label">NC Role *</label><select className="form-select" value={form.nc_role} onChange={e => setForm({...form, nc_role: e.target.value})}><option value="member">Member</option><option value="chair">Chairperson</option><option value="secretary">Secretary</option></select></div>
          <div className="flex items-end"><button type="submit" disabled={adding} className="btn-primary"><Plus size={15} />{adding ? 'Adding...' : 'Add to NC'}</button></div>
        </form>
      </div>
    </div>
  )
}
