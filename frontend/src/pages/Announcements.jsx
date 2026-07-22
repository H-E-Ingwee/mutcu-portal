import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Megaphone, Pin, Plus, Trash2, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function Announcements() {
  const { user, isAdmin, isSecretary } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', is_pinned: false })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/announcements').then(r => setAnnouncements(r.data.announcements || [])).finally(() => setLoading(false))
  }, [])

  const submit = async e => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data } = await api.post('/announcements', form)
      setAnnouncements(prev => [data.announcement, ...prev])
      setForm({ title: '', body: '', is_pinned: false })
      setShowForm(false)
      toast.success('Announcement posted!')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSubmitting(false) }
  }

  const remove = async id => {
    if (!window.confirm('Delete this announcement?')) return
    try {
      await api.delete(`/announcements/${id}`)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  const canPost = isSecretary && isSecretary()

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Announcements</h1><p className="page-subtitle">Official MUTCU communications and updates</p></div>
        {canPost && <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-sm"><Plus size={14} />Post Announcement</button>}
      </div>

      {/* Post Form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-montserrat font-bold text-navy text-sm">New Announcement</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div><label className="form-label">Title *</label><input type="text" className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="Announcement title" /></div>
            <div><label className="form-label">Message *</label><textarea className="form-input" rows={4} value={form.body} onChange={e => setForm({...form, body: e.target.value})} required placeholder="Write your announcement..." /></div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-orange" checked={form.is_pinned} onChange={e => setForm({...form, is_pinned: e.target.checked})} />
              <span className="text-sm text-gray-700">Pin this announcement</span>
            </label>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Posting...' : 'Post Announcement'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>
      ) : announcements.length === 0 ? (
        <div className="card p-10 text-center">
          <Megaphone size={40} className="text-gray-300 mx-auto mb-3" />
          <div className="text-gray-400 text-sm">No announcements yet.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a.id} className={`card p-5 ${a.is_pinned ? 'border-l-4 border-orange' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {a.is_pinned && <Pin size={13} className="text-orange flex-shrink-0" />}
                    <h3 className="font-montserrat font-bold text-navy text-sm">{a.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {a.author?.photo_url && <img src={a.author.photo_url} alt="" className="w-5 h-5 rounded-full object-cover" />}
                    <span className="text-xs text-gray-400">{a.author?.name} · {a.created_at ? formatDistanceToNow(new Date(a.created_at), {addSuffix:true}) : ''}</span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{a.body}</p>
                </div>
                {canPost && (
                  <button onClick={() => remove(a.id)} className="text-gray-300 hover:text-red transition-colors flex-shrink-0 p-1"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
