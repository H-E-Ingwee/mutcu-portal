import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Send, Users, Filter, X, CheckCircle, Mail, AlertTriangle } from 'lucide-react'

const MINISTRIES = [
  'Prayer Ministry', 'Music Ministry', 'Missions & Evangelism Ministry',
  'Bible Study & Training Ministry', 'Discipleship Ministry',
  'Creative Arts Ministry', 'Technical & Media Ministry',
  'Hospitality Ministry', 'Welfare Committee', 'Resource Mobilization Committee',
]

export default function AdminBulkEmail() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(null)

  // Filters
  const [filterMinistry, setFilterMinistry] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterMembership, setFilterMembership] = useState('')

  // Email content
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectAll, setSelectAll] = useState(true)

  useEffect(() => {
    api.get('/members?limit=500&status=active')
      .then(r => {
        const m = r.data.members || []
        setMembers(m)
        setSelectedIds(new Set(m.map(x => x.id)))
      })
      .catch(() => toast.error('Failed to load members'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = members.filter(m => {
    return (
      (!filterMinistry || m.primary_ministry === filterMinistry || m.secondary_ministry === filterMinistry) &&
      (!filterYear || String(m.year_of_study) === filterYear) &&
      (!filterGender || m.gender === filterGender) &&
      (!filterMembership || m.membership_type === filterMembership)
    )
  })

  const toggleMember = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectAll) {
      setSelectedIds(new Set())
      setSelectAll(false)
    } else {
      setSelectedIds(new Set(filtered.map(m => m.id)))
      setSelectAll(true)
    }
  }

  // When filters change, update selection to match filtered
  useEffect(() => {
    setSelectedIds(new Set(filtered.map(m => m.id)))
    setSelectAll(true)
  }, [filterMinistry, filterYear, filterGender, filterMembership])

  const selectedMembers = filtered.filter(m => selectedIds.has(m.id))

  const send = async () => {
    if (!subject.trim()) return toast.error('Subject is required')
    if (!body.trim()) return toast.error('Message body is required')
    if (selectedMembers.length === 0) return toast.error('No recipients selected')
    if (!window.confirm(`Send email to ${selectedMembers.length} members?\n\nSubject: ${subject}`)) return

    setSending(true)
    try {
      const res = await api.post('/admin/bulk-email', {
        subject: subject.trim(),
        body: body.trim(),
        recipient_ids: selectedMembers.map(m => m.id),
      })
      setSent({ count: res.data.sent, subject })
      setSubject('')
      setBody('')
      toast.success(`Email sent to ${res.data.sent} members!`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send email')
    } finally { setSending(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulk Email</h1>
          <p className="page-subtitle">Send emails to members — all or filtered groups</p>
        </div>
      </div>

      {sent && (
        <div className="card p-4 mb-5 bg-teal/5 border border-teal/20 flex items-center gap-3">
          <CheckCircle size={20} className="text-teal flex-shrink-0" />
          <div>
            <div className="font-semibold text-teal text-sm">Email sent successfully!</div>
            <div className="text-xs text-gray-500">"{sent.subject}" was sent to {sent.count} members via BCC.</div>
          </div>
          <button onClick={() => setSent(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Compose */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card p-5">
            <h2 className="font-montserrat font-bold text-navy text-sm mb-4 flex items-center gap-2">
              <Mail size={14} className="text-orange" /> Compose Email
            </h2>
            <div className="space-y-3">
              <div>
                <label className="form-label">Subject <span className="text-orange">*</span></label>
                <input className="form-input" placeholder="e.g. MUTCU — Important Announcement"
                  value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} />
              </div>
              <div>
                <label className="form-label">Message <span className="text-orange">*</span></label>
                <textarea className="form-input" rows={8}
                  placeholder="Type your message here. It will be sent as a branded MUTCU email."
                  value={body} onChange={e => setBody(e.target.value)} />
                <div className="text-xs text-gray-400 mt-1">{body.length} characters</div>
              </div>
              <div className="bg-navy/5 border border-navy/10 rounded-xl p-3 text-xs text-gray-500 flex items-start gap-2">
                <AlertTriangle size={13} className="text-orange flex-shrink-0 mt-0.5" />
                All recipients are BCC'd to protect member email privacy. Emails are sent from noreply@mutcu.org.
              </div>
              <button onClick={send} disabled={sending || selectedMembers.length === 0 || !subject || !body}
                className="btn-primary w-full justify-center">
                {sending
                  ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Sending...</>
                  : <><Send size={15} /> Send to {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}</>}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Recipients */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="card p-4">
            <h2 className="font-montserrat font-bold text-navy text-sm mb-3 flex items-center gap-2">
              <Filter size={14} className="text-orange" /> Filter Recipients
            </h2>
            <div className="space-y-2">
              <select className="form-select text-sm" value={filterMinistry} onChange={e => setFilterMinistry(e.target.value)}>
                <option value="">All Ministries</option>
                {MINISTRIES.map(m => <option key={m} value={m}>{m.replace(' Ministry', '').replace(' Committee', '')}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select className="form-select text-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                  <option value="">All Years</option>
                  {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
                <select className="form-select text-sm" value={filterGender} onChange={e => setFilterGender(e.target.value)}>
                  <option value="">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <select className="form-select text-sm" value={filterMembership} onChange={e => setFilterMembership(e.target.value)}>
                <option value="">All Membership Types</option>
                <option value="full">Full Members</option>
                <option value="special">Special Members</option>
                <option value="associate">Associate Members</option>
              </select>
              {(filterMinistry || filterYear || filterGender || filterMembership) && (
                <button onClick={() => { setFilterMinistry(''); setFilterYear(''); setFilterGender(''); setFilterMembership('') }}
                  className="btn-outline btn-sm w-full justify-center"><X size={13} /> Clear Filters</button>
              )}
            </div>
          </div>

          {/* Member list */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={selectAll} onChange={toggleAll} className="accent-orange" />
                <span className="font-montserrat font-bold text-navy text-sm">
                  {selectedMembers.length} / {filtered.length} selected
                </span>
              </div>
              <span className="text-xs text-gray-400">{members.length} total active</span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No members match filters</div>
              ) : filtered.map(m => (
                <label key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleMember(m.id)}
                    className="accent-orange flex-shrink-0" />
                  <img src={m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=04003D&color=FF9700&size=40&bold=true`}
                    alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy truncate">{m.name}</div>
                    <div className="text-xs text-gray-400 truncate">{m.primary_ministry?.replace(' Ministry', '') || 'General'} · Year {m.year_of_study}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}