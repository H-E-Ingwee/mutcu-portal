import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { User, Mail, Phone, CreditCard, BookOpen, Edit2, Save, X, Camera } from 'lucide-react'

export default function TreasurerProfile() {
  const { user, setUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (user) setForm({ name: user.name, phone: user.phone || '', email: user.email })
    // Load treasurer-specific stats
    api.get('/requisitions/stats/summary').then(r => setStats(r.data.summary)).catch(() => {})
  }, [user])

  const photoUrl = user?.photo_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'T')}&background=04003D&color=FF9700&size=200&bold=true`

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/users/profile', { phone: form.phone })
      toast.success('Profile updated')
      setEditing(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">CU Treasurer — Personal Information</p>
        </div>
        <Link to="/treasurer" className="btn-outline btn-sm">← Back to Dashboard</Link>
      </div>

      {/* Profile Card */}
      <div className="card mb-5">
        <div className="card-body">
          <div className="flex items-center gap-5 mb-6">
            <div className="relative">
              <img src={photoUrl} alt={user?.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-orange" />
              <Link to="/profile/edit"
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange rounded-full flex items-center justify-center shadow-md hover:bg-orange/80 transition-all">
                <Camera size={13} className="text-white" />
              </Link>
            </div>
            <div>
              <h2 className="font-montserrat font-bold text-navy text-lg">{user?.name}</h2>
              <div className="text-sm text-gray-400">CU Treasurer</div>
              {user?.mutcu_number && (
                <div className="mt-1 bg-orange/10 rounded-lg px-2 py-0.5 inline-block">
                  <span className="font-montserrat font-bold text-orange text-xs">{user.mutcu_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* Info Fields */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Mail size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-400 font-semibold">Email</div>
                <div className="text-sm text-navy font-semibold">{user?.email}</div>
              </div>
              <span className="text-xs text-gray-300 italic">Cannot change</span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Phone size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-400 font-semibold">Phone</div>
                {editing ? (
                  <input className="form-input py-1 text-sm mt-1" value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+254 7XX XXX XXX" />
                ) : (
                  <div className="text-sm text-navy font-semibold">{user?.phone || 'Not set'}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <CreditCard size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-400 font-semibold">MUTCU Number</div>
                <div className="text-sm text-navy font-semibold">{user?.mutcu_number || 'Not assigned'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <BookOpen size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-400 font-semibold">Academic</div>
                <div className="text-sm text-navy font-semibold">
                  Year {user?.year_of_study} · {user?.course_type || 'Degree'} · {user?.school || ''}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <User size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-400 font-semibold">Ministry</div>
                <div className="text-sm text-navy font-semibold">{user?.primary_ministry || 'General Member'}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-5">
            {editing ? (
              <>
                <button onClick={save} disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Save size={14} /> Save Changes</>}
                </button>
                <button onClick={() => setEditing(false)} className="btn-outline px-4"><X size={14} /></button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="btn-outline flex-1 justify-center">
                  <Edit2 size={14} /> Edit Phone
                </button>
                <Link to="/profile/edit" className="btn-outline flex-1 justify-center text-center">
                  Full Profile Edit
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Treasurer Stats */}
      {stats && (
        <div className="card">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">My Treasurer Activity</h2></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Requisitions', value: stats.total_submitted || 0, color: 'text-navy' },
                { label: 'Total Disbursed', value: `KES ${(stats.total_disbursed || 0).toLocaleString()}`, color: 'text-green-600' },
                { label: 'Total Approved', value: `KES ${(stats.total_approved || 0).toLocaleString()}`, color: 'text-teal' },
                { label: 'Pending Review', value: stats.by_status?.endorsed || 0, color: 'text-orange' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className={`text-lg font-montserrat font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security */}
      <div className="card mt-5">
        <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Security</h2></div>
        <div className="card-body">
          <Link to="/change-password" className="btn-outline w-full justify-center">Change Password</Link>
        </div>
      </div>
    </div>
  )
}