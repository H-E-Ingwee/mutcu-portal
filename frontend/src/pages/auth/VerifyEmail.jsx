import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('pending') // pending, verifying, success, error
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    const id = params.get('id')
    if (token && id) {
      setStatus('verifying')
      api.post('/auth/verify-email', { token, id })
        .then(r => { setStatus('success'); setMessage(r.data.message); setTimeout(() => navigate('/profile/complete'), 2000) })
        .catch(err => { setStatus('error'); setMessage(err.response?.data?.error || 'Verification failed') })
    }
  }, [])

  const resend = async () => {
    setResending(true)
    try {
      await api.post('/auth/resend-verification')
      toast.success('Verification email resent!')
    } catch (err) {
      toast.error('Failed to resend. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange mx-auto mb-4" />
            <h2 className="text-xl font-montserrat font-bold text-navy mb-2">Verifying your email...</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-montserrat font-bold text-navy mb-2">Email Verified!</h2>
            <p className="text-gray-500 text-sm">{message}</p>
            <p className="text-gray-400 text-xs mt-2">Redirecting to profile setup...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red mx-auto mb-4" />
            <h2 className="text-xl font-montserrat font-bold text-navy mb-2">Verification Failed</h2>
            <p className="text-gray-500 text-sm mb-4">{message}</p>
            {user && <button onClick={resend} disabled={resending} className="btn-primary mx-auto"><RefreshCw size={14} />Resend Verification Email</button>}
          </>
        )}
        {status === 'pending' && (
          <>
            <Mail size={48} className="text-orange mx-auto mb-4" />
            <h2 className="text-xl font-montserrat font-bold text-navy mb-2">Check Your Email</h2>
            <p className="text-gray-500 text-sm mb-4">We sent a verification link to <strong>{user?.email}</strong>. Click the link to verify your account.</p>
            <div className="bg-orange/5 rounded-lg p-3 text-xs text-orange mb-4">Check your spam folder if you don't see it within a few minutes.</div>
            {user && <button onClick={resend} disabled={resending} className="btn-outline mx-auto"><RefreshCw size={14} />{resending ? 'Sending...' : 'Resend Email'}</button>}
          </>
        )}
        <Link to="/login" className="block text-xs text-gray-400 hover:text-gray-600 mt-4">Back to login</Link>
      </div>
    </div>
  )
}
