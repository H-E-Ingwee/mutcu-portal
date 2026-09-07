import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Search, Users, Send, CheckCircle, X, Plus, Bell } from 'lucide-react'

export default function MinistryMembers() {
  const { user, getMyMinistry } = useAuth()
  const myMinistry = getMyMinistry() || user?.primary_ministry

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('active')
  const [showUpdate, setShowUpdate] = useState(false)
  const [updateForm, setUpdateForm] = useState({ title: '', body: '', meeting_day: '', meeting_time: '', meeting_venue: '', content_type: 'announcement' })
  const [saving, setSaving] = useState(false)
  const [ministryContent, setMinistryContent] = useState([])

  useEffect(() => {
    if (!myMinistry) return
    fetchMembers()
    fetchContent()
  }, [filterStatus, myMinistry])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: 100 })
      if (filterStatus) params.set('status', filterStatus)
      const { data } = await api.get('/members?' + params)
      // Filter to only this ministry's members
      const filtered = (data.members || []).filter(m =>
        m.primary_ministry === myMinistry || m.secondary_ministry === myMinistry
      )
      setMembers(filtered)
    } catch { toast.error('Failed to load members') }
    finally { setLoading(false) }
  }

  const fetchContent = async () => {
    try {
      const { data } = await api.get(`/ministry-content?ministry=${encodeURIComponent(myMinistry)}`)
      setMinistryContent(data.content || [])
    } catch {}
  }

  const approveMember = async (id) => {
    try {
      await api.post(`/members/${id}/approve`)
      toast.success('Member approved')
      fetchMembers()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const postUpdate = async () => {
    if (!updateForm.title) return toast.error('Title is required')
    setSaving(true)
    try {
      await api.post('/ministry-content', {
        ministry_name: myMinistry,
        content_type: updateForm.content_type,
        title: updateForm.title,
        body: updateForm.body || null,
        meeting_day: updateForm.meeting_day || null,
        meeting_time: updateForm.meeting_time || null,
        meeting_venue: updateForm.meeting_venue || null,
      })

      // Also send notifications to ministry members
      const memberIds = members.filter(m => m.enrollment_status === 'active').map(m => m.id)
      for (const userId of memberIds) {
        await api.post('/notifications/send', {
          user_id: userId,
          title: `${myMinistry}: ${updateForm.title}`,
          body: updateForm.body || '',
          type: 'info',
          category: 'ministry',
          link: '/dashboard',
        }).catch(() => {})
      }

      toast.success('Ministry update posted and members notified')
      setShowUpdate(false)
      setUpdateForm({ title: '', body: '', meeting_day: '', meeting_time: '', meeting_venue: '', content_type: 'announcement' })
      fetchContent()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const deleteContent = async (id) => {
    if (!window.confirm('Delete this update?')) return
    try {
      await api.delete(`/ministry-content/${id}`)
      toast.success('Deleted')
      fetchContent()
    } catch { toast.error('Failed') }
  }

  const filtered = members.filter(m =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.mutcu_number?.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = members.filter(m => m.enrollment_status === 'pending').length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{myMinistry || 'My Ministry'}</h1>
          <p className="page-subtitle">{members.length} members · {pendingCount > 0 ? `${pendingCount} pending approval` : 'All approved'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUpdate(true)} className="btn-primary btn-sm">
            <Send size={14} />Post Ministry Update
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members list */}
        <div className="lg:col-span-2">
          {/* Filters */}
          <div className="card p-3 mb-4 flex gap-3 flex-wrap">
            <div className="flex-1 relative min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" className="form-input pl-9 text-sm" placeholder="Search members..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select text-sm w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-montserrat font-bold text-navy text-sm">
                <Users size={16} className="inline mr-2" />{myMinistry} Members
              </h2>
              <span className="badge badge-navy">{filtered.length}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>MUTCU No.</th>
                    <th>Year</th>
                    <th>Ministry Role</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange mx-auto" /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No members found in {myMinistry}.</td></tr>
                  ) : filtered.map(m => {
                    const photoUrl = m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`
                    const isPrimary = m.primary_ministry === myMinistry
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <img src={photoUrl} alt={m.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                            <div>
                              <div className="font-bold text-navy text-sm">{m.name}</div>
                              <div className="text-xs text-gray-400">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="font-montserrat font-bold text-orange text-xs">{m.mutcu_number || '—'}</span></td>
                        <td>{m.year_of_study ? <span className="badge badge-navy">Yr {m.year_of_study}</span> : '—'}</td>
                        <td>
                          <span className={`badge ${isPrimary ? 'badge-orange' : 'badge-teal'} text-xs`}>
                            {isPrimary ? 'Primary' : 'Secondary'}
                          </span>
                        </td>
                        <td>
                          {m.enrollment_status === 'active'
                            ? <span className="badge badge-green">Active</span>
                            : m.enrollment_status === 'pending'
                              ? <span className="badge badge-orange">Pending</span>
                              : <span className="badge badge-gray">{m.enrollment_status}</span>}
                        </td>
                        <td>
                          {m.enrollment_status === 'pending' && (
                            <button onClick={() => approveMember(m.id)} className="btn-teal btn-sm text-xs">
                              <CheckCircle size={12} />Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Ministry content sidebar */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h2 className="font-montserrat font-bold text-navy text-sm">Ministry Updates</h2>
              <button onClick={() => setShowUpdate(true)} className="btn-outline btn-sm text-xs"><Plus size={12} />Add</button>
            </div>
            <div>
              {ministryContent.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No updates posted yet.</div>
              ) : ministryContent.map(c => (
                <div key={c.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-navy text-sm">{c.title}</div>
                      {c.content_type === 'meeting_schedule' && c.meeting_day && (
                        <div className="text-xs text-teal font-semibold mt-0.5">
                          📅 {c.meeting_day}{c.meeting_time ? ` at ${c.meeting_time}` : ''}{c.meeting_venue ? ` — ${c.meeting_venue}` : ''}
                        </div>
                      )}
                      {c.body && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.body}</div>}
                      <span className={`badge text-xs mt-1 ${c.content_type === 'meeting_schedule' ? 'badge-teal' : 'badge-navy'}`}>
                        {c.content_type === 'meeting_schedule' ? 'Meeting' : 'Announcement'}
                      </span>
                    </div>
                    <button onClick={() => deleteContent(c.id)} className="text-gray-300 hover:text-red transition-colors flex-shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="card p-4">
            <h3 className="font-montserrat font-bold text-navy text-sm mb-3">Ministry Stats</h3>
            <div className="space-y-2">
              {[
                { label: 'Total Members', value: members.length, color: 'text-navy' },
                { label: 'Active', value: members.filter(m => m.enrollment_status === 'active').length, color: 'text-teal' },
                { label: 'Pending Approval', value: pendingCount, color: 'text-orange' },
                { label: 'Primary Ministry', value: members.filter(m => m.primary_ministry === myMinistry).length, color: 'text-navy' },
                { label: 'Secondary Ministry', value: members.filter(m => m.secondary_ministry === myMinistry).length, color: 'text-gray-500' },
              ].map((s, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{s.label}</span>
                  <span className={`font-montserrat font-bold text-sm ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Post Update Modal */}
      {showUpdate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">Post Ministry Update</h3>
              <button onClick={() => setShowUpdate(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Update Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'announcement', label: '📢 Announcement' },
                    { value: 'meeting_schedule', label: '📅 Meeting Schedule' },
                  ].map(t => (
                    <div key={t.value} onClick={() => setUpdateForm(f => ({ ...f, content_type: t.value }))}
                      className={`p-3 rounded-lg border-2 cursor-pointer text-center text-sm font-semibold transition-all ${updateForm.content_type === t.value ? 'border-orange bg-orange/5 text-navy' : 'border-gray-200 text-gray-500'}`}>
                      {t.label}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Title *</label>
                <input type="text" className="form-input" placeholder="e.g. Weekly Rehearsal Update"
                  value={updateForm.title} onChange={e => setUpdateForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              {updateForm.content_type === 'meeting_schedule' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="form-label">Day</label>
                    <select className="form-select" value={updateForm.meeting_day} onChange={e => setUpdateForm(f => ({ ...f, meeting_day: e.target.value }))}>
                      <option value="">Select</option>
                      {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Time</label>
                    <input type="time" className="form-input" value={updateForm.meeting_time} onChange={e => setUpdateForm(f => ({ ...f, meeting_time: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Venue</label>
                    <input type="text" className="form-input" placeholder="e.g. CU Hall" value={updateForm.meeting_venue} onChange={e => setUpdateForm(f => ({ ...f, meeting_venue: e.target.value }))} />
                  </div>
                </div>
              )}
              <div>
                <label className="form-label">Message / Details</label>
                <textarea className="form-input" rows={4} placeholder="Write your update for ministry members..."
                  value={updateForm.body} onChange={e => setUpdateForm(f => ({ ...f, body: e.target.value }))} />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <Bell size={12} className="inline mr-1" />
                This update will be posted to the ministry board AND all {myMinistry} members will receive a notification.
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={postUpdate} disabled={saving} className="btn-primary flex-1 justify-center">
                <Send size={15} />{saving ? 'Posting...' : 'Post Update & Notify Members'}
              </button>
              <button onClick={() => setShowUpdate(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}