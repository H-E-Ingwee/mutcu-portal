import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Camera, Save, Lock, CheckCircle, Circle, ZoomIn, ZoomOut, Check, X } from 'lucide-react'
import { Link } from 'react-router-dom'

// Photo crop component (same as Register)
function PhotoCropper({ src, onCrop, onCancel }) {
  const canvasRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const imgRef = useRef(new Image())
  const SIZE = 280

  useEffect(() => {
    imgRef.current.onload = () => drawCanvas()
    imgRef.current.src = src
  }, [src])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const img = imgRef.current
    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.save()
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    const w = img.width * scale
    const h = img.height * scale
    ctx.drawImage(img, (SIZE - w) / 2 + offsetX, (SIZE - h) / 2 + offsetY, w, h)
    ctx.restore()
    ctx.strokeStyle = '#FF9700'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2)
    ctx.stroke()
  }, [scale, offsetX, offsetY])

  useEffect(() => { drawCanvas() }, [drawCanvas])

  const handleMouseDown = (e) => { setDragging(true); setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY }) }
  const handleMouseMove = (e) => { if (!dragging) return; setOffsetX(e.clientX - dragStart.x); setOffsetY(e.clientY - dragStart.y) }
  const handleMouseUp = () => setDragging(false)

  const handleCrop = () => {
    canvasRef.current.toBlob(blob => {
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' })
      onCrop(file, URL.createObjectURL(blob))
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="card p-6 max-w-sm w-full">
        <h3 className="font-montserrat font-bold text-navy text-sm mb-4">Adjust Your Photo</h3>
        <div className="flex justify-center mb-4">
          <canvas ref={canvasRef} width={SIZE} height={SIZE}
            className="rounded-full cursor-move border-2 border-orange"
            style={{ width: SIZE, height: SIZE }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
        </div>
        <div className="flex items-center gap-3 mb-4 justify-center">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="btn-outline btn-sm p-2"><ZoomOut size={14} /></button>
          <input type="range" min="0.5" max="3" step="0.05" value={scale}
            onChange={e => setScale(parseFloat(e.target.value))} className="flex-1 accent-orange" />
          <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="btn-outline btn-sm p-2"><ZoomIn size={14} /></button>
        </div>
        <p className="text-xs text-gray-400 text-center mb-4">Drag to reposition · Slider to zoom</p>
        <div className="flex gap-3">
          <button onClick={handleCrop} className="btn-primary flex-1 justify-center"><Check size={14} />Use This Photo</button>
          <button onClick={onCancel} className="btn-outline flex-1 justify-center">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function ProfileEdit() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({
    phone: user?.phone || '',
    primary_ministry: user?.primary_ministry || '',
    secondary_ministry: user?.secondary_ministry || '',
  })
  // Fields requiring approval
  const [pendingForm, setPendingForm] = useState({
    email: user?.email || '',
    year_of_study: user?.year_of_study || '',
    student_id: user?.student_id || '',
    course_type: user?.course_type || 'degree',
  })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(user?.photo_url || null)
  const [rawPhotoSrc, setRawPhotoSrc] = useState(null)
  const [showCropper, setShowCropper] = useState(false)
  const [ministries, setMinistries] = useState([])
  const [loading, setLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)

  const MEMBER_MINISTRIES = ['Music Ministry', 'Creative Arts Ministry', 'Technical & Media Ministry', 'Hospitality Ministry']

  useEffect(() => {
    api.get('/ministries').then(r => setMinistries(r.data.ministries || [])).catch(() => {})
  }, [])

  const handlePhotoSelect = e => {
    const file = e.target.files[0]
    if (!file) return
    setRawPhotoSrc(URL.createObjectURL(file))
    setShowCropper(true)
  }

  const handleCropDone = async (croppedFile, croppedUrl) => {
    setPhoto(croppedFile)
    setPreview(croppedUrl)
    setShowCropper(false)
    // Auto-upload photo immediately
    setPhotoLoading(true)
    try {
      const fd = new FormData()
      fd.append('photo', croppedFile)
      const { data: uploadData } = await api.post('/upload/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      updateUser({ ...user, photo_url: uploadData.url })
      toast.success('Photo updated successfully!')
    } catch (err) {
      toast.error('Photo upload failed. Please try again.')
    } finally {
      setPhotoLoading(false)
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        phone: form.phone,
        primary_ministry: form.primary_ministry || null,
        secondary_ministry: form.secondary_ministry || null,
      }

      // Add pending fields if changed
      if (pendingForm.email !== user?.email) payload.email = pendingForm.email
      if (parseInt(pendingForm.year_of_study) !== user?.year_of_study) payload.year_of_study = pendingForm.year_of_study
      if (pendingForm.student_id !== user?.student_id) payload.student_id = pendingForm.student_id
      if (pendingForm.course_type !== user?.course_type) payload.course_type = pendingForm.course_type

      const { data } = await api.put('/users/profile', payload)
      updateUser(data.user)
      toast.success(data.message || 'Profile updated!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed')
    } finally { setLoading(false) }
  }

  const photoUrl = preview || user?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`

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
      {showCropper && rawPhotoSrc && (
        <PhotoCropper src={rawPhotoSrc} onCrop={handleCropDone} onCancel={() => setShowCropper(false)} />
      )}

      <div className="page-header"><div><h1 className="page-title">My Profile</h1></div></div>

      {/* Completion Progress */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-montserrat font-bold text-navy text-sm">Profile Completion</span>
          <span className="font-montserrat font-bold text-orange text-sm">{completionPct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-gradient-to-r from-orange to-teal rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {s.done ? <CheckCircle size={13} className="text-teal flex-shrink-0" /> : <Circle size={13} className="text-gray-300 flex-shrink-0" />}
              <span className={s.done ? 'text-gray-600' : 'text-gray-400'}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pending changes notice */}
      {user?.pending_changes && (
        <div className="card p-4 mb-5 border-l-4 border-orange bg-orange/5">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-orange" />
            <div>
              <div className="font-semibold text-navy text-sm">Profile Changes Pending Approval</div>
              <div className="text-xs text-gray-500">Some of your profile changes are awaiting secretary approval.</div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Photo Section */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <img src={photoUrl} alt={user?.name} className="w-20 h-20 rounded-full object-cover border-2 border-orange" />
              {photoLoading && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange rounded-full flex items-center justify-center cursor-pointer hover:bg-orange/90 shadow-md">
                <Camera size={13} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </label>
            </div>
            <div>
              <div className="font-montserrat font-bold text-navy">{user?.name}</div>
              <div className="text-gray-400 text-xs">{user?.email}</div>
              {user?.mutcu_number && <div className="text-orange font-montserrat font-bold text-sm mt-1">{user.mutcu_number}</div>}
              <button type="button" onClick={() => document.querySelector('input[type=file]').click()}
                className="text-xs text-orange hover:underline mt-1 block">
                {user?.photo_url ? 'Change photo' : 'Upload photo'}
              </button>
            </div>
          </div>

          {/* Directly editable fields */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="font-montserrat font-bold text-navy text-sm mb-3">Contact Information</h3>
            <div>
              <label className="form-label">Phone Number</label>
              <input type="tel" className="form-input" placeholder="+254 7XX XXX XXX"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          {/* Ministry selection */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="font-montserrat font-bold text-navy text-sm mb-3">Ministry</h3>
            <div className="space-y-3">
              <div>
                <label className="form-label">Primary Ministry</label>
                <select className="form-select" value={form.primary_ministry} onChange={e => setForm(f => ({ ...f, primary_ministry: e.target.value }))}>
                  <option value="">General Member</option>
                  {MEMBER_MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {form.primary_ministry && (
                <div>
                  <label className="form-label">Secondary Ministry <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                  <select className="form-select" value={form.secondary_ministry} onChange={e => setForm(f => ({ ...f, secondary_ministry: e.target.value }))}>
                    <option value="">None</option>
                    {MEMBER_MINISTRIES.filter(m => m !== form.primary_ministry).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Fields requiring approval */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-montserrat font-bold text-navy text-sm">Academic Details</h3>
              <div className="flex items-center gap-1 bg-orange/10 border border-orange/20 rounded px-2 py-0.5">
                <Lock size={10} className="text-orange" />
                <span className="text-xs text-orange font-semibold">Requires Secretary Approval</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" value={pendingForm.email}
                  onChange={e => setPendingForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Student Reg. No.</label>
                <input type="text" className="form-input" value={pendingForm.student_id}
                  onChange={e => setPendingForm(f => ({ ...f, student_id: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Course Type</label>
                <select className="form-select" value={pendingForm.course_type} onChange={e => setPendingForm(f => ({ ...f, course_type: e.target.value }))}>
                  <option value="degree">Degree</option>
                  <option value="diploma">Diploma</option>
                </select>
              </div>
              <div>
                <label className="form-label">Year of Study</label>
                <select className="form-select" value={pendingForm.year_of_study} onChange={e => setPendingForm(f => ({ ...f, year_of_study: e.target.value }))}>
                  <option value="">Select</option>
                  {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Changes to email, student ID, course type, and year of study will be reviewed by the Secretary before taking effect.</p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save size={16} />}
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card p-5 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-montserrat font-bold text-navy text-sm">Password</div>
            <div className="text-xs text-gray-400">Change your account password</div>
          </div>
          <Link to="/change-password" className="btn-outline btn-sm">Change Password</Link>
        </div>
      </div>
    </div>
  )
}