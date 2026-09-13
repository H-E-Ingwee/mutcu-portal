import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { Mail, ArrowLeft, CheckCircle, Lock } from 'lucide-react'

export default function EmailChange() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=request, 2=verify token, 3=new email, 4=done
  const [token, setToken] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // Step 1: Request verification email
  const requestVerification = async () => {
    setLoading(true)
    try {
      await api.post('/users/request-email-change')
      toast.success('Verification email sent! Check your inbox.')
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send verification email')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify token
  const verifyToken = async () => {
    if (!token.trim()) return toast.error('Please enter the verification token')
    setLoading(true)
    try {
      await api.post('/users/verify-email-change', { token: token.trim() })
      toast.success('Email verified! Now enter your new email address.')
      setStep(3)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid or expired token')
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Set new email
  const setNewEmailAddress = async () => {
    if (!newEmail.trim()) return toast.error('Please enter your new email address')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) return toast.error('Please enter a valid email address')
    setLoading(true)
    try {
      await api.post('/users/verify-email-change', { token: token.trim(), new_email: newEmail.trim() })
      toast.success('Email address updated successfully!')
      setStep(4)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/profile/edit')} className="btn-outline btn-sm">
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="page-title">Change Email Address</h1>
      </div>

      <div className="card p-6">
        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step > s ? 'bg-teal text-white' : step === s ? 'bg-navy text-white' : 'bg-gray-100 text-gray-400'}`}>
                {step > s ? <CheckCircle size={14} /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-teal' : 'bg-gray-100'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Request */}
        {step === 1 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange/10 flex items-center justify-center">
                <Mail size={20} className="text-orange" />
              </div>
              <div>
                <h3 className="font-montserrat font-bold text-navy">Verify Current Email</h3>
                <p className="text-gray-400 text-xs">We'll send a verification link to your current email</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <p className="text-sm text-gray-600">Current email: <strong>{user?.email}</strong></p>
              <p className="text-xs text-gray-400 mt-1">A verification link will be sent to this address to confirm it's you.</p>
            </div>
            <button onClick={requestVerification} disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Sending...' : <><Mail size={14} /> Send Verification Email</>}
            </button>
          </div>
        )}

        {/* Step 2: Enter token */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange/10 flex items-center justify-center">
                <Lock size={20} className="text-orange" />
              </div>
              <div>
                <h3 className="font-montserrat font-bold text-navy">Enter Verification Token</h3>
                <p className="text-gray-400 text-xs">Check your email for the verification link/token</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700">
              <i className="fas fa-info-circle mr-1" />
              Check your inbox at <strong>{user?.email}</strong>. The link expires in 30 minutes.
            </div>
            <div className="mb-4">
              <label className="form-label">Verification Token</label>
              <input className="form-input" placeholder="Paste the token from your email"
                value={token} onChange={e => setToken(e.target.value)} />
              <p className="text-gray-400 text-xs mt-1">The token is in the verification link after "?token="</p>
            </div>
            <div className="flex gap-2">
              <button onClick={verifyToken} disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? 'Verifying...' : 'Verify Token'}
              </button>
              <button onClick={requestVerification} disabled={loading} className="btn-outline px-3 text-xs">
                Resend
              </button>
            </div>
          </div>
        )}

        {/* Step 3: New email */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center">
                <CheckCircle size={20} className="text-teal" />
              </div>
              <div>
                <h3 className="font-montserrat font-bold text-navy">Enter New Email Address</h3>
                <p className="text-gray-400 text-xs">Your current email has been verified</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label">New Email Address <span className="text-orange">*</span></label>
              <input type="email" className="form-input" placeholder="your.new@email.com"
                value={newEmail} onChange={e => setNewEmail(e.target.value)} autoFocus />
            </div>
            <button onClick={setNewEmailAddress} disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Updating...' : <><CheckCircle size={14} /> Update Email Address</>}
            </button>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="text-center py-4">
            <CheckCircle size={48} className="text-teal mx-auto mb-4" />
            <h3 className="font-montserrat font-bold text-navy text-lg mb-2">Email Updated!</h3>
            <p className="text-gray-500 text-sm mb-5">Your email address has been changed to <strong>{newEmail}</strong>. Please log in again with your new email.</p>
            <button onClick={() => { logout(); navigate('/login') }} className="btn-primary">
              Log In Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}