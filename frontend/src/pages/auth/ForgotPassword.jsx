import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      toast.error('Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Mail size={40} className="text-orange mx-auto mb-3" />
          <h2 className="text-xl font-montserrat font-bold text-navy">Reset Password</h2>
          <p className="text-gray-500 text-sm mt-1">Enter your email to receive a reset link</p>
        </div>
        {sent ? (
          <div className="alert-success"><CheckCircle size={16} /><div>Reset link sent! Check your email inbox.</div></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Mail size={16} />}
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
        <Link to="/login" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-4 justify-center"><ArrowLeft size={12} />Back to login</Link>
      </div>
    </div>
  )
}
