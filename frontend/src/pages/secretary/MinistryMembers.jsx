import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Search, Users, Send, CheckCircle, X, Plus, Download, Eye } from 'lucide-react'

export default function MinistryMembers() {
  const { user, getMyMinistry } = useAuth()
  const myMinistry = getMyMinistry ? getMyMinistry() : user?.primary_ministry

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('active')
  const [selected, setSelected] = useState(null) // for profile modal
  const [showUpdate, setShowUpdate] = useState(false)
  const [updateForm, setUpdateForm] = useState({
    title: '', body: '', meeting_day: '', meeting_time: '', meeting_venue: '', content_type: 'announcement'
  })
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
      const params = new URLSearchParams({ limit: 300 })
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
      toast.success('Member approved!')
      fetchMembers()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const postUpdate = async () => {
    if (!updateForm.title.trim()) return toast.error('Title required')
    setSaving(true)
    try {
      await api.post('/ministry-content', { ...updateForm, ministry_name: myMinistry })
      toast.success('Update posted!')
      setShowUpdate(false)
      setUpdateForm({ title: '', body: '', meeting_day: '', meeting_time: '', meeting_venue: '', content_type: 'announcement' })
      fetchContent()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'MUTCU Number', 'Gender', 'Year', 'Primary Ministry', 'Secondary Ministry', 'Phone', 'Student ID', 'Status', 'Membership Type']
    const rows = filtered.map(m => [
      m.name, m.email, m.mutcu_number || '', m.gender || '',
      m.year_of_study || '', m.primary_ministry || '', m.secondary_ministry || '',
      m.phone || '', m.student_id || '', m.enrollment_status || '', m.membership_type || '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${myMinistry?.replace(/ /g, '-')}-Members-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    return !q || m.name?.toLowerCase().includes(q) || m.mutcu_number?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
  })

  if (!myMinistry) return (
    <div className="card p-10 text-center text-gray-400">
      <Users size={36} className="mx-auto mb-3 text-gray-200" />
      <p className="text-sm">No ministry assigned to your account.</p>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ministry Members</h1>
          <p className="page-subtitle">{myMinistry} — {filtered.length} members</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCSV} className="btn-outline btn-sm">
            <Download size={13} /> Export CSV
          </button>
          <button onClick={() => setShowUpdate(true)} className="btn-outline btn-sm">
            <Send size={13} /> Post Update
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-8 py-1.5 text-sm" placeholder="Search by name, email or MUTCU number..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select text-sm py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="active">Active Members</option>
          <option value="pending">Pending Approval</option>
          <option value="">All</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-4 text-center">
          <div className="text-2xl font-montserrat font-bold text-navy">{filtered.length}</div>
          <div className="text-xs text-gray-400 mt-1">Total Members</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-montserrat font-bold text-teal">{filtered.filter(m => m.enrollment_status === 'active').length}</div>
          <div className="text-xs text-gray-400 mt-1">Active</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-montserrat font-bold text-orange">{filtered.filter(m => m.enrollment_status === 'pending').length}</div>
          <div className="text-xs text-gray-400 mt-1">Pending</div>
        </div>
      </div>

      {/* Member Grid */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <Users size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">No members found for {myMinistry}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(m => (
            <div key={m.id} className="card p-4 text-center hover:shadow-md transition-all cursor-pointer relative"
              onClick={() => setSelected(m)}>
              {m.enrollment_status === 'pending' && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-orange rounded-full" title="Pending approval" />
              )}
              <img
                src={m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=04003D&color=FF9700&size=80&bold=true`}
                alt="" className="w-14 h-14 rounded-full object-cover border-2 border-orange mx-auto mb-2" />
              <div className="font-semibold text-navy text-xs truncate">{m.name}</div>
              <div className="text-xs text-gray-400">{m.mutcu_number || '—'}</div>
              <div className="text-xs text-orange mt-0.5">Year {m.year_of_study}</div>
              {m.enrollment_status === 'pending' && (
                <button onClick={e => { e.stopPropagation(); approveMember(m.id) }}
                  className="mt-2 text-xs bg-teal/10 text-teal px-2 py-0.5 rounded-full hover:bg-teal/20 transition-all">
                  <CheckCircle size={10} className="inline mr-0.5" /> Approve
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Member Profile Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">Member Profile</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="text-center mb-4">
              <img
                src={selected.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selected.name)}&background=04003D&color=FF9700&size=120&bold=true`}
                alt="" className="w-20 h-20 rounded-full object-cover border-2 border-orange mx-auto mb-2" />
              <div className="font-montserrat font-bold text-navy">{selected.name}</div>
              <div className="text-orange text-sm font-semibold">{selected.mutcu_number}</div>
              <div className="flex gap-1.5 justify-center mt-1 flex-wrap">
                <span className="badge badge-teal text-xs">{selected.membership_type} member</span>
                <span className={`badge text-xs ${selected.enrollment_status === 'active' ? 'badge-green' : 'badge-orange'}`}>
                  {selected.enrollment_status}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Email', selected.email],
                ['Phone', selected.phone || '—'],
                ['Student ID', selected.student_id || '—'],
                ['Year of Study', `Year ${selected.year_of_study}`],
                ['Course Type', selected.course_type || '—'],
                ['Primary Ministry', selected.primary_ministry || 'General'],
                ['Secondary Ministry', selected.secondary_ministry || '—'],
                ['Gender', selected.gender || '—'],
                ['Disciplinary Status', selected.disciplinary_status || 'clear'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400 font-semibold text-xs">{label}</span>
                  <span className={`text-navy font-semibold text-xs ${label === 'Disciplinary Status' && val !== 'clear' ? 'text-red' : ''}`}>{val}</span>
                </div>
              ))}
            </div>
            {selected.enrollment_status === 'pending' && (
              <button onClick={() => { approveMember(selected.id); setSelected(null) }}
                className="btn-primary w-full justify-center mt-4">
                <CheckCircle size={14} /> Approve Member
              </button>
            )}
          </div>
        </div>
      )}

      {/* Post Update Modal */}
      {showUpdate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">Post Ministry Update</h3>
              <button onClick={() => setShowUpdate(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Type</label>
                <select className="form-select" value={updateForm.content_type}
                  onChange={e => setUpdateForm(f => ({ ...f, content_type: e.target.value }))}>
                  <option value="announcement">Announcement</option>
                  <option value="meeting_schedule">Meeting Schedule</option>
                  <option value="activity">Activity / Event</option>
                </select>
              </div>
              <div>
                <label className="form-label">Title <span className="text-orange">*</span></label>
                <input className="form-input" placeholder="e.g. Practice this Saturday 2pm"
                  value={updateForm.title} onChange={e => setUpdateForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Message</label>
                <textarea className="form-input" rows={3} placeholder="Details..."
                  value={updateForm.body} onChange={e => setUpdateForm(f => ({ ...f, body: e.target.value }))} />
              </div>
              {updateForm.content_type === 'meeting_schedule' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="form-label">Day</label>
                    <select className="form-select text-sm" value={updateForm.meeting_day}
                      onChange={e => setUpdateForm(f => ({ ...f, meeting_day: e.target.value }))}>
                      <option value="">Day</option>
                      {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Time</label>
                    <input type="time" className="form-input text-sm" value={updateForm.meeting_time}
                      onChange={e => setUpdateForm(f => ({ ...f, meeting_time: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Venue</label>
                    <input className="form-input text-sm" placeholder="Hall..."
                      value={updateForm.meeting_venue} onChange={e => setUpdateForm(f => ({ ...f, meeting_venue: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={postUpdate} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Send size={14} /> Post Update</>}
              </button>
              <button onClick={() => setShowUpdate(false)} className="btn-outline px-4"><X size={14} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Ministry Content */}
      {ministryContent.length > 0 && (
        <div className="mt-6">
          <h2 className="font-montserrat font-bold text-navy text-sm mb-3">Posted Updates ({ministryContent.length})</h2>
          <div className="space-y-2">
            {ministryContent.map(item => (
              <div key={item.id} className="card p-3 flex items-start gap-3">
                <div className="w-8 h-8 bg-orange/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Send size={14} className="text-orange" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-navy text-sm">{item.title}</div>
                  {item.body && <div className="text-xs text-gray-500 mt-0.5">{item.body}</div>}
                  {item.meeting_day && (
                    <div className="text-xs text-teal mt-0.5">
                      📅 {item.meeting_day}{item.meeting_time ? ` at ${item.meeting_time}` : ''}{item.meeting_venue ? ` — ${item.meeting_venue}` : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}