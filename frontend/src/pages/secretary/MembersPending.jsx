import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, XCircle, CheckSquare, Square, Clock, User, AlertTriangle } from 'lucide-react'

export default function MembersPending() {
  const [tab, setTab] = useState('registrations') // registrations | profile_changes
  const [pending, setPending] = useState([])
  const [profileChanges, setProfileChanges] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingChanges, setLoadingChanges] = useState(true)
  const [processing, setProcessing] = useState({})
  const [selected, setSelected] = useState([])
  const [bulkApproving, setBulkApproving] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingId, setRejectingId] = useState(null)

  useEffect(() => {
    api.get('/members/pending').then(r => setPending(r.data.members || [])).finally(() => setLoading(false))
    api.get('/users/pending-changes').then(r => setProfileChanges(r.data.members || [])).catch(() => {}).finally(() => setLoadingChanges(false))
  }, [])

  // ─── Registration approvals ───────────────────────────────────────────────
  const approve = async id => {
    setProcessing(prev => ({ ...prev, [id]: 'approving' }))
    try {
      const { data } = await api.post(`/members/${id}/approve`)
      toast.success(data.message)
      setPending(prev => prev.filter(m => m.id !== id))
      setSelected(prev => prev.filter(s => s !== id))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setProcessing(prev => ({ ...prev, [id]: null })) }
  }

  const reject = async id => {
    if (!window.confirm('Reject this registration?')) return
    setProcessing(prev => ({ ...prev, [id]: 'rejecting' }))
    try {
      await api.post(`/members/${id}/reject`)
      toast.success('Registration rejected')
      setPending(prev => prev.filter(m => m.id !== id))
      setSelected(prev => prev.filter(s => s !== id))
    } catch (err) { toast.error('Failed') }
    finally { setProcessing(prev => ({ ...prev, [id]: null })) }
  }

  const bulkApprove = async () => {
    if (selected.length === 0) return toast.error('Select members to approve')
    if (!window.confirm(`Approve ${selected.length} members?`)) return
    setBulkApproving(true)
    try {
      const { data } = await api.post('/admin/members/bulk-approve', { member_ids: selected })
      toast.success(data.message)
      setPending(prev => prev.filter(m => !selected.includes(m.id)))
      setSelected([])
    } catch (err) { toast.error(err.response?.data?.error || 'Bulk approve failed') }
    finally { setBulkApproving(false) }
  }

  const toggleSelect = id => setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  const toggleAll = () => setSelected(selected.length === pending.length ? [] : pending.map(m => m.id))

  // ─── Profile change approvals ─────────────────────────────────────────────
  const approveChanges = async id => {
    setProcessing(prev => ({ ...prev, [`change_${id}`]: 'approving' }))
    try {
      await api.post(`/users/${id}/approve-changes`)
      toast.success('Profile changes approved')
      setProfileChanges(prev => prev.filter(m => m.id !== id))
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setProcessing(prev => ({ ...prev, [`change_${id}`]: null })) }
  }

  const rejectChanges = async (id, reason) => {
    setProcessing(prev => ({ ...prev, [`change_${id}`]: 'rejecting' }))
    try {
      await api.post(`/users/${id}/reject-changes`, { reason })
      toast.success('Profile changes rejected')
      setProfileChanges(prev => prev.filter(m => m.id !== id))
      setRejectingId(null)
      setRejectReason('')
    } catch (err) { toast.error('Failed') }
    finally { setProcessing(prev => ({ ...prev, [`change_${id}`]: null })) }
  }

  const FIELD_LABELS = { year_of_study: 'Year of Study', student_id: 'Student ID', course_type: 'Course Type', email: 'Email Address' }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/secretary/members" className="btn-outline btn-sm"><ArrowLeft size={14} /> Back</Link>
        <div>
          <h1 className="page-title">Pending Approvals</h1>
          <p className="text-gray-500 text-sm">
            {pending.length} registration{pending.length !== 1 ? 's' : ''} · {profileChanges.length} profile change{profileChanges.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('registrations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-montserrat font-bold transition-all ${tab === 'registrations' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <User size={14} /> New Registrations
          {pending.length > 0 && <span className="bg-orange text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pending.length}</span>}
        </button>
        <button onClick={() => setTab('profile_changes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-montserrat font-bold transition-all ${tab === 'profile_changes' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Clock size={14} /> Profile Change Requests
          {profileChanges.length > 0 && <span className="bg-orange text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{profileChanges.length}</span>}
        </button>
      </div>

      {/* ─── New Registrations Tab ─────────────────────────────────────────── */}
      {tab === 'registrations' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>
          ) : pending.length === 0 ? (
            <div className="card p-10 text-center">
              <CheckCircle size={40} className="text-teal mx-auto mb-3" />
              <h2 className="font-montserrat font-bold text-navy text-lg mb-1">All caught up!</h2>
              <p className="text-gray-500 text-sm">No pending registrations.</p>
            </div>
          ) : (
            <>
              {/* Bulk actions */}
              <div className="flex items-center gap-3 mb-4">
                <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-gray-500 hover:text-navy transition-colors">
                  {selected.length === pending.length ? <CheckSquare size={16} className="text-orange" /> : <Square size={16} />}
                  {selected.length === pending.length ? 'Deselect All' : 'Select All'}
                </button>
                {selected.length > 0 && (
                  <button onClick={bulkApprove} disabled={bulkApproving} className="btn-primary btn-sm">
                    {bulkApproving ? 'Approving...' : `Approve ${selected.length} Selected`}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {pending.map(m => (
                  <div key={m.id} className={`card p-4 ${selected.includes(m.id) ? 'border-orange' : ''}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleSelect(m.id)} className="mt-1 flex-shrink-0">
                        {selected.includes(m.id) ? <CheckSquare size={18} className="text-orange" /> : <Square size={18} className="text-gray-300" />}
                      </button>
                      <img src={m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=04003D&color=FF9700&size=200&bold=true`}
                        alt={m.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-montserrat font-bold text-navy">{m.name}</h3>
                          <span className="badge badge-orange text-xs">{m.membership_type || 'full'}</span>
                        </div>
                        <p className="text-gray-500 text-sm">{m.email}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                          {m.student_id && <span>ID: {m.student_id}</span>}
                          {m.year_of_study && <span>Year {m.year_of_study}</span>}
                          {m.primary_ministry && <span>{m.primary_ministry}</span>}
                          {m.gender && <span className="capitalize">{m.gender}</span>}
                        </div>
                        {m.faith_declaration_signed && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-teal">
                            <CheckCircle size={12} /> Faith declaration signed
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => approve(m.id)} disabled={!!processing[m.id]}
                          className="btn-primary btn-sm">
                          {processing[m.id] === 'approving' ? '...' : <><CheckCircle size={14} /> Approve</>}
                        </button>
                        <button onClick={() => reject(m.id)} disabled={!!processing[m.id]}
                          className="btn-outline btn-sm text-red border-red/30 hover:bg-red/5">
                          {processing[m.id] === 'rejecting' ? '...' : <><XCircle size={14} /> Reject</>}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ─── Profile Changes Tab ───────────────────────────────────────────── */}
      {tab === 'profile_changes' && (
        <>
          {loadingChanges ? (
            <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>
          ) : profileChanges.length === 0 ? (
            <div className="card p-10 text-center">
              <CheckCircle size={40} className="text-teal mx-auto mb-3" />
              <h2 className="font-montserrat font-bold text-navy text-lg mb-1">No pending profile changes</h2>
              <p className="text-gray-500 text-sm">All member profile change requests have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {profileChanges.map(m => {
                const changes = m.pending_changes || {}
                const { requested_at, _current, ...requestedFields } = changes
                return (
                  <div key={m.id} className="card p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <img src={m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=04003D&color=FF9700&size=200&bold=true`}
                        alt={m.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-montserrat font-bold text-navy">{m.name}</h3>
                          {m.mutcu_number && <span className="badge badge-navy text-xs">{m.mutcu_number}</span>}
                        </div>
                        <p className="text-gray-400 text-xs">{m.email} · {m.primary_ministry || 'General'}</p>
                        {requested_at && <p className="text-gray-300 text-xs mt-0.5">Requested: {new Date(requested_at).toLocaleString('en-GB')}</p>}
                      </div>
                      <AlertTriangle size={16} className="text-orange flex-shrink-0 mt-1" />
                    </div>

                    {/* Show what changed */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <h5 className="font-montserrat font-bold text-navy text-sm mb-3">Requested Changes</h5>
                      <div className="space-y-2">
                        {Object.entries(requestedFields).map(([field, newVal]) => (
                          <div key={field} className="flex items-center gap-3 text-sm">
                            <span className="text-gray-500 w-32 flex-shrink-0">{FIELD_LABELS[field] || field}:</span>
                            <span className="text-red-400 line-through text-xs">{_current?.[field] || '(not set)'}</span>
                            <span className="text-gray-400 text-xs">→</span>
                            <span className="text-teal font-semibold">{String(newVal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {rejectingId === m.id ? (
                      <div className="space-y-2">
                        <input className="form-input text-sm" placeholder="Reason for rejection (optional)"
                          value={rejectReason} onChange={e => setRejectReason(e.target.value)} autoFocus />
                        <div className="flex gap-2">
                          <button onClick={() => rejectChanges(m.id, rejectReason)} disabled={!!processing[`change_${m.id}`]}
                            className="btn-outline btn-sm text-red border-red/30 flex-1 justify-center">
                            {processing[`change_${m.id}`] === 'rejecting' ? 'Rejecting...' : 'Confirm Reject'}
                          </button>
                          <button onClick={() => { setRejectingId(null); setRejectReason('') }} className="btn-outline btn-sm px-3">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => approveChanges(m.id)} disabled={!!processing[`change_${m.id}`]}
                          className="btn-primary btn-sm flex-1 justify-center">
                          {processing[`change_${m.id}`] === 'approving' ? 'Approving...' : <><CheckCircle size={14} /> Approve Changes</>}
                        </button>
                        <button onClick={() => setRejectingId(m.id)}
                          className="btn-outline btn-sm text-red border-red/30 flex-1 justify-center">
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}