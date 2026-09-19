import { useEffect, useState, useRef } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import {
  History, Search, Plus, Edit2, Trash2, X, Check,
  Camera, User, LayoutGrid, List, ChevronDown
} from 'lucide-react'

export default function Leadership() {
  const { isAdmin } = useAuth()
  const [current, setCurrent] = useState([])
  const [history, setHistory] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('current')
  const [historyView, setHistoryView] = useState('list') // 'list' | 'grid'
  const [searchName, setSearchName] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [manualForm, setManualForm] = useState({
    position_id: '', user_id: '', spiritual_year: '', term_number: 1,
    commissioned_at: '', is_current: false, notes: '',
    member_name: '', photo_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberResults, setMemberResults] = useState([])
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoRef = useRef(null)

  const adminCanEdit = isAdmin && isAdmin()

  const loadData = async () => {
    setLoading(true)
    try {
      const [posRes, curRes, histRes] = await Promise.all([
        api.get('/positions').catch(() => ({ data: { positions: [] } })),
        api.get('/leadership/current').catch(() => ({ data: { ec: [] } })),
        api.get('/leadership/history').catch(() => ({ data: { history: [] } })),
      ])
      setPositions(posRes.data.positions || [])
      setCurrent(curRes.data.ec || [])
      setHistory(histRes.data.history || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  // Live member search
  useEffect(() => {
    if (memberSearch.length < 2) { setMemberResults([]); return }
    const t = setTimeout(() => {
      api.get(`/members?search=${encodeURIComponent(memberSearch)}&limit=8`)
        .then(r => setMemberResults(r.data.members || r.data.users || []))
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [memberSearch])

  const selectMember = (member) => {
    setManualForm(f => ({
      ...f,
      user_id: member.id,
      member_name: member.name,
      photo_url: member.photo_url || '',
    }))
    setPhotoPreview(member.photo_url || '')
    setMemberSearch(member.name)
    setMemberResults([])
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const uploadPhoto = async () => {
    if (!photoFile) return manualForm.photo_url
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('photo', photoFile)
      const res = await api.post('/upload/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const url = res.data.url || res.data.photo_url || ''
      setManualForm(f => ({ ...f, photo_url: url }))
      return url
    } catch {
      toast.error('Photo upload failed — entry will be saved without photo')
      return manualForm.photo_url
    } finally { setUploadingPhoto(false) }
  }

  const resetForm = () => {
    setManualForm({ position_id: '', user_id: '', spiritual_year: '', term_number: 1, commissioned_at: '', is_current: false, notes: '', member_name: '', photo_url: '' })
    setMemberSearch('')
    setMemberResults([])
    setPhotoFile(null)
    setPhotoPreview('')
    setEditEntry(null)
  }

  const saveManualEntry = async () => {
    if (!manualForm.position_id || !manualForm.spiritual_year) {
      return toast.error('Position and spiritual year are required')
    }
    setSaving(true)
    try {
      let finalPhotoUrl = manualForm.photo_url
      if (photoFile) finalPhotoUrl = await uploadPhoto()

      const payload = { ...manualForm, photo_url: finalPhotoUrl }

      if (editEntry) {
        await api.put(`/leadership/${editEntry.id}`, payload)
        toast.success('Entry updated')
      } else {
        await api.post('/leadership/manual', payload)
        toast.success('Leadership entry added')
      }
      await loadData()
      setShowManual(false)
      resetForm()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const deleteEntry = async (id) => {
    if (!window.confirm('Delete this leadership entry? This cannot be undone.')) return
    try {
      await api.delete(`/leadership/${id}`)
      setCurrent(prev => prev.filter(a => a.id !== id))
      setHistory(prev => prev.filter(a => a.id !== id))
      toast.success('Entry deleted')
    } catch { toast.error('Failed to delete') }
  }

  const openEdit = (appt) => {
    setEditEntry(appt)
    setManualForm({
      position_id: appt.position?.id || appt.position_id || '',
      user_id: appt.user?.id || appt.user_id || '',
      spiritual_year: appt.spiritual_year || '',
      term_number: appt.term_number || 1,
      commissioned_at: appt.commissioned_at?.split('T')[0] || '',
      is_current: appt.is_current || false,
      notes: appt.notes || '',
      member_name: appt.user?.name || appt.notes || '',
      photo_url: appt.user?.photo_url || appt.photo_url || '',
    })
    setMemberSearch(appt.user?.name || appt.notes || '')
    setPhotoPreview(appt.user?.photo_url || appt.photo_url || '')
    setPhotoFile(null)
    setShowManual(true)
  }

  const filteredHistory = history.filter(a => {
    const name = (a.user?.name || a.notes || '').toLowerCase()
    const pos = a.position?.title || ''
    return (
      (!searchName || name.includes(searchName.toLowerCase())) &&
      (!filterYear || a.spiritual_year === filterYear) &&
      (!filterPosition || pos === filterPosition)
    )
  })

  const uniqueYears = [...new Set(history.map(a => a.spiritual_year).filter(Boolean))].sort().reverse()

  const getPhotoUrl = (appt) =>
    appt.user?.photo_url || appt.photo_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.user?.name || appt.notes || 'M')}&background=04003D&color=FF9700&size=200&bold=true`

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Leadership History</h1>
          <p className="page-subtitle">Current and past MUTCU Executive Council members</p>
        </div>
        {adminCanEdit && (
          <button onClick={() => { resetForm(); setShowManual(true) }} className="btn-primary btn-sm">
            <Plus size={14} /> Add Entry
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {[{ id: 'current', label: `Current EC (${current.length})` }, { id: 'history', label: `History (${history.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Current EC — Grid ── */}
      {tab === 'current' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {current.length === 0 ? (
            <div className="col-span-full card p-10 text-center text-gray-400">
              <History size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm">No current EC members found.</p>
              {adminCanEdit && (
                <button onClick={() => { resetForm(); setShowManual(true) }} className="btn-primary mt-3 mx-auto">
                  <Plus size={14} /> Add EC Member
                </button>
              )}
            </div>
          ) : current.map(appt => (
            <div key={appt.id} className="card p-4 text-center hover:shadow-md transition-all">
              <div className="relative inline-block mb-3">
                <img src={getPhotoUrl(appt)} alt={appt.user?.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-orange mx-auto" />
                {adminCanEdit && (
                  <button onClick={() => openEdit(appt)}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange rounded-full flex items-center justify-center shadow-sm hover:bg-orange/80">
                    <Edit2 size={11} className="text-white" />
                  </button>
                )}
              </div>
              <div className="font-montserrat font-bold text-navy text-sm mb-0.5">
                {appt.user?.name || appt.notes || '—'}
              </div>
              <div className="text-xs text-orange font-semibold mb-1">{appt.position?.title}</div>
              <div className="text-xs text-gray-400">{appt.spiritual_year}</div>
              {adminCanEdit && (
                <button onClick={() => deleteEntry(appt.id)}
                  className="mt-2 text-xs text-gray-300 hover:text-red transition-colors">
                  <Trash2 size={12} className="inline" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── History Tab ── */}
      {tab === 'history' && (
        <div>
          {/* Filters + View Toggle */}
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <div className="relative flex-1 min-w-40">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="form-input pl-8 py-1.5 text-sm" placeholder="Search by name..."
                value={searchName} onChange={e => setSearchName(e.target.value)} />
            </div>
            <select className="form-select text-sm py-1.5" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">All Years</option>
              {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="form-select text-sm py-1.5" value={filterPosition} onChange={e => setFilterPosition(e.target.value)}>
              <option value="">All Positions</option>
              {positions.map(p => <option key={p.id} value={p.title}>{p.title}</option>)}
            </select>
            {(searchName || filterYear || filterPosition) && (
              <button onClick={() => { setSearchName(''); setFilterYear(''); setFilterPosition('') }}
                className="btn-outline btn-sm"><X size={13} /> Clear</button>
            )}
            {/* View toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 ml-auto">
              <button onClick={() => setHistoryView('grid')}
                className={`p-1.5 rounded-md transition-all ${historyView === 'grid' ? 'bg-white shadow-sm text-navy' : 'text-gray-400 hover:text-navy'}`}
                title="Grid view"><LayoutGrid size={15} /></button>
              <button onClick={() => setHistoryView('list')}
                className={`p-1.5 rounded-md transition-all ${historyView === 'list' ? 'bg-white shadow-sm text-navy' : 'text-gray-400 hover:text-navy'}`}
                title="List view"><List size={15} /></button>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="card p-10 text-center text-gray-400">
              <History size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm">No leadership history found.</p>
            </div>
          ) : historyView === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredHistory.map(appt => (
                <div key={appt.id} className="card p-4 text-center hover:shadow-md transition-all">
                  <div className="relative inline-block mb-3">
                    <img src={getPhotoUrl(appt)} alt=""
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 mx-auto" />
                    {adminCanEdit && (
                      <button onClick={() => openEdit(appt)}
                        className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange rounded-full flex items-center justify-center shadow-sm hover:bg-orange/80">
                        <Edit2 size={9} className="text-white" />
                      </button>
                    )}
                  </div>
                  <div className="font-semibold text-navy text-xs mb-0.5">{appt.user?.name || appt.notes || '—'}</div>
                  <div className="text-xs text-orange font-semibold mb-0.5">{appt.position?.title}</div>
                  <div className="text-xs text-gray-400">{appt.spiritual_year}</div>
                  <div className="text-xs text-gray-300">Term {appt.term_number || 1}</div>
                  {adminCanEdit && (
                    <button onClick={() => deleteEntry(appt.id)}
                      className="mt-2 text-xs text-gray-300 hover:text-red transition-colors">
                      <Trash2 size={11} className="inline" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Member</th>
                    <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Position</th>
                    <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Year</th>
                    <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Term</th>
                    {adminCanEdit && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(appt => (
                    <tr key={appt.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={getPhotoUrl(appt)} alt=""
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-navy text-sm">{appt.user?.name || appt.notes || '—'}</div>
                            {appt.notes && appt.user?.name && <div className="text-xs text-gray-400">{appt.notes}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{appt.position?.title || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{appt.spiritual_year || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">Term {appt.term_number || 1}</td>
                      {adminCanEdit && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => openEdit(appt)} className="p-1.5 text-gray-400 hover:text-navy rounded-lg hover:bg-gray-100"><Edit2 size={13} /></button>
                            <button onClick={() => deleteEntry(appt.id)} className="p-1.5 text-gray-400 hover:text-red rounded-lg hover:bg-red/5"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showManual && adminCanEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">
                {editEntry ? 'Edit Leadership Entry' : 'Add Leadership Entry'}
              </h3>
              <button onClick={() => { setShowManual(false); resetForm() }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Photo upload */}
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-orange" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                      <User size={24} className="text-gray-300" />
                    </div>
                  )}
                  <button type="button" onClick={() => photoRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange rounded-full flex items-center justify-center shadow-sm hover:bg-orange/80">
                    <Camera size={11} className="text-white" />
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-navy mb-1">Profile Photo</div>
                  <div className="text-xs text-gray-400">Click the camera icon to upload, or link a registered member below to use their photo automatically.</div>
                  {photoFile && <div className="text-xs text-teal mt-1">✓ Photo selected: {photoFile.name}</div>}
                </div>
              </div>

              {/* Photo URL fallback */}
              {!photoFile && (
                <div>
                  <label className="form-label">Photo URL (optional)</label>
                  <input className="form-input" placeholder="https://..."
                    value={manualForm.photo_url}
                    onChange={e => { setManualForm(f => ({ ...f, photo_url: e.target.value })); setPhotoPreview(e.target.value) }} />
                </div>
              )}

              {/* Member search — link to registered member */}
              <div className="relative">
                <label className="form-label">Link to Registered Member (Optional)</label>
                <input className="form-input" placeholder="Search by name, email or MUTCU number..."
                  value={memberSearch}
                  onChange={e => {
                    setMemberSearch(e.target.value)
                    if (!e.target.value) setManualForm(f => ({ ...f, user_id: '', member_name: '' }))
                  }} />
                {memberResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-44 overflow-y-auto">
                    {memberResults.map(m => (
                      <button key={m.id} type="button" onClick={() => selectMember(m)}
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
                {manualForm.user_id && (
                  <div className="mt-1 text-xs text-teal flex items-center gap-1">
                    <Check size={11} /> Linked to registered member
                    <button type="button" onClick={() => { setManualForm(f => ({ ...f, user_id: '', member_name: '' })); setMemberSearch('') }}
                      className="ml-1 text-gray-400 hover:text-red"><X size={11} /></button>
                  </div>
                )}
              </div>

              {/* Member name for historical entries */}
              {!manualForm.user_id && (
                <div>
                  <label className="form-label">Member Name (if not in system)</label>
                  <input className="form-input" placeholder="e.g. John Doe"
                    value={manualForm.member_name}
                    onChange={e => setManualForm(f => ({ ...f, member_name: e.target.value }))} />
                </div>
              )}

              {/* Position */}
              <div>
                <label className="form-label">Position <span className="text-orange">*</span></label>
                <select className="form-select" value={manualForm.position_id}
                  onChange={e => setManualForm(f => ({ ...f, position_id: e.target.value }))}>
                  <option value="">Select position...</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>

              {/* Year + Term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Spiritual Year <span className="text-orange">*</span></label>
                  <input className="form-input" placeholder="e.g. 2025/2026"
                    value={manualForm.spiritual_year}
                    onChange={e => setManualForm(f => ({ ...f, spiritual_year: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Term Number</label>
                  <input type="number" className="form-input" min="1" max="2"
                    value={manualForm.term_number}
                    onChange={e => setManualForm(f => ({ ...f, term_number: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>

              {/* Commissioned date */}
              <div>
                <label className="form-label">Commissioned Date</label>
                <input type="date" className="form-input"
                  value={manualForm.commissioned_at}
                  onChange={e => setManualForm(f => ({ ...f, commissioned_at: e.target.value }))} />
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">Notes (Optional)</label>
                <input className="form-input" placeholder="Optional notes or context"
                  value={manualForm.notes}
                  onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {/* Is current */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-orange"
                  checked={manualForm.is_current}
                  onChange={e => setManualForm(f => ({ ...f, is_current: e.target.checked }))} />
                <span className="text-sm text-gray-700">Mark as current EC member</span>
              </label>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={saveManualEntry} disabled={saving || uploadingPhoto} className="btn-primary flex-1 justify-center">
                {saving || uploadingPhoto
                  ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      {uploadingPhoto ? 'Uploading photo...' : 'Saving...'}</>
                  : <><Check size={15} /> {editEntry ? 'Update Entry' : 'Add Entry'}</>}
              </button>
              <button onClick={() => { setShowManual(false); resetForm() }} className="btn-outline flex-1 justify-center">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}