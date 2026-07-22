import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Shield } from 'lucide-react'

const ROLES = ['super_admin','ec_admin','cu_secretary','ministry_secretary','nc_member','full_member','special_member','associate_member']
const roleLabel = r => r.replace(/_/g,' ').replace(/\w/g, c => c.toUpperCase())

export default function AdminRoles() {
  const [users, setUsers] = useState([])
  const [allMembers, setAllMembers] = useState([])
  const [form, setForm] = useState({ user_id: '', role: '' })
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/admin/roles'), api.get('/members?limit=200')]).then(([rolesRes, membersRes]) => {
      setUsers(rolesRes.data.users||[])
      setAllMembers(membersRes.data.members||[])
    }).finally(() => setLoading(false))
  }, [])

  const assign = async e => {
    e.preventDefault(); setAssigning(true)
    try {
      const { data } = await api.put(`/admin/roles/${form.user_id}`, { role: form.role })
      toast.success(data.message)
      setUsers(prev => {
        const exists = prev.find(u => u.id === form.user_id)
        if (exists) return prev.map(u => u.id === form.user_id ? {...u, role: form.role} : u)
        const member = allMembers.find(m => m.id === form.user_id)
        return member ? [...prev, {...member, role: form.role}] : prev
      })
      setForm({ user_id: '', role: '' })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setAssigning(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Role Management</h1><p className="page-subtitle">Assign system roles to members</p></div></div>

      <div className="card p-6 mb-6">
        <h2 className="font-montserrat font-bold text-navy text-sm mb-4">Assign Role</h2>
        <form onSubmit={assign} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div><label className="form-label">Member *</label><select className="form-select" value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} required><option value="">Select member...</option>{allMembers.map(m=><option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}</select></div>
          <div><label className="form-label">Role *</label><select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})} required><option value="">Select role...</option>{ROLES.map(r=><option key={r} value={r}>{roleLabel(r)}</option>)}</select></div>
          <button type="submit" disabled={assigning} className="btn-primary"><Shield size={15} />{assigning ? 'Assigning...' : 'Assign Role'}</button>
        </form>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Members with Special Roles</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Member</th><th>Email</th><th>Role</th></tr></thead>
            <tbody>
              {users.length === 0 ? <tr><td colSpan={3} className="text-center py-6 text-gray-400">No special roles assigned yet.</td></tr>
              : users.map(u => (
                <tr key={u.id}>
                  <td className="font-bold text-navy text-sm">{u.name}</td>
                  <td className="text-sm text-gray-500">{u.email}</td>
                  <td><span className="badge badge-teal">{roleLabel(u.role)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
