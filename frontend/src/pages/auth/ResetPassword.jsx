import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Lock } from 'lucide-react'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password !== form.confirm) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token: params.get('token'), password: form.password })
      toast.success('Password reset successfully!')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Lock size={40} className="text-orange mx-auto mb-3" />
          <h2 className="text-xl font-montserrat font-bold text-navy">Set New Password</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="form-label">New Password</label><input type="password" className="form-input" placeholder="Min 8 characters" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={8} /></div>
          <div><label className="form-label">Confirm Password</label><input type="password" className="form-input" placeholder="Repeat password" value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} required /></div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Lock size={16} />}
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        <Link to="/login" className="block text-center text-xs text-gray-400 hover:text-gray-600 mt-4">Back to login</Link>
      </div>
    </div>
  )
}
