import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Lock } from 'lucide-react'

export default function ChangePassword() {
  const [form, setForm] = useState({ current_password: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password !== form.confirm) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      await api.post('/auth/change-password', { current_password: form.current_password, password: form.password })
      updateUser({ ...user, must_change_password: false })
      toast.success('Password changed successfully!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Lock size={40} className="text-orange mx-auto mb-3" />
          <h2 className="text-xl font-montserrat font-bold text-navy">Change Password</h2>
          {user?.must_change_password && <p className="text-orange text-sm mt-1">You must change your temporary password before continuing.</p>}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="form-label">Current Password</label><input type="password" className="form-input" value={form.current_password} onChange={e => setForm({...form, current_password: e.target.value})} required /></div>
          <div><label className="form-label">New Password</label><input type="password" className="form-input" placeholder="Min 8 characters" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={8} /></div>
          <div><label className="form-label">Confirm New Password</label><input type="password" className="form-input" value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} required /></div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Lock size={16} />}
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
