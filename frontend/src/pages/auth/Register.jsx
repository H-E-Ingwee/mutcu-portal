import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { UserPlus, Eye, EyeOff, ChevronRight, ChevronLeft, Camera } from 'lucide-react'

const MINISTRIES_INFO = [
  { name: 'Prayer Ministry', desc: 'Corporate prayer, prayer weeks, fasting and intercession' },
  { name: 'Music Ministry', desc: 'Praise & worship, choir, band and music production' },
  { name: 'Missions & Evangelism Ministry', desc: 'Outreach, evangelism and community impact' },
  { name: 'Bible Study & Training Ministry', desc: 'Bible study groups, BEST-P and scripture engagement' },
  { name: 'Discipleship Ministry', desc: 'Nurturing, accountability groups and spiritual growth' },
  { name: 'Technical & Media Ministry', desc: 'Sound, media, digital content and publicity' },
  { name: 'Creative Arts Ministry', desc: 'Drama, dance, spoken word and creative expression' },
  { name: 'Hospitality Ministry', desc: 'Welcoming, visitor care and fellowship events' },
  { name: 'Welfare Ministry', desc: 'Counselling, member care and community support' },
]

function calcGradYear(studentId) {
  if (!studentId) return null
  const prefix = studentId.replace(/[^A-Za-z]/g,'').substring(0,2).toUpperCase()
  const match = studentId.match(/(\d{4})$/)
  if (!match) return null
  const admissionYear = parseInt(match[1])
  return admissionYear + (prefix === 'SE' ? 5 : 4)
}

function calcSchool(studentId) {
  if (!studentId) return ''
  const prefix = studentId.replace(/[^A-Za-z]/g,'').substring(0,2).toUpperCase()
  const map = { SC:'School of Computing', SE:'School of Engineering', SB:'School of Business', SH:'School of Health Sciences', SA:'School of Agriculture', SS:'School of Social Sciences' }
  return map[prefix] || ''
}

