import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Shield, Edit2, X, Check, Search, UserMinus, ChevronDown, Hash, RefreshCw, Plus } from 'lucide-react'

const ROLE_GROUPS = [
  { group: 'Executive Council — Core', roles: [
    { value: 'super_admin',    label: 'Super Admin (System)' },
    { value: 'ec_admin',       label: 'Chairperson of the Union' },
    { value: 'cu_secretary',   label: 'CU Secretary' },
    { value: 'vice_secretary', label: 'Vice Secretary' },
    { value: 'cu_treasurer',   label: 'CU Treasurer' },
    { value: '1st_vp',         label: '1st Vice Chairperson (Female)' },
    { value: '2nd_vp',         label: '2nd Vice Chairperson (Male)' },
  ]},
  { group: 'Executive Council — Ministry Coordinators', roles: [
    { value: 'prayer_coordinator',       label: 'Prayer Coordinator (EC)' },
    { value: 'music_coordinator',        label: 'Music Coordinator (EC)' },
    { value: 'missions_coordinator',     label: 'Missions & Evangelism Coordinator (EC)' },
    { value: 'bible_study_coordinator',  label: 'Bible Study & Training Coordinator (EC)' },
    { value: 'discipleship_coordinator', label: 'Discipleship Coordinator (EC)' },
    { value: 'tech_media_coordinator',   label: 'Technical & Media Coordinator (EC)' },
    { value: 'creative_arts_coordinator',label: 'Creative Arts Coordinator (EC)' },
  ]},
  { group: 'Nomination College', roles: [
    { value: 'nc_chair',     label: 'NC Chairperson' },
    { value: 'nc_secretary', label: 'NC Secretary' },
    { value: 'nc_member',    label: 'NC Member' },
  ]},
  { group: 'Ministry Committee Secretaries', roles: [
    { value: 'music_secretary',          label: 'Music Ministry Secretary' },
    { value: 'creative_arts_secretary',  label: 'Creative Arts Ministry Secretary' },
    { value: 'technical_media_secretary',label: 'Technical & Media Ministry Secretary' },
    { value: 'hospitality_secretary',    label: 'Hospitality Ministry Secretary' },
    { value: 'prayer_secretary',         label: 'Prayer Ministry Secretary' },
    { value: 'missions_secretary',       label: 'Missions & Evangelism Ministry Secretary' },
    { value: 'bible_study_secretary',    label: 'Bible Study & Training Ministry Secretary' },
    { value: 'discipleship_secretary',   label: 'Discipleship Ministry Secretary' },
    { value: 'welfare_secretary',        label: 'Welfare Ministry Secretary' },
  ]},
  { group: 'Interim EC (May–August)', roles: [
    { value: 'interim_chair',                    label: 'Interim Chairperson' },
    { value: 'interim_secretary',                label: 'Interim Secretary' },
    { value: 'interim_treasurer',                label: 'Interim Treasurer' },
    { value: 'interim_prayer_coordinator',       label: 'Interim Prayer Coordinator' },
    { value: 'interim_music_coordinator',        label: 'Interim Music Coordinator' },
    { value: 'interim_missions_coordinator',     label: 'Interim Missions Coordinator' },
    { value: 'interim_bible_study_coordinator',  label: 'Interim Bible Study Coordinator' },
    { value: 'interim_tech_media_coordinator',   label: 'Interim Tech & Media Coordinator' },
    { value: 'interim_creative_arts_coordinator',label: 'Interim Creative Arts Coordinator' },
  ]},
  { group: 'General Members', roles: [
    { value: 'full_member',      label: 'Full Member' },
    { value: 'special_member',   label: 'Special Member (Postgraduate/ODL)' },
    { value: 'associate_member', label: 'Associate Member (Alumni)' },
  ]},
]

// Secondary roles are limited to NC and Interim positions (additive roles)
const SECONDARY_ROLE_OPTIONS = [
  { value: '', label: 'None (single role)' },
  { value: 'nc_chair',     label: 'NC Chairperson' },
  { value: 'nc_secretary', label: 'NC Secretary' },
  { value: 'nc_member',    label: 'NC Member' },
  { value: 'interim_chair',                    label: 'Interim Chairperson' },
  { value: 'interim_secretary',                label: 'Interim Secretary' },
  { value: 'interim_treasurer',                label: 'Interim Treasurer' },
  { value: 'interim_prayer_coordinator',       label: 'Interim Prayer Coordinator' },
  { value: 'interim_music_coordinator',        label: 'Interim Music Coordinator' },
  { value: 'interim_missions_coordinator',     label: 'Interim Missions Coordinator' },
  { value: 'interim_bible_study_coordinator',  label: 'Interim Bible Study Coordinator' },
  { value: 'interim_tech_media_coordinator',   label: 'Interim Tech & Media Coordinator' },
  { value: 'interim_creative_arts_coordinator',label: 'Interim Creative Arts Coordinator' },
]

