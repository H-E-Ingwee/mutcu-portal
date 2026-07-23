import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Camera, Save, Lock, CheckCircle, Circle } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ProfileEdit() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ phone: user?.phone||'', primary_ministry: user?.primary_ministry||'' })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(user?.photo_url||null)
  const [ministries, setMinistries] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { api.get('/ministries').then(r => setMinistries(r.data.ministries||[])).catch(()=>{}) }, [])

  const handlePhoto = e => { const f = e.target.files[0]; if(f){setPhoto(f);setPreview(URL.createObjectURL(f))} }

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    try {
      if (photo) {
        const fd = new FormData(); fd.append('photo', photo)
        const { data: uploadData } = await api.post('/upload/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        updateUser({ ...user, photo_url: uploadData.url })
      }
      const { data } = await api.put('/users/profile', form)
      updateUser(data.user)
      toast.success('Profile updated!')
    } catch (err) { toast.error(err.response?.data?.error || 'Update failed') }
    finally { setLoading(false) }
  }

  const photoUrl = preview || user?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`

  // Profile completion steps
  const steps = [
    { label: 'Account created', done: true },
    { label: 'Passport photo uploaded', done: !!user?.photo_url },
    { label: 'Student ID added', done: !!user?.student_id },
    { label: 'Ministry assigned', done: !!user?.primary_ministry },
    { label: 'Membership approved', done: user?.enrollment_status === 'active' },
    { label: 'MUTCU number assigned', done: !!user?.mutcu_number },
  ]
  const completedSteps = steps.filter(s => s.done).length
  const completionPct = Math.round((completedSteps / steps.length) * 100)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header"><div><h1 className="page-title">My Profile</h1></div></div>

      {/* Completion Progress */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-montserrat font-bold text-navy text-sm">Profile Completion</span>
          <span className="font-montserrat font-bold text-orange text-sm">{completionPct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-gradient-to-r from-orange to-teal rounded-full transition-all duration-500" style={{width:`${completionPct}%`}} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {steps.map((s,i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              {s.done ? <CheckCircle size={12} className="text-teal flex-shrink-0" /> : <Circle size={12} className="text-gray-300 flex-shrink-0" />}
              <span className={s.done ? 'text-gray-600' : 'text-gray-400'}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Summary */}
      <div className="card p-5 mb-5 flex items-center gap-4">
        <div className="relative">
          <img src={photoUrl} alt={user?.name} className="w-16 h-16 rounded-full object-cover border-2 border-orange" />
          <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange rounded-full flex items-center justify-center cursor-pointer hover:bg-orange/90">
            <Camera size={11} className="text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </label>
        </div>
        <div className="flex-1">
          <div className="font-montserrat font-bold text-navy">{user?.name}</div>
          <div className="text-gray-400 text-xs">{user?.email}</div>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {user?.mutcu_number && <span className="badge badge-orange">{user.mutcu_number}</span>}
            <span className="badge badge-teal">{user?.membership_type} member</span>
            {user?.year_of_study && <span className="badge badge-navy">Year {user.year_of_study}</span>}
          </div>
        </div>
      </div>

      {/* Read-only info */}
      <div className="card mb-5">
        <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Account Information</h2></div>
        <div>
          {[['Student Reg. No.',user?.student_id||'—'],['School',user?.school_prefix||'—'],['Gender',user?.gender?user.gender.charAt(0).toUpperCase()+user.gender.slice(1):'—'],['Year of Study',user?.year_of_study?`Year ${user.year_of_study}`:'—'],['Valid Period',user?.graduation_year?`${user?.enrollment_year||'—'} – ${user.graduation_year}`:'—']].map(([label,value],i) => (
            <div key={i} className={`flex justify-between items-center px-5 py-3 text-sm ${i<4?'border-b border-gray-50':''}`}>
              <span className="text-gray-400 text-xs font-montserrat font-semibold uppercase tracking-wide">{label}</span>
              <span className="font-semibold text-navy">{value}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-blue-50 text-xs text-blue-600 rounded-b-xl">To update student ID, year, or gender — contact the CU Secretary.</div>
      </div>

      {/* Editable */}
      <div className="card mb-5">
        <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Update Profile</h2></div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="form-label">Phone Number</label><input type="text" className="form-input" placeholder="+254 7XX XXX XXX" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div><label className="form-label">Primary Ministry</label><select className="form-select" value={form.primary_ministry} onChange={e => setForm({...form, primary_ministry: e.target.value})}><option value="">General Member</option>{ministries.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
            <button type="submit" disabled={loading} className="btn-primary"><Save size={15} />{loading ? 'Saving...' : 'Save Changes'}</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Security</h2></div>
        <div className="card-body"><Link to="/change-password" className="btn-outline"><Lock size={14} />Change Password</Link></div>
      </div>
    </div>
  )
}
