import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { UserPlus, Eye, EyeOff, ChevronRight, ChevronLeft, Camera, ZoomIn, ZoomOut, RotateCw, Check } from 'lucide-react'

// Member ministries (can join, max 2) — per Leadership Manual
const MEMBER_MINISTRIES = [
  { name: 'Music Ministry', desc: 'Praise & worship, choir, band and music production' },
  { name: 'Creative Arts Ministry', desc: 'Drama, dance, spoken word and creative expression' },
  { name: 'Technical & Media Ministry', desc: 'Sound, media, digital content and publicity' },
  { name: 'Hospitality Ministry', desc: 'Welcoming, visitor care and fellowship events' },
]

// Fellowship groups (not selectable as ministry — they are year-based)
// Prayer, Missions, Bible Study, Discipleship, Welfare are fellowships

// Exact faith declaration text from MUTCU Constitution Art. 8.2(I)
const FAITH_DECLARATION_TEXT = `I ______, in joining this Union, I declare my faith in Jesus Christ as my Savior, my Lord and God and it is my desire by the grace of God to live a life consistent with this declaration. I am also determined to give active support to The Christian Union as it seeks to fulfill its aims.`

const SCHOOL_MAP = {
  SC: 'School of Computing',
  SE: 'School of Engineering',
  SB: 'School of Business',
  SH: 'School of Health Sciences',
  SA: 'School of Agriculture',
  SS: 'School of Social Sciences',
}

function calcGradYear(studentId, courseType) {
  if (!studentId) return null
  const prefix = studentId.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase()
  const match = studentId.match(/(\d{4})$/)
  if (!match) return null
  const admissionYear = parseInt(match[1])
  if (courseType === 'diploma') return admissionYear + 3
  return admissionYear + (prefix === 'SE' ? 5 : 4)
}

function getMaxYear(courseType, studentId) {
  if (courseType === 'diploma') return 3
  const prefix = (studentId || '').replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase()
  return prefix === 'SE' ? 5 : 4
}

function calcSchool(studentId) {
  if (!studentId) return ''
  const prefix = studentId.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase()
  return SCHOOL_MAP[prefix] || ''
}

