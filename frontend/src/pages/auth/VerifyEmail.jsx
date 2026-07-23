import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Mail, CheckCircle, XCircle, RefreshCw, Loader } from 'lucide-react'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('pending') // pending | verifying | success | error
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    const id    = params.get('id')

    if (token && id) {
      setStatus('verifying')
      api.post('/auth/verify-email', { token, id })
        .then(r => {
          setStatus('success')
          setMessage(r.data.message)
          toast.success('Email verified!')
          setTimeout(() => navigate('/login'), 2500)
        })
        .catch(err => {
          setStatus('error')
          setMessage(err.response?.data?.error || 'Verification failed. The link may have expired.')
        })
    }
  }, [])

  const resend = async () => {
    setResending(true)
    try {
      await api.post('/auth/resend-verification')
      toast.success('Verification email resent! Check your inbox.')
    } catch {
      toast.error('Failed to resend. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full text-center">

        {/* Verifying */}
        {status === 'verifying' && (
          <>
            <Loader size={48} className="text-orange mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-montserrat font-bold text-navy mb-2">Verifying your email...</h2>
            <p className="text-gray-400 text-sm">Please wait a moment.</p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <CheckCircle size={52} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-montserrat font-bold text-navy mb-2">Email Verified! ✅</h2>
            <p className="text-gray-500 text-sm mb-2">{message}</p>
            <p className="text-gray-400 text-xs mb-6">Redirecting you to login...</p>
            <Link to="/login" className="btn-primary mx-auto">
              Go to Login
            </Link>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <XCircle size={52} className="text-red mx-auto mb-4" />
            <h2 className="text-xl font-montserrat font-bold text-navy mb-2">Verification Failed</h2>
            <p className="text-gray-500 text-sm mb-4">{message}</p>
            <div className="bg-orange/5 border border-orange/20 rounded-lg p-3 text-xs text-orange mb-4">
              The link may have expired. Request a new one below.
            </div>
            {user && (
              <button onClick={resend} disabled={resending} className="btn-primary mx-auto mb-3">
                {resending
                  ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  : <RefreshCw size={14} />
                }
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            )}
          </>
        )}

        {/* Pending — waiting for user to click link in email */}
        {status === 'pending' && (
          <>
            <div className="w-16 h-16 bg-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-orange" />
            </div>
            <h2 className="text-xl font-montserrat font-bold text-navy mb-2">Check Your Email</h2>
            <p className="text-gray-500 text-sm mb-2">
              We sent a verification link to{' '}
              <strong className="text-navy">{user?.email || 'your email address'}</strong>.
            </p>
            <p className="text-gray-400 text-xs mb-4">
              Click the link in the email to verify your account and complete registration.
            </p>

            <div className="bg-orange/5 border border-orange/20 rounded-lg p-3 text-xs text-orange mb-5 text-left">
              <strong>Didn't receive it?</strong><br />
              Check your spam/junk folder. The email comes from <strong>noreply@mutcu.org</strong>.
            </div>

            {user && (
              <button onClick={resend} disabled={resending} className="btn-outline mx-auto mb-3">
                {resending
                  ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-navy" />
                  : <RefreshCw size={14} />
                }
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            )}
          </>
        )}

        <Link to="/login" className="block text-xs text-gray-400 hover:text-gray-600 mt-4">
          Back to login
        </Link>
      </div>
    </div>
  )
}