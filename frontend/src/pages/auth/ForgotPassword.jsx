import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

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
      toast.success('Reset link sent!')
    } catch (err) {
      toast.error('Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-navy/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Mail size={24} className="text-navy" />
          </div>
          <h2 className="text-xl font-montserrat font-bold text-navy">Reset Password</h2>
          <p className="text-gray-500 text-sm mt-1">Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h3 className="font-montserrat font-bold text-navy mb-2">Reset Link Sent!</h3>
            <p className="text-gray-500 text-sm mb-4">
              Check your inbox at <strong>{email}</strong> for the password reset link.
            </p>
            <div className="bg-orange/5 border border-orange/20 rounded-lg p-3 text-xs text-orange mb-4">
              Check your spam folder if you don't see it within a few minutes.
            </div>
            <button onClick={() => setSent(false)} className="btn-outline btn-sm mx-auto">
              Send Again
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading
                ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                : <Mail size={16} />}
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <Link to="/login" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-5 justify-center">
          <ArrowLeft size={12} />Back to login
        </Link>
      </div>
    </div>
  )
}
