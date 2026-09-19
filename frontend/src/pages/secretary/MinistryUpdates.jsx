import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Save, X, CalendarDays, Megaphone, Clock } from 'lucide-react'

const CONTENT_TYPES = [
  { value: 'announcement', label: 'Announcement', icon: Megaphone, desc: 'General ministry news or updates' },
  { value: 'meeting_schedule', label: 'Meeting Schedule', icon: CalendarDays, desc: 'Regular meeting times and venue' },
  { value: 'activity', label: 'Activity / Event', icon: Clock, desc: 'Upcoming ministry activity' },
]

export default function MinistryUpdates() {
  const { user, getMyMinistry } = useAuth()
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    content_type: 'announcement', title: '', body: '',
    meeting_day: '', meeting_time: '', meeting_venue: '',
  })

  const myMinistry = getMyMinistry ? getMyMinistry() : user?.primary_ministry

  const load = () => {
    if (!myMinistry) return setLoading(false)
    api.get(`/ministry-content?ministry=${encodeURIComponent(myMinistry)}`)
      .then(r => setContent(r.data.content || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [myMinistry])

  const resetForm = () => {
    setForm({ content_type: 'announcement', title: '', body: '', meeting_day: '', meeting_time: '', meeting_venue: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (item) => {
    setForm({
      content_type: item.content_type,
      title: item.title,
      body: item.body || '',
      meeting_day: item.meeting_day || '',
      meeting_time: item.meeting_time || '',
      meeting_venue: item.meeting_venue || '',
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const save = async () => {
    if (!form.title.trim()) return toast.error('Title is required')
    setSaving(true)
    try {
      const payload = { ...form, ministry_name: myMinistry }
      if (editingId) {
        await api.put(`/ministry-content/${editingId}`, payload)
        toast.success('Update edited')
      } else {
        await api.post('/ministry-content', payload)
        toast.success('Update posted!')
      }
      load()
      resetForm()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this update?')) return
    try {
      await api.delete(`/ministry-content/${id}`)
      setContent(prev => prev.filter(c => c.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  if (!myMinistry) return (
    <div className="card p-10 text-center text-gray-400">
      <Megaphone size={36} className="mx-auto mb-3 text-gray-200" />
      <p className="text-sm">No ministry assigned to your account.</p>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ministry Updates</h1>
          <p className="page-subtitle">{myMinistry} — Post announcements and meeting schedules</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary btn-sm">
          <Plus size={14} /> Post Update
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-5 mb-5 border-l-4 border-orange">
          <h3 className="font-montserrat font-bold text-navy mb-4">{editingId ? 'Edit Update' : 'Post New Update'}</h3>
          <div className="space-y-3">
            {/* Content type */}
            <div>
              <label className="form-label">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {CONTENT_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, content_type: t.value }))}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all ${form.content_type === t.value ? 'border-orange bg-orange/5' : 'border-gray-100 hover:border-gray-200'}`}>
                    <t.icon size={16} className={form.content_type === t.value ? 'text-orange' : 'text-gray-400'} />
                    <span className={`text-xs font-semibold ${form.content_type === t.value ? 'text-orange' : 'text-gray-500'}`}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Title <span className="text-orange">*</span></label>
              <input className="form-input" placeholder="e.g. Choir Practice — Saturday 2pm"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div>
              <label className="form-label">Details / Message</label>
              <textarea className="form-input" rows={3} placeholder="Additional details..."
                value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
            </div>

            {/* Meeting-specific fields */}
            {form.content_type === 'meeting_schedule' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="form-label">Day</label>
                  <select className="form-select" value={form.meeting_day} onChange={e => setForm(f => ({ ...f, meeting_day: e.target.value }))}>
                    <option value="">Select day</option>
                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Time</label>
                  <input type="time" className="form-input" value={form.meeting_time}
                    onChange={e => setForm(f => ({ ...f, meeting_time: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Venue</label>
                  <input className="form-input" placeholder="e.g. Main Hall"
                    value={form.meeting_venue} onChange={e => setForm(f => ({ ...f, meeting_venue: e.target.value }))} />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Save size={14} /> {editingId ? 'Update' : 'Post'}</>}
            </button>
            <button onClick={resetForm} className="btn-outline px-4"><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      {/* Content list */}
      {content.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <Megaphone size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">No updates posted yet for {myMinistry}.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-3 mx-auto"><Plus size={14} /> Post First Update</button>
        </div>
      ) : (
        <div className="space-y-3">
          {content.map(item => {
            const typeCfg = CONTENT_TYPES.find(t => t.value === item.content_type) || CONTENT_TYPES[0]
            return (
              <div key={item.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-9 h-9 bg-orange/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                      <typeCfg.icon size={16} className="text-orange" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-montserrat font-bold text-navy text-sm">{item.title}</span>
                        <span className="badge badge-gray text-xs">{typeCfg.label}</span>
                      </div>
                      {item.body && <p className="text-sm text-gray-600 mb-1">{item.body}</p>}
                      {item.meeting_day && (
                        <div className="text-xs text-teal font-semibold">
                          📅 {item.meeting_day}{item.meeting_time ? ` at ${item.meeting_time}` : ''}{item.meeting_venue ? ` — ${item.meeting_venue}` : ''}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">Posted {formatDate(item.created_at)}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(item)} className="p-1.5 text-gray-400 hover:text-navy rounded-lg hover:bg-gray-100"><Edit2 size={13} /></button>
                    <button onClick={() => deleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red rounded-lg hover:bg-red/5"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}