// Simple image crop component
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
    // Draw circle guide
    ctx.strokeStyle = '#FF9700'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2)
    ctx.stroke()
  }, [scale, offsetX, offsetY])

  useEffect(() => { drawCanvas() }, [drawCanvas])

  const handleMouseDown = (e) => {
    setDragging(true)
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY })
  }
  const handleMouseMove = (e) => {
    if (!dragging) return
    setOffsetX(e.clientX - dragStart.x)
    setOffsetY(e.clientY - dragStart.y)
  }
  const handleMouseUp = () => setDragging(false)

  const handleCrop = () => {
    const canvas = canvasRef.current
    canvas.toBlob(blob => {
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' })
      onCrop(file, URL.createObjectURL(blob))
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="card p-6 max-w-sm w-full">
        <h3 className="font-montserrat font-bold text-navy text-sm mb-4">Adjust Your Photo</h3>
        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            width={SIZE} height={SIZE}
            className="rounded-full cursor-move border-2 border-orange"
            style={{ width: SIZE, height: SIZE }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
        <div className="flex items-center gap-3 mb-4 justify-center">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="btn-outline btn-sm p-2"><ZoomOut size={14} /></button>
          <input type="range" min="0.5" max="3" step="0.05" value={scale}
            onChange={e => setScale(parseFloat(e.target.value))}
            className="flex-1 accent-orange" />
          <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="btn-outline btn-sm p-2"><ZoomIn size={14} /></button>
        </div>
        <p className="text-xs text-gray-400 text-center mb-4">Drag to reposition · Scroll to zoom</p>
        <div className="flex gap-3">
          <button onClick={handleCrop} className="btn-primary flex-1 justify-center"><Check size={14} />Use This Photo</button>
          <button onClick={onCancel} className="btn-outline flex-1 justify-center">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function Register() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm_password: '',
    student_id: '', gender: '', year_of_study: '',
    course_type: 'degree',
    primary_ministry: '', secondary_ministry: '',
    faith_declaration: false,
    phone: '',
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [rawPhotoSrc, setRawPhotoSrc] = useState(null)
  const [showCropper, setShowCropper] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [gradYear, setGradYear] = useState(null)
  const [school, setSchool] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setGradYear(calcGradYear(form.student_id, form.course_type))
    setSchool(calcSchool(form.student_id))
  }, [form.student_id, form.course_type])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const maxYear = getMaxYear(form.course_type, form.student_id)
  const yearOptions = Array.from({ length: maxYear }, (_, i) => i + 1)

  const handlePhotoSelect = e => {
    const file = e.target.files[0]
    if (!file) return
    const src = URL.createObjectURL(file)
    setRawPhotoSrc(src)
    setShowCropper(true)
  }

  const handleCropDone = (croppedFile, croppedUrl) => {
    setPhoto(croppedFile)
    setPhotoPreview(croppedUrl)
    setShowCropper(false)
  }

  const toggleSecondaryMinistry = (name) => {
    if (form.secondary_ministry === name) {
      set('secondary_ministry', '')
    } else if (form.primary_ministry === name) {
      toast.error('This is already your primary ministry')
    } else {
      set('secondary_ministry', name)
    }
  }

  const validateStep1 = () => {
    if (!form.name.trim()) { toast.error('Full name is required'); return false }
    if (!form.email.trim()) { toast.error('Email is required'); return false }
    if (!form.phone.trim()) { toast.error('Phone number is required'); return false }
    if (!form.password || form.password.length < 8) { toast.error('Password must be at least 8 characters'); return false }
    if (form.password !== form.confirm_password) { toast.error('Passwords do not match'); return false }
    return true
  }

  const validateStep2 = () => {
    if (!form.gender) { toast.error('Please select your gender'); return false }
    if (!form.student_id.trim()) { toast.error('Student registration number is required'); return false }
    if (!form.year_of_study) { toast.error('Please select your year of study'); return false }
    const yr = parseInt(form.year_of_study)
    if (yr > maxYear) { toast.error(`Maximum year for ${form.course_type} is Year ${maxYear}`); return false }
    return true
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.faith_declaration) { toast.error('You must sign the faith declaration to register'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        student_id: form.student_id,
        gender: form.gender,
        year_of_study: form.year_of_study,
        course_type: form.course_type,
        primary_ministry: form.primary_ministry || null,
        secondary_ministry: form.secondary_ministry || null,
        faith_declaration: form.faith_declaration,
      })
      login(data.token, data.user)

      if (photo) {
        try {
          const fd = new FormData()
          fd.append('photo', photo)
          await api.post('/upload/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        } catch {}
      }

      toast.success('Registration successful! Please check your email to verify your account.')
      navigate('/verify-email')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  const steps = ['Personal Info', 'Academic Details', 'Ministry & Declaration']

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {showCropper && rawPhotoSrc && (
        <PhotoCropper
          src={rawPhotoSrc}
          onCrop={handleCropDone}
          onCancel={() => setShowCropper(false)}
        />
      )}

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100 overflow-hidden p-1">
            <img src="/mutcu-icon.png" alt="MUTCU" className="w-full h-full object-contain"
              onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-navy font-bold text-lg">M</span>' }} />
          </div>
          <h1 className="text-2xl font-montserrat font-bold text-navy">Join MUTCU DMS</h1>
          <p className="text-gray-500 text-sm mt-1">Register as a MUTCU member</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-montserrat font-bold transition-all ${step > i + 1 ? 'bg-teal text-white' : step === i + 1 ? 'bg-navy text-white' : 'bg-gray-200 text-gray-400'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-montserrat font-semibold hidden sm:block ${step === i + 1 ? 'text-navy' : 'text-gray-400'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`w-8 h-0.5 ${step > i + 1 ? 'bg-teal' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit}>

            {/* ── Step 1: Personal Info ── */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-montserrat font-bold text-navy text-sm mb-4">Personal Information</h2>

                {/* Photo upload with crop */}
                <div className="flex items-center gap-4 mb-2">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                      {photoPreview
                        ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        : <Camera size={20} className="text-gray-400" />}
                    </div>
                    <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange rounded-full flex items-center justify-center cursor-pointer hover:bg-orange/90">
                      <Camera size={11} className="text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                    </label>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-navy">Passport Photo</div>
                    <div className="text-xs text-gray-400">Optional — you can add later</div>
                    {photoPreview && (
                      <button type="button" onClick={() => setShowCropper(true)}
                        className="text-xs text-orange hover:underline mt-0.5">Adjust crop</button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">Full Name <span className="text-red">*</span></label>
                  <input type="text" className="form-input" placeholder="As per university records"
                    value={form.name} onChange={e => set('name', e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="form-label">Email Address <span className="text-red">*</span></label>
                  <input type="email" className="form-input" placeholder="your@email.com"
                    value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Phone Number <span className="text-red">*</span></label>
                  <input type="tel" className="form-input" placeholder="+254 7XX XXX XXX"
                    value={form.phone} onChange={e => set('phone', e.target.value)} required />
                  <p className="text-xs text-gray-400 mt-1">Required for official CU communication</p>
                </div>
                <div>
                  <label className="form-label">Password <span className="text-red">*</span></label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} className="form-input pr-10"
                      placeholder="Minimum 8 characters" value={form.password}
                      onChange={e => set('password', e.target.value)} required minLength={8} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label">Confirm Password <span className="text-red">*</span></label>
                  <input type="password" className="form-input" placeholder="Repeat password"
                    value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} required />
                </div>
                <button type="button" onClick={() => validateStep1() && setStep(2)} className="btn-primary w-full justify-center py-3">
                  Next: Academic Details <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* ── Step 2: Academic Details ── */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-montserrat font-bold text-navy text-sm mb-4">Academic Details</h2>

                {/* Course type */}
                <div>
                  <label className="form-label">Course Type <span className="text-red">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'degree', label: 'Degree', desc: 'Bachelor\'s degree (4–5 years)' },
                      { value: 'diploma', label: 'Diploma', desc: 'Diploma programme (3 years)' },
                    ].map(ct => (
                      <div key={ct.value} onClick={() => { set('course_type', ct.value); set('year_of_study', '') }}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${form.course_type === ct.value ? 'border-orange bg-orange/5' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="font-semibold text-navy text-sm">{ct.label}</div>
                        <div className="text-xs text-gray-400">{ct.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="form-label">Student Registration No. <span className="text-red">*</span></label>
                  <input type="text" className="form-input" placeholder="e.g. SC200/0396/2022"
                    value={form.student_id} onChange={e => set('student_id', e.target.value)} required />
                  {form.student_id && (
                    <div className="mt-1.5 flex gap-3 text-xs flex-wrap">
                      {school && <span className="text-teal font-semibold">📚 {school}</span>}
                      {gradYear && <span className="text-orange font-semibold">🎓 Expected graduation: {gradYear}</span>}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Gender <span className="text-red">*</span></label>
                    <select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)} required>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Year of Study <span className="text-red">*</span></label>
                    <select className="form-select" value={form.year_of_study} onChange={e => set('year_of_study', e.target.value)} required>
                      <option value="">Select</option>
                      {yearOptions.map(y => (
                        <option key={y} value={y}>
                          Year {y}{y === maxYear ? ' (Finalist)' : ''}
                        </option>
                      ))}
                    </select>
                    {form.year_of_study && parseInt(form.year_of_study) === maxYear && (
                      <p className="text-xs text-orange mt-1 font-semibold">
                        ⚠️ As a finalist you can nominate others but cannot be nominated for EC positions (Art. 12.4.b)
                      </p>
                    )}
                    {form.year_of_study && parseInt(form.year_of_study) === 1 && (
                      <p className="text-xs text-orange mt-1 font-semibold">
                        ⚠️ First-year students cannot nominate or be nominated (Art. 8.3.I.b)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-outline flex-1 justify-center">
                    <ChevronLeft size={16} />Back
                  </button>
                  <button type="button" onClick={() => validateStep2() && setStep(3)} className="btn-primary flex-1 justify-center">
                    Next: Ministry <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Ministry & Declaration ── */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-montserrat font-bold text-navy text-sm mb-1">Ministry & Faith Declaration</h2>

                {/* Primary Ministry */}
                <div>
                  <label className="form-label">
                    Primary Ministry <span className="text-gray-400 normal-case font-normal">(optional — max 2 total)</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-2">Select from the member ministries below. Other CU activities (Prayer, Missions, Bible Study, Discipleship, Welfare) are fellowships open to all members.</p>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    <div onClick={() => { set('primary_ministry', ''); set('secondary_ministry', '') }}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${!form.primary_ministry ? 'border-navy bg-navy/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="font-semibold text-navy text-sm">General Member</div>
                      <div className="text-xs text-gray-400">Not assigned to a specific ministry</div>
                    </div>
                    {MEMBER_MINISTRIES.map(m => (
                      <div key={m.name} onClick={() => set('primary_ministry', m.name)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${form.primary_ministry === m.name ? 'border-orange bg-orange/5' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="font-semibold text-navy text-sm">{m.name}</div>
                        <div className="text-xs text-gray-400">{m.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Secondary Ministry */}
                {form.primary_ministry && (
                  <div>
                    <label className="form-label">
                      Secondary Ministry <span className="text-gray-400 normal-case font-normal">(optional)</span>
                    </label>
                    <div className="space-y-2">
                      {MEMBER_MINISTRIES.filter(m => m.name !== form.primary_ministry).map(m => (
                        <div key={m.name} onClick={() => toggleSecondaryMinistry(m.name)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${form.secondary_ministry === m.name ? 'border-teal bg-teal/5' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-navy text-sm">{m.name}</div>
                            {form.secondary_ministry === m.name && <span className="text-xs text-teal font-bold">Selected</span>}
                          </div>
                          <div className="text-xs text-gray-400">{m.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Faith Declaration — exact constitutional text */}
                <div className="bg-navy/5 rounded-xl p-4 border border-navy/10">
                  <h3 className="font-montserrat font-bold text-navy text-sm mb-2">Faith Declaration</h3>
                  <p className="text-xs text-gray-500 mb-2 italic">MUTCU Constitution, Article 8.2(I) — Official Declaration:</p>
                  <div className="bg-white rounded-lg p-3 border border-gray-200 mb-3">
                    <p className="text-gray-700 text-xs leading-relaxed font-medium">
                      {FAITH_DECLARATION_TEXT.replace('______', form.name || '______')}
                    </p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 accent-orange flex-shrink-0"
                      checked={form.faith_declaration} onChange={e => set('faith_declaration', e.target.checked)} />
                    <span className="text-sm text-gray-700 font-semibold">
                      I, <strong className="text-navy">{form.name || '[Your Name]'}</strong>, consciously sign this faith declaration and agree to the above statement. <span className="text-red">*</span>
                    </span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="btn-outline flex-1 justify-center">
                    <ChevronLeft size={16} />Back
                  </button>
                  <button type="submit" disabled={loading || !form.faith_declaration} className="btn-primary flex-1 justify-center">
                    {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <UserPlus size={16} />}
                    {loading ? 'Registering...' : 'Complete Registration'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already registered? <Link to="/login" className="text-orange font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}