import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import {
  Users, Plus, CheckCircle, X, Search, Clock,
  CalendarDays, BarChart3, ChevronRight, Lock, Unlock
} from 'lucide-react'

const SESSION_TYPES = [
  { value: 'sunday_service', label: 'Sunday Service', color: 'badge-navy' },
  { value: 'friday_service', label: 'Friday Service', color: 'badge-teal' },
  { value: 'prayer', label: 'Prayer / Kesha', color: 'badge-orange' },
  { value: 'special_event', label: 'Special Event', color: 'badge-green' },
  { value: 'outreach', label: 'Outreach', color: 'badge-gray' },
]

export default function Attendance() {
  const { user, isAdmin, isSecretary, isECCoordinator } = useAuth()
  const canManage = (isAdmin && isAdmin()) || (isSecretary && isSecretary()) || (isECCoordinator && isECCoordinator())

  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState(null)
  const [records, setRecords] = useState([])
  const [totalMembers, setTotalMembers] = useState(0)
  const [allMembers, setAllMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkingIn, setCheckingIn] = useState(null)
  const [selfCheckedIn, setSelfCheckedIn] = useState(false)
  const [form, setForm] = useState({
    title: '', session_date: new Date().toISOString().split('T')[0],
    session_type: 'sunday_service', spiritual_year: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, notes: ''
  })

  useEffect(() => {
    loadSessions()
    if (canManage) {
      api.get('/members?limit=300&status=active').then(r => setAllMembers(r.data.members || [])).catch(() => {})
    }
  }, [])

  const loadSessions = () => {
    api.get('/attendance/sessions?limit=10').then(r => setSessions(r.data.sessions || [])).finally(() => setLoading(false))
  }

  const openSession = async (session) => {
    setActiveSession(session)
    const res = await api.get(`/attendance/sessions/${session.id}/records`)
    setRecords(res.data.records || [])
    setTotalMembers(res.data.total_members || 0)
    // Check if current user is already checked in
    setSelfCheckedIn(res.data.records?.some(r => r.user_id === user?.id) || false)
  }

  const createSession = async () => {
    if (!form.title || !form.session_date) return toast.error('Title and date required')
    setSaving(true)
    try {
      const res = await api.post('/attendance/sessions', form)
      toast.success('Session created!')
      setSessions(prev => [res.data.session, ...prev])
      setShowNew(false)
      setForm({ title: '', session_date: new Date().toISOString().split('T')[0], session_type: 'sunday_service', spiritual_year: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, notes: '' })
      openSession(res.data.session)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const closeSession = async () => {
    if (!window.confirm('Close this session? No more check-ins will be allowed.')) return
    try {
      await api.put(`/attendance/sessions/${activeSession.id}/close`)
      toast.success('Session closed')
      setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, is_open: false } : s))
      setActiveSession(prev => ({ ...prev, is_open: false }))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const deleteSession = async (id) => {
    if (!window.confirm('Delete this session and all attendance records?')) return
    try {
      await api.delete(`/attendance/sessions/${id}`)
      setSessions(prev => prev.filter(s => s.id !== id))
      if (activeSession?.id === id) setActiveSession(null)
      toast.success('Session deleted')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const checkIn = async (userId) => {
    setCheckingIn(userId)
    try {
      const res = await api.post(`/attendance/sessions/${activeSession.id}/checkin`, { user_id: userId })
      setRecords(prev => {
        const exists = prev.find(r => r.user_id === userId)
        return exists ? prev : [...prev, res.data.record]
      })
      toast.success(`${res.data.record?.member?.name || 'Member'} checked in!`)
    } catch (err) { toast.error(err.response?.data?.error || 'Already checked in') }
    finally { setCheckingIn(null) }
  }

  const selfCheckIn = async () => {
    try {
      const res = await api.post(`/attendance/sessions/${activeSession.id}/self-checkin`)
      setRecords(prev => [...prev, res.data.record])
      setSelfCheckedIn(true)
      toast.success('You are checked in! 🎉')
    } catch (err) { toast.error(err.response?.data?.error || 'Already checked in') }
  }

  const removeCheckIn = async (userId) => {
    try {
      await api.delete(`/attendance/sessions/${activeSession.id}/records/${userId}`)
      setRecords(prev => prev.filter(r => r.user_id !== userId))
      toast.success('Check-in removed')
    } catch (err) { toast.error('Failed to remove') }
  }

  const filteredMembers = allMembers.filter(m => {
    const q = memberSearch.toLowerCase()
    return !q || m.name?.toLowerCase().includes(q) || m.mutcu_number?.toLowerCase().includes(q)
  }).filter(m => !records.find(r => r.user_id === m.id))

  const typeCfg = (type) => SESSION_TYPES.find(t => t.value === type) || SESSION_TYPES[0]
  const attendancePct = totalMembers > 0 ? Math.round((records.length / totalMembers) * 100) : 0

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Track member attendance at services and events</p>
        </div>
        {canManage && (
          <button onClick={() => setShowNew(true)} className="btn-primary btn-sm">
            <Plus size={14} /> New Session
          </button>
        )}
      </div>

      {/* New Session Form */}
      {showNew && canManage && (
        <div className="card p-5 mb-5 border-l-4 border-orange">
          <h3 className="font-montserrat font-bold text-navy mb-4">Create Attendance Session</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="form-label">Session Title <span className="text-orange">*</span></label>
              <input className="form-input" placeholder="e.g. Sunday Service — 21 Sep 2026"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Date <span className="text-orange">*</span></label>
              <input type="date" className="form-input" value={form.session_date}
                onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Type</label>
              <select className="form-select" value={form.session_type}
                onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))}>
                {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={createSession} disabled={saving} className="btn-primary">
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Plus size={14} /> Create & Open</>}
            </button>
            <button onClick={() => setShowNew(false)} className="btn-outline px-4"><X size={14} /></button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List */}
        <div>
          <h2 className="font-montserrat font-bold text-navy text-sm mb-3">Recent Sessions</h2>
          {sessions.length === 0 ? (
            <div className="card p-6 text-center text-gray-400 text-sm">No sessions yet.</div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <div key={s.id}
                  className={`card p-3 cursor-pointer hover:shadow-md transition-all ${activeSession?.id === s.id ? 'border-l-4 border-orange' : ''}`}
                  onClick={() => openSession(s)}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-navy text-sm truncate">{s.title}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`badge text-xs ${typeCfg(s.session_type).color}`}>{typeCfg(s.session_type).label}</span>
                        <span className="text-xs text-gray-400">{new Date(s.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        {s.is_open ? <span className="text-xs text-teal font-semibold flex items-center gap-0.5"><Unlock size={10} /> Open</span>
                          : <span className="text-xs text-gray-400 flex items-center gap-0.5"><Lock size={10} /> Closed</span>}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Session */}
        <div className="lg:col-span-2">
          {!activeSession ? (
            <div className="card p-10 text-center text-gray-400">
              <CalendarDays size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Select a session to view attendance</p>
              {canManage && <button onClick={() => setShowNew(true)} className="btn-primary mt-3 mx-auto"><Plus size={14} /> Create Session</button>}
            </div>
          ) : (
            <div className="card overflow-hidden">
              {/* Session Header */}
              <div className="card-header">
                <div>
                  <h2 className="font-montserrat font-bold text-navy">{activeSession.title}</h2>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`badge text-xs ${typeCfg(activeSession.session_type).color}`}>{typeCfg(activeSession.session_type).label}</span>
                    <span className="text-xs text-gray-400">{new Date(activeSession.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    {activeSession.is_open
                      ? <span className="text-xs text-teal font-semibold">🟢 Open</span>
                      : <span className="text-xs text-gray-400">🔴 Closed</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {canManage && activeSession.is_open && (
                    <button onClick={closeSession} className="btn-outline btn-sm text-orange border-orange/30">
                      <Lock size={13} /> Close
                    </button>
                  )}
                  {canManage && (
                    <button onClick={() => deleteSession(activeSession.id)} className="btn-outline btn-sm text-red border-red/30">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 p-4 border-b border-gray-100">
                <div className="text-center">
                  <div className="text-2xl font-montserrat font-bold text-navy">{records.length}</div>
                  <div className="text-xs text-gray-400">Present</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-montserrat font-bold text-orange">{totalMembers - records.length}</div>
                  <div className="text-xs text-gray-400">Absent</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-montserrat font-bold ${attendancePct >= 70 ? 'text-teal' : attendancePct >= 40 ? 'text-orange' : 'text-red'}`}>
                    {attendancePct}%
                  </div>
                  <div className="text-xs text-gray-400">Attendance</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${attendancePct >= 70 ? 'bg-teal' : attendancePct >= 40 ? 'bg-orange' : 'bg-red'}`}
                    style={{ width: `${attendancePct}%` }} />
                </div>
              </div>

              {/* Self check-in for members */}
              {activeSession.is_open && !canManage && (
                <div className="p-4 border-b border-gray-100">
                  {selfCheckedIn ? (
                    <div className="flex items-center gap-2 text-teal text-sm font-semibold">
                      <CheckCircle size={16} /> You are checked in for this session!
                    </div>
                  ) : (
                    <button onClick={selfCheckIn} className="btn-primary w-full justify-center">
                      <CheckCircle size={15} /> Check Me In
                    </button>
                  )}
                </div>
              )}

              {/* Admin: search + check in */}
              {canManage && activeSession.is_open && (
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="form-input pl-8 text-sm" placeholder="Search member to check in..."
                      value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
                  </div>
                  {memberSearch && filteredMembers.length > 0 && (
                    <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                      {filteredMembers.slice(0, 8).map(m => (
                        <button key={m.id} onClick={() => { checkIn(m.id); setMemberSearch('') }}
                          disabled={checkingIn === m.id}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                          <img src={m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=04003D&color=FF9700&size=40&bold=true`}
                            alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-navy truncate">{m.name}</div>
                            <div className="text-xs text-gray-400">{m.mutcu_number}</div>
                          </div>
                          {checkingIn === m.id
                            ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange" />
                            : <CheckCircle size={16} className="text-teal flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Attendance list */}
              <div className="max-h-64 overflow-y-auto">
                {records.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">No check-ins yet.</div>
                ) : records.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50">
                    <span className="text-xs text-gray-300 w-5">{i + 1}</span>
                    <img src={r.member?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.member?.name || 'M')}&background=04003D&color=FF9700&size=40&bold=true`}
                      alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-navy truncate">{r.member?.name}</div>
                      <div className="text-xs text-gray-400">{r.member?.mutcu_number} · {r.member?.primary_ministry?.replace(' Ministry', '') || 'General'}</div>
                    </div>
                    <div className="text-xs text-gray-400">{new Date(r.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                    {canManage && (
                      <button onClick={() => removeCheckIn(r.user_id)} className="text-gray-300 hover:text-red p-1">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}