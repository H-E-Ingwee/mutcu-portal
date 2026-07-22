import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Camera, Save } from 'lucide-react'

export default function ProfileComplete() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ student_id: user?.student_id||'', gender: user?.gender||'', year_of_study: user?.year_of_study||'', phone: user?.phone||'', primary_ministry: user?.primary_ministry||'' })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(user?.photo_url || null)
  const [ministries, setMinistries] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { api.get('/ministries').then(r => setMinistries(r.data.ministries||[])).catch(()=>{}) }, [])

  const handlePhoto = e => {
    const file = e.target.files[0]
    if (file) { setPhoto(file); setPreview(URL.createObjectURL(file)) }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      if (photo) {
        const fd = new FormData(); fd.append('photo', photo)
        await api.post('/upload/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      const { data } = await api.put('/users/profile', { ...form, profile_complete: true })
      updateUser(data.user)
      toast.success('Profile saved!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save profile')
    } finally { setLoading(false) }
  }

  const photoUrl = preview || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-montserrat font-bold text-navy">Complete Your Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Add your photo and verify your details</p>
        </div>
        {user?.enrollment_status === 'pending' && (
          <div className="alert-warning mb-4"><AlertCircle size={16} /><div>Your application is pending Secretary approval. Complete your profile while waiting.</div></div>
        )}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={photoUrl} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-orange" />
                <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange rounded-full flex items-center justify-center cursor-pointer hover:bg-orange/90">
                  <Camera size={13} className="text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </label>
              </div>
              <div>
                <div className="font-montserrat font-bold text-navy text-sm">{user?.name}</div>
                <div className="text-gray-400 text-xs">{user?.email}</div>
                <div className="text-xs text-gray-400 mt-1">Click camera to upload photo</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {!user?.student_id && <div className="col-span-2"><label className="form-label">Student Reg. No.</label><input type="text" className="form-input" placeholder="SC200/0396/2022" value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})} /></div>}
              {!user?.gender && <div><label className="form-label">Gender *</label><select className="form-select" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} required><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></select></div>}
              {!user?.year_of_study && <div><label className="form-label">Year of Study *</label><select className="form-select" value={form.year_of_study} onChange={e => setForm({...form, year_of_study: e.target.value})} required><option value="">Select</option>{[1,2,3,4,5,6].map(y=><option key={y} value={y}>Year {y}</option>)}</select></div>}
              <div><label className="form-label">Phone (optional)</label><input type="text" className="form-input" placeholder="+254 7XX XXX XXX" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="form-label">Ministry</label><select className="form-select" value={form.primary_ministry} onChange={e => setForm({...form, primary_ministry: e.target.value})}><option value="">General Member</option>{ministries.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save size={16} />}
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
