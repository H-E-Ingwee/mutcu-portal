import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      localStorage.setItem('mutcu_token', data.token)
      localStorage.setItem('mutcu_user', JSON.stringify(data.user))
      login(data.token, data.user)
      toast.success(`Welcome, ${data.user.name.split(' ')[0]}!`)

      // Enforce verification before dashboard
      if (data.user.must_change_password) {
        navigate('/change-password', { replace: true })
      } else if (!data.user.email_verified) {
        navigate('/verify-email', { replace: true })
      } else if (!data.user.profile_complete) {
        navigate('/profile/complete', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please check your credentials.'
      setError(msg)
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-navy flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{backgroundImage:'radial-gradient(circle at 20% 50%, #FF9700 0%, transparent 50%), radial-gradient(circle at 80% 20%, #30D5C8 0%, transparent 50%)'}} />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl overflow-hidden p-1.5">
            <img src="/mutcu-icon.png" alt="MUTCU" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-montserrat font-bold text-white mb-1">MUTCU DMS</h1>
          <p className="text-white/60 text-sm mb-1">Murang'a University of Technology</p>
          <p className="text-white/40 text-xs mb-8 italic">Christian Union · Digital Management System</p>
          <div className="space-y-3 text-left max-w-xs">
            {['Digital membership & MUTCU numbers','Constitutional e-nomination system','Photo-enabled member directory','NC vetting dashboard','Real-time analytics'].map((f,i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-orange/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-orange" />
                </div>
                <span className="text-white/70 text-sm">{f}</span>
              </div>
            ))}
          </div>
          <p className="text-white/30 text-xs mt-10 italic">Inspire Love, Hope & Godliness</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden p-1.5">
              <img src="/mutcu-icon.png" alt="MUTCU" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-montserrat font-bold text-navy">MUTCU DMS</h1>
            <p className="text-gray-400 text-xs mt-1 italic">Inspire Love, Hope & Godliness</p>
          </div>

          <div className="card p-8">
            <h2 className="text-xl font-montserrat font-bold text-navy mb-1">Sign In</h2>
            <p className="text-gray-500 text-sm mb-6">Enter your credentials to access your account</p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700 font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" placeholder="your@email.com"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  required autoFocus />
              </div>
              <div>
                <label className="form-label">Password</label>
                <div className="relative">
                  <input type={showPass?'text':'password'} className="form-input pr-10"
                    placeholder="Your password" value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})} required />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-orange hover:underline">Forgot password?</Link>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <LogIn size={16} />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              New to MUTCU DMS?{' '}
              <Link to="/register" className="text-orange font-semibold hover:underline">Register here</Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Murang'a University of Technology Christian Union<br />
            <span className="italic">Inspire Love, Hope & Godliness</span>
          </p>
        </div>
      </div>
    </div>
  )
}
