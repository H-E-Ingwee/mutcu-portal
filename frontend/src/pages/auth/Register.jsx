import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { UserPlus, Eye, EyeOff } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm_password:'', student_id:'', gender:'', year_of_study:'', primary_ministry:'', faith_declaration: false })
  const [ministries, setMinistries] = useState([])
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/ministries').then(r => setMinistries(r.data.ministries || [])).catch(() => {})
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password !== form.confirm_password) return toast.error('Passwords do not match')
    if (!form.faith_declaration) return toast.error('You must sign the faith declaration to register')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      login(data.token, data.user)
      toast.success('Registration successful! Please verify your email.')
      navigate('/verify-email')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-navy rounded-2xl flex items-center justify-center mx-auto mb-3">
            <img src="/mutcu-icon.png" alt="MUTCU" className="w-10 h-10 object-contain" onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='<span class="text-white font-bold text-lg">M</span>' }} />
          </div>
          <h1 className="text-2xl font-montserrat font-bold text-navy">Join MUTCU DMS</h1>
          <p className="text-gray-500 text-sm mt-1">Register as a MUTCU member</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-input" placeholder="As per university records" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Email Address *</label>
                <input type="email" className="form-input" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Student Reg. No.</label>
                <input type="text" className="form-input" placeholder="SC200/0396/2022" value={form.student_id} onChange={e => set('student_id', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Password *</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="form-input pr-10" placeholder="Min 8 characters" value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><EyeOff size={15} /></button>
                </div>
              </div>
              <div>
                <label className="form-label">Confirm Password *</label>
                <input type="password" className="form-input" placeholder="Repeat password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Gender *</label>
                <select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)} required>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="form-label">Year of Study *</label>
                <select className="form-select" value={form.year_of_study} onChange={e => set('year_of_study', e.target.value)} required>
                  <option value="">Select year</option>
                  {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Primary Ministry</label>
                <select className="form-select" value={form.primary_ministry} onChange={e => set('primary_ministry', e.target.value)}>
                  <option value="">General Member (no specific ministry)</option>
                  {ministries.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-navy/5 rounded-xl p-4 border border-navy/10">
              <h3 className="font-montserrat font-bold text-navy text-sm mb-2">Faith Declaration</h3>
              <p className="text-gray-600 text-xs leading-relaxed mb-3">I consciously profess faith in Jesus Christ as my Lord and Saviour. I commit to upholding the values of MUTCU — Love, Hope, and Godliness — and to actively participating in the life of the Christian Union.</p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 accent-orange" checked={form.faith_declaration} onChange={e => set('faith_declaration', e.target.checked)} />
                <span className="text-sm text-gray-700 font-semibold">I sign this faith declaration and agree to the above statement *</span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <UserPlus size={16} />}
              {loading ? 'Registering...' : 'Register as MUTCU Member'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already registered? <Link to="/login" className="text-orange font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