const ALL_ROLES = ROLE_GROUPS.flatMap(g => g.roles)
const roleLabel = r => ALL_ROLES.find(x => x.value === r)?.label || r?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || ''

const ROLE_COLOR = {
  super_admin: 'bg-red/10 text-red border-red/20',
  ec_admin: 'bg-navy/10 text-navy border-navy/20',
  cu_secretary: 'bg-teal/10 text-teal border-teal/20',
  cu_treasurer: 'bg-green-100 text-green-700 border-green-200',
  nc_chair: 'bg-purple-100 text-purple-700 border-purple-200',
  nc_secretary: 'bg-purple-50 text-purple-600 border-purple-100',
  nc_member: 'bg-purple-50 text-purple-500 border-purple-100',
}
const getRoleColor = r => ROLE_COLOR[r] || 'bg-orange/10 text-orange border-orange/20'

export default function AdminRoles() {
  const [users, setUsers] = useState([])
  const [allMembers, setAllMembers] = useState([])
  const [form, setForm] = useState({ user_id: '', role: '' })
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [editSecondaryRole, setEditSecondaryRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberResults, setMemberResults] = useState([])
  // MUTCU number reassignment
  const [showReassign, setShowReassign] = useState(false)
  const [reassignPreview, setReassignPreview] = useState(null)
  const [reassigning, setReassigning] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/admin/roles'),
      api.get('/members?limit=500'),
    ]).then(([rolesRes, membersRes]) => {
      setUsers(rolesRes.data.users || [])
      setAllMembers(membersRes.data.members || [])
    }).finally(() => setLoading(false))
  }, [])

  // Live member search
  useEffect(() => {
    if (memberSearch.length < 2) { setMemberResults([]); return }
    const t = setTimeout(() => {
      const q = memberSearch.toLowerCase()
      setMemberResults(allMembers.filter(m =>
        m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.mutcu_number?.toLowerCase().includes(q)
      ).slice(0, 8))
    }, 200)
    return () => clearTimeout(t)
  }, [memberSearch, allMembers])

  const assign = async e => {
    e.preventDefault()
    if (!form.user_id || !form.role) return toast.error('Select a member and role')
    setAssigning(true)
    try {
      const { data } = await api.put(`/admin/roles/${form.user_id}`, { role: form.role })
      toast.success(data.message)
      setUsers(prev => {
        const exists = prev.find(u => u.id === form.user_id)
        if (exists) return prev.map(u => u.id === form.user_id ? { ...u, role: form.role } : u)
        const member = allMembers.find(m => m.id === form.user_id)
        return member ? [...prev, { ...member, role: form.role }] : prev
      })
      setForm({ user_id: '', role: '' })
      setMemberSearch('')
      setMemberResults([])
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setAssigning(false) }
  }

  const startEdit = (user) => {
    setEditingId(user.id)
    setEditRole(user.role)
    setEditSecondaryRole(user.secondary_role || '')
  }

  const saveEdit = async (userId) => {
    if (!editRole) return
    setSaving(true)
    try {
      // Save primary role
      const { data } = await api.put(`/admin/roles/${userId}`, { role: editRole })
      // Save secondary role (always send, even if empty — to clear it)
      await api.put(`/admin/roles/${userId}/secondary`, { secondary_role: editSecondaryRole || null })
      toast.success(data.message)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: editRole, secondary_role: editSecondaryRole || null } : u))
      setEditingId(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update role') }
    finally { setSaving(false) }
  }

  const removeRole = async (user) => {
    if (!window.confirm(`Remove ${user.name}'s special role?\n\nThey will be set back to "Full Member" and lose all elevated access immediately.`)) return
    setSaving(true)
    try {
      await api.put(`/admin/roles/${user.id}`, { role: 'full_member' })
      await api.put(`/admin/roles/${user.id}/secondary`, { secondary_role: null })
      toast.success(`${user.name} returned to Full Member`)
      setUsers(prev => prev.filter(u => u.id !== user.id))
      setEditingId(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to remove role') }
    finally { setSaving(false) }
  }

  // MUTCU number reassignment
  const previewReassign = async () => {
    setReassigning(true)
    try {
      const { data } = await api.post('/admin/members/reassign-numbers', { dry_run: true })
      setReassignPreview(data)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to preview') }
    finally { setReassigning(false) }
  }

  const applyReassign = async () => {
    if (!window.confirm(`Apply MUTCU number reassignment?\n\n${reassignPreview?.total_changes} members will have their numbers updated.\n\nThis cannot be undone.`)) return
    setReassigning(true)
    try {
      const { data } = await api.post('/admin/members/reassign-numbers', { dry_run: false })
      toast.success(`${data.applied} MUTCU numbers reassigned successfully`)
      setReassignPreview(null)
      setShowReassign(false)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to reassign') }
    finally { setReassigning(false) }
  }

  // Filter the list
  const filteredUsers = users.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchGroup = !filterGroup || ROLE_GROUPS.find(g => g.group === filterGroup)?.roles.some(r => r.value === u.role)
    return matchSearch && matchGroup
  })

  // Group users by role group for display
  const groupedUsers = ROLE_GROUPS.map(g => ({
    ...g,
    members: filteredUsers.filter(u => g.roles.some(r => r.value === u.role))
  })).filter(g => g.members.length > 0)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Role Management</h1>
          <p className="page-subtitle">Assign, edit, and remove system roles — {users.length} members with special roles</p>
        </div>
        <button onClick={() => setShowReassign(!showReassign)}
          className="btn-outline btn-sm flex items-center gap-2">
          <Hash size={14} /> Reassign MUTCU Numbers
        </button>
      </div>

      {/* MUTCU Number Reassignment Panel */}
      {showReassign && (
        <div className="card p-5 mb-6 border-2 border-orange/30 bg-orange/5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-montserrat font-bold text-navy text-sm flex items-center gap-2">
                <Hash size={14} className="text-orange" /> MUTCU Number Reassignment
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Resequences MUTCU numbers in registration order after deletions. Run a dry-run preview first.
              </p>
            </div>
            <button onClick={() => { setShowReassign(false); setReassignPreview(null) }} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-3 mb-4">
            <button onClick={previewReassign} disabled={reassigning} className="btn-outline btn-sm flex items-center gap-2">
              {reassigning ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-navy" /> : <RefreshCw size={13} />}
              Preview Changes (Dry Run)
            </button>
            {reassignPreview && reassignPreview.total_changes > 0 && (
              <button onClick={applyReassign} disabled={reassigning} className="btn-primary btn-sm flex items-center gap-2">
                <Check size={13} /> Apply {reassignPreview.total_changes} Changes
              </button>
            )}
          </div>

          {reassignPreview && (
            <div>
              {reassignPreview.total_changes === 0 ? (
                <div className="text-sm text-teal font-semibold flex items-center gap-2">
                  <Check size={14} /> All MUTCU numbers are already in correct sequence. No changes needed.
                </div>
              ) : (
                <div>
                  <div className="text-xs font-semibold text-navy mb-2">{reassignPreview.total_changes} numbers will change:</div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {reassignPreview.changes.slice(0, 50).map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 w-40 truncate">{c.name}</span>
                        <span className="text-red-500 line-through">{c.old || 'none'}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-teal font-semibold">{c.new}</span>
                      </div>
                    ))}
                    {reassignPreview.changes.length > 50 && (
                      <div className="text-xs text-gray-400">...and {reassignPreview.changes.length - 50} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Assign New Role */}
      <div className="card p-5 mb-6">
        <h2 className="font-montserrat font-bold text-navy text-sm mb-4 flex items-center gap-2">
          <Shield size={14} className="text-orange" /> Assign Role to Member
        </h2>
        <form onSubmit={assign}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            {/* Member search */}
            <div className="relative">
              <label className="form-label">Member <span className="text-orange">*</span></label>
              <input className="form-input" placeholder="Search by name, email or MUTCU number..."
                value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); if (!e.target.value) setForm(f => ({ ...f, user_id: '' })) }} />
              {memberResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {memberResults.map(m => (
                    <button key={m.id} type="button"
                      onClick={() => { setForm(f => ({ ...f, user_id: m.id })); setMemberSearch(`${m.name} (${m.mutcu_number || m.email})`); setMemberResults([]) }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left">
                      <img src={m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=04003D&color=FF9700&size=40&bold=true`}
                        alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-navy">{m.name}</div>
                        <div className="text-xs text-gray-400">{m.mutcu_number} · {m.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {form.user_id && (
                <div className="mt-1 text-xs text-teal flex items-center gap-1">
                  <Check size={11} /> Member selected
                </div>
              )}
            </div>

            {/* Role select */}
            <div>
              <label className="form-label">Role <span className="text-orange">*</span></label>
              <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required>
                <option value="">Select role...</option>
                {ROLE_GROUPS.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <button type="submit" disabled={assigning || !form.user_id || !form.role} className="btn-primary">
              {assigning ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Shield size={15} />}
              {assigning ? 'Assigning...' : 'Assign Role'}
            </button>
          </div>
        </form>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-8 py-1.5 text-sm" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select text-sm py-1.5" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
          <option value="">All Role Groups</option>
          {ROLE_GROUPS.map(g => <option key={g.group} value={g.group}>{g.group}</option>)}
        </select>
        {(search || filterGroup) && (
          <button onClick={() => { setSearch(''); setFilterGroup('') }} className="btn-outline btn-sm"><X size={13} /> Clear</button>
        )}
      </div>

      {/* Role list — grouped */}
      {filteredUsers.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <Shield size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">No members with special roles found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedUsers.map(group => (
            <div key={group.group} className="card overflow-hidden">
              <div className="card-header bg-gray-50">
                <h3 className="font-montserrat font-bold text-navy text-sm">{group.group}</h3>
                <span className="badge badge-gray">{group.members.length}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {group.members.map(user => {
                  const isEditing = editingId === user.id
                  const photoUrl = user.photo_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'M')}&background=04003D&color=FF9700&size=80&bold=true`
                  return (
                    <div key={user.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-all ${isEditing ? 'bg-orange/5 border-l-2 border-orange' : ''}`}>
                      {/* Avatar */}
                      <img src={photoUrl} alt={user.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-gray-100" />

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-navy text-sm truncate">{user.name}</div>
                        <div className="text-xs text-gray-400 truncate">{user.email}</div>
                      </div>

                      {/* Role — editable inline */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isEditing ? (
                          <div className="flex flex-col gap-1.5">
                            <div>
                              <div className="text-xs text-gray-400 mb-0.5">Primary Role</div>
                              <select className="form-select text-xs py-1 w-52" value={editRole}
                                onChange={e => setEditRole(e.target.value)} autoFocus>
                                {ROLE_GROUPS.map(g => (
                                  <optgroup key={g.group} label={g.group}>
                                    {g.roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                  </optgroup>
                                ))}
                              </select>
                            </div>
                            <div>
                              <div className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                                <Plus size={10} /> Secondary Role <span className="text-gray-300">(NC/Interim only)</span>
                              </div>
                              <select className="form-select text-xs py-1 w-52" value={editSecondaryRole}
                                onChange={e => setEditSecondaryRole(e.target.value)}>
                                {SECONDARY_ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getRoleColor(user.role)}`}>
                              {roleLabel(user.role)}
                            </span>
                            {user.secondary_role && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-600 border-purple-100 flex items-center gap-1">
                                <Plus size={9} /> {roleLabel(user.secondary_role)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEdit(user.id)} disabled={saving}
                              className="p-1.5 bg-teal/10 text-teal rounded-lg hover:bg-teal/20 transition-all" title="Save">
                              {saving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-teal" /> : <Check size={14} />}
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="p-1.5 bg-gray-100 text-gray-400 rounded-lg hover:bg-gray-200 transition-all" title="Cancel">
                              <X size={14} />
                            </button>
                            <button onClick={() => removeRole(user)} disabled={saving}
                              className="p-1.5 bg-red/10 text-red rounded-lg hover:bg-red/20 transition-all ml-1" title="Remove role (set to Full Member)">
                              <UserMinus size={14} />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => startEdit(user)}
                            className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-all" title="Edit role">
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help text */}
      <div className="card p-4 mt-5 bg-navy/5 border border-navy/10">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-2"><Edit2 size={11} className="text-navy" /> <span>Click the <strong>pencil icon</strong> to edit primary and secondary roles inline</span></div>
          <div className="flex items-center gap-2"><Plus size={11} className="text-purple-500" /> <span><strong>Secondary roles</strong> allow a member to hold e.g. Music Coordinator + NC Chair simultaneously — they keep all ministry access</span></div>
          <div className="flex items-center gap-2"><UserMinus size={11} className="text-red" /> <span>Click the <strong>remove icon</strong> to revoke their special role and return them to Full Member</span></div>
          <div className="flex items-center gap-2"><Hash size={11} className="text-orange" /> <span>Use <strong>Reassign MUTCU Numbers</strong> to resequence numbers after member deletions</span></div>
          <div className="flex items-center gap-2"><Shield size={11} className="text-orange" /> <span>Role changes take effect <strong>immediately</strong> — the member's access updates on their next page load</span></div>
        </div>
      </div>
    </div>
  )
}