export default function Register() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name:'', email:'', password:'', confirm_password:'',
    student_id:'', gender:'', year_of_study:'',
    primary_ministry:'', faith_declaration: false,
    phone:''
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [gradYear, setGradYear] = useState(null)
  const [school, setSchool] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setGradYear(calcGradYear(form.student_id))
    setSchool(calcSchool(form.student_id))
  }, [form.student_id])

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const handlePhoto = e => {
    const file = e.target.files[0]
    if (file) { setPhoto(file); setPhotoPreview(URL.createObjectURL(file)) }
  }

  const validateStep1 = () => {
    if (!form.name.trim()) { toast.error('Full name is required'); return false }
    if (!form.email.trim()) { toast.error('Email is required'); return false }
    if (!form.password || form.password.length < 8) { toast.error('Password must be at least 8 characters'); return false }
    if (form.password !== form.confirm_password) { toast.error('Passwords do not match'); return false }
    return true
  }

  const validateStep2 = () => {
    if (!form.gender) { toast.error('Please select your gender'); return false }
    if (!form.year_of_study) { toast.error('Please select your year of study'); return false }
    return true
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.faith_declaration) { toast.error('You must sign the faith declaration to register'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      login(data.token, data.user)

      // Upload photo if provided
      if (photo) {
        try {
          const fd = new FormData(); fd.append('photo', photo)
          await api.post('/upload/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        } catch {}
      }

      toast.success('Registration successful! Please verify your email.')
      navigate('/verify-email')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  const steps = ['Personal Info', 'Academic Details', 'Ministry & Declaration']

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100 overflow-hidden p-1">
            <img src="/mutcu-icon.png" alt="MUTCU" className="w-full h-full object-contain"
              onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='<span class="text-navy font-bold text-lg">M</span>' }} />
          </div>
          <h1 className="text-2xl font-montserrat font-bold text-navy">Join MUTCU DMS</h1>
          <p className="text-gray-500 text-sm mt-1">Register as a MUTCU member</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-montserrat font-bold transition-all ${step > i+1 ? 'bg-teal text-white' : step === i+1 ? 'bg-navy text-white' : 'bg-gray-200 text-gray-400'}`}>
                {step > i+1 ? '✓' : i+1}
              </div>
              <span className={`text-xs font-montserrat font-semibold hidden sm:block ${step===i+1?'text-navy':'text-gray-400'}`}>{s}</span>
              {i < steps.length-1 && <div className={`w-8 h-0.5 ${step > i+1 ? 'bg-teal' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit}>

            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-montserrat font-bold text-navy text-sm mb-4">Personal Information</h2>

                {/* Photo upload */}
                <div className="flex items-center gap-4 mb-2">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                      {photoPreview
                        ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        : <Camera size={20} className="text-gray-400" />}
                    </div>
                    <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange rounded-full flex items-center justify-center cursor-pointer hover:bg-orange/90">
                      <Camera size={11} className="text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                    </label>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-navy">Passport Photo</div>
                    <div className="text-xs text-gray-400">Optional — you can add later</div>
                  </div>
                </div>

                <div>
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="form-input" placeholder="As per university records"
                    value={form.name} onChange={e => set('name', e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="form-label">Email Address *</label>
                  <input type="email" className="form-input" placeholder="your@email.com"
                    value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Phone Number <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                  <input type="text" className="form-input" placeholder="+254 7XX XXX XXX"
                    value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Password *</label>
                  <div className="relative">
                    <input type={showPass?'text':'password'} className="form-input pr-10"
                      placeholder="Minimum 8 characters" value={form.password}
                      onChange={e => set('password', e.target.value)} required minLength={8} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label">Confirm Password *</label>
                  <input type="password" className="form-input" placeholder="Repeat password"
                    value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} required />
                </div>
                <button type="button" onClick={() => validateStep1() && setStep(2)} className="btn-primary w-full justify-center py-3">
                  Next: Academic Details <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Step 2: Academic Details */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-montserrat font-bold text-navy text-sm mb-4">Academic Details</h2>
                <div>
                  <label className="form-label">Student Registration No.</label>
                  <input type="text" className="form-input" placeholder="SC200/0396/2022"
                    value={form.student_id} onChange={e => set('student_id', e.target.value)} />
                  {form.student_id && (
                    <div className="mt-1.5 flex gap-3 text-xs">
                      {school && <span className="text-teal font-semibold">📚 {school}</span>}
                      {gradYear && <span className="text-orange font-semibold">🎓 Expected graduation: {gradYear}</span>}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Gender *</label>
                    <select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)} required>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Year of Study *</label>
                    <select className="form-select" value={form.year_of_study} onChange={e => set('year_of_study', e.target.value)} required>
                      <option value="">Select</option>
                      {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
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

            {/* Step 3: Ministry & Declaration */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-montserrat font-bold text-navy text-sm mb-4">Ministry & Faith Declaration</h2>
                <div>
                  <label className="form-label">Primary Ministry <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    <div onClick={() => set('primary_ministry', '')}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${!form.primary_ministry?'border-navy bg-navy/5':'border-gray-200 hover:border-gray-300'}`}>
                      <div className="font-semibold text-navy text-sm">General Member</div>
                      <div className="text-xs text-gray-400">Not assigned to a specific ministry</div>
                    </div>
                    {MINISTRIES_INFO.map(m => (
                      <div key={m.name} onClick={() => set('primary_ministry', m.name)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${form.primary_ministry===m.name?'border-orange bg-orange/5':'border-gray-200 hover:border-gray-300'}`}>
                        <div className="font-semibold text-navy text-sm">{m.name}</div>
                        <div className="text-xs text-gray-400">{m.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Faith Declaration */}
                <div className="bg-navy/5 rounded-xl p-4 border border-navy/10">
                  <h3 className="font-montserrat font-bold text-navy text-sm mb-2">Faith Declaration</h3>
                  <p className="text-gray-600 text-xs leading-relaxed mb-3">
                    I consciously profess faith in Jesus Christ as my Lord and Saviour. I commit to upholding the values of MUTCU — <strong>Love, Hope, and Godliness</strong> — and to actively participating in the life of the Christian Union at Murang'a University of Technology.
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 accent-orange flex-shrink-0"
                      checked={form.faith_declaration} onChange={e => set('faith_declaration', e.target.checked)} />
                    <span className="text-sm text-gray-700 font-semibold">
                      I sign this faith declaration and agree to the above statement *
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
