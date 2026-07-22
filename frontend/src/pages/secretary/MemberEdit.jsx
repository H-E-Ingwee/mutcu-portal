import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Save } from 'lucide-react'

export default function MemberEdit() {
  const { id } = useParams()
  const [member, setMember] = useState(null)
  const [form, setForm] = useState({})
  const [ministries, setMinistries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([api.get(`/members/${id}`), api.get('/ministries')]).then(([mRes, minRes]) => {
      const m = mRes.data.member
      setMember(m)
      setForm({ name: m.name, student_id: m.student_id||'', gender: m.gender||'', year_of_study: m.year_of_study||'', membership_type: m.membership_type||'full', enrollment_status: m.enrollment_status||'pending', primary_ministry: m.primary_ministry||'', disciplinary_status: m.disciplinary_status||'clear', is_finalist: m.is_finalist||false, sgc_executive_role: m.sgc_executive_role||false })
      setMinistries(minRes.data.ministries||[])
    }).finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.put(`/members/${id}`, form)
      toast.success('Member updated')
      navigate('/secretary/members')
    } catch (err) { toast.error(err.response?.data?.error || 'Update failed') }
    finally { setSaving(false) }
  }

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  const photoUrl = member?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header"><div><Link to="/secretary/members" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2"><ArrowLeft size={12} />Back</Link><h1 className="page-title">Edit Member</h1></div></div>
      <div className="card p-4 mb-5 flex items-center gap-3">
        <img src={photoUrl} alt={member?.name} className="w-12 h-12 rounded-full object-cover border-2 border-orange" />
        <div><div className="font-bold text-navy">{member?.name}</div><div className="text-xs text-gray-400">{member?.email} · {member?.mutcu_number||'No MUTCU number'}</div></div>
      </div>
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="form-label">Full Name *</label><input type="text" className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required /></div>
            <div><label className="form-label">Student Reg. No.</label><input type="text" className="form-input" value={form.student_id} onChange={e => set('student_id', e.target.value)} /></div>
            <div><label className="form-label">Gender</label><select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></select></div>
            <div><label className="form-label">Year of Study</label><select className="form-select" value={form.year_of_study} onChange={e => set('year_of_study', e.target.value)}><option value="">Select</option>{[1,2,3,4,5,6].map(y=><option key={y} value={y}>Year {y}</option>)}</select></div>
            <div><label className="form-label">Membership Type</label><select className="form-select" value={form.membership_type} onChange={e => set('membership_type', e.target.value)}><option value="full">Full</option><option value="special">Special</option><option value="associate">Associate</option></select></div>
            <div><label className="form-label">Enrollment Status</label><select className="form-select" value={form.enrollment_status} onChange={e => set('enrollment_status', e.target.value)}><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option></select></div>
            <div><label className="form-label">Disciplinary Status</label><select className="form-select" value={form.disciplinary_status} onChange={e => set('disciplinary_status', e.target.value)}><option value="clear">Clear</option><option value="under_review">Under Review</option><option value="suspended">Suspended</option></select></div>
            <div><label className="form-label">Primary Ministry</label><select className="form-select" value={form.primary_ministry} onChange={e => set('primary_ministry', e.target.value)}><option value="">General Member</option>{ministries.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
            <div className="col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-orange" checked={form.is_finalist} onChange={e => set('is_finalist', e.target.checked)} /><span className="text-sm text-gray-700">Mark as Finalist</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-orange" checked={form.sgc_executive_role} onChange={e => set('sgc_executive_role', e.target.checked)} /><span className="text-sm text-gray-700">Holds SGC Executive Post</span></label>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary"><Save size={15} />{saving ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>
    </div>
  )
}
