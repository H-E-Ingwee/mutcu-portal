import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, UserPlus } from 'lucide-react'

export default function MemberCreate() {
  const [form, setForm] = useState({ name:'', email:'', student_id:'', gender:'', year_of_study:'', membership_type:'full', primary_ministry:'', faith_declaration_signed: true })
  const [ministries, setMinistries] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { api.get('/ministries').then(r => setMinistries(r.data.ministries||[])).catch(()=>{}) }, [])

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await api.post('/members', form)
      toast.success(data.message)
      navigate('/secretary/members')
    } catch (err) { toast.error(err.response?.data?.error || 'Enrollment failed') }
    finally { setLoading(false) }
  }

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header"><div><Link to="/secretary/members" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2"><ArrowLeft size={12} />Back</Link><h1 className="page-title">Enroll New Member</h1></div></div>
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="form-label">Full Name *</label><input type="text" className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required /></div>
            <div><label className="form-label">Email *</label><input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
            <div><label className="form-label">Student Reg. No.</label><input type="text" className="form-input" placeholder="SC200/0396/2022" value={form.student_id} onChange={e => set('student_id', e.target.value)} /></div>
            <div><label className="form-label">Gender *</label><select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)} required><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></select></div>
            <div><label className="form-label">Year of Study *</label><select className="form-select" value={form.year_of_study} onChange={e => set('year_of_study', e.target.value)} required><option value="">Select</option>{[1,2,3,4,5,6].map(y=><option key={y} value={y}>Year {y}</option>)}</select></div>
            <div><label className="form-label">Membership Type</label><select className="form-select" value={form.membership_type} onChange={e => set('membership_type', e.target.value)}><option value="full">Full Member</option><option value="special">Special Member</option><option value="associate">Associate Member</option></select></div>
            <div><label className="form-label">Primary Ministry</label><select className="form-select" value={form.primary_ministry} onChange={e => set('primary_ministry', e.target.value)}><option value="">General Member</option>{ministries.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
            <div className="col-span-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 accent-orange" checked={form.faith_declaration_signed} onChange={e => set('faith_declaration_signed', e.target.checked)} />
                <span className="text-sm text-gray-700">I confirm this member has signed the MUTCU faith declaration</span>
              </label>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary"><UserPlus size={15} />{loading ? 'Enrolling...' : 'Enroll Member'}</button>
        </form>
      </div>
    </div>
  )
}
