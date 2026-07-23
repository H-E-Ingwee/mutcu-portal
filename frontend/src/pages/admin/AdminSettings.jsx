import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  Settings, Mail, Church, Award, Bell, Save, Plus, Edit2,
  Trash2, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, X, Check, Send
} from 'lucide-react'

const TABS = [
  { id: 'identity', label: 'System Identity', icon: Settings },
  { id: 'email',    label: 'Email',           icon: Mail },
  { id: 'ministries', label: 'Ministries',    icon: Church },
  { id: 'positions',  label: 'EC Positions',  icon: Award },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

const GENDER_OPTIONS = [
  { value: '', label: 'Any Gender' },
  { value: 'male', label: 'Male Only' },
  { value: 'female', label: 'Female Only' },
]

export default function AdminSettings() {
  const [tab, setTab] = useState('identity')
  const [settings, setSettings] = useState({})
  const [ministries, setMinistries] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)

  // Ministry modal
  const [ministryModal, setMinistryModal] = useState(null) // null | 'new' | ministry object
  const [ministryForm, setMinistryForm] = useState({ name: '', description: '', display_order: '' })

  // Position modal
  const [positionModal, setPositionModal] = useState(null)
  const [positionForm, setPositionForm] = useState({ title: '', description: '', gender_constraint: '', max_terms: 2, chair_max_one_term: false, display_order: '' })

  useEffect(() => {
    Promise.all([
      api.get('/settings'),
      api.get('/ministries/all'),
      api.get('/positions/all'),
    ]).then(([sRes, mRes, pRes]) => {
      setSettings(sRes.data.settings || {})
      setMinistries(mRes.data.ministries || [])
      setPositions(pRes.data.positions || [])
    }).catch(() => toast.error('Failed to load settings'))
    .finally(() => setLoading(false))
  }, [])

  const setSetting = (key, value) => setSettings(s => ({ ...s, [key]: value }))

  const saveSettings = async (keys) => {
    setSaving(true)
    try {
      const payload = {}
      keys.forEach(k => { if (settings[k] !== undefined) payload[k] = settings[k] })
      await api.put('/settings', { settings: payload })
      toast.success('Settings saved!')
    } catch { toast.error('Failed to save settings') }
    finally { setSaving(false) }
  }

  const sendTestEmail = async () => {
    setTestingEmail(true)
    try {
      await api.post('/messages', {
        subject: 'MUTCU DMS — Email Test',
        body: 'This is a test email from your MUTCU DMS settings. If you received this, email is working correctly! ✅',
      })
      toast.success('Test email sent! Check your inbox.')
    } catch { toast.error('Test email failed') }
    finally { setTestingEmail(false) }
  }

  // ── Ministry CRUD ──────────────────────────────────────────────────────────
  const openMinistryModal = (ministry = null) => {
    if (ministry) {
      setMinistryForm({ name: ministry.name, description: ministry.description || '', display_order: ministry.display_order })
      setMinistryModal(ministry)
    } else {
      setMinistryForm({ name: '', description: '', display_order: ministries.length + 1 })
      setMinistryModal('new')
    }
  }

  const saveMinistry = async () => {
    if (!ministryForm.name.trim()) return toast.error('Ministry name required')
    setSaving(true)
    try {
      if (ministryModal === 'new') {
        const { data } = await api.post('/ministries', ministryForm)
        setMinistries(prev => [...prev, data.ministry].sort((a, b) => a.display_order - b.display_order))
        toast.success('Ministry created!')
      } else {
        const { data } = await api.put(`/ministries/${ministryModal.id}`, ministryForm)
        setMinistries(prev => prev.map(m => m.id === ministryModal.id ? data.ministry : m))
        toast.success('Ministry updated!')
      }
      setMinistryModal(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const toggleMinistry = async (ministry) => {
    try {
      const { data } = await api.put(`/ministries/${ministry.id}`, { is_active: !ministry.is_active })
      setMinistries(prev => prev.map(m => m.id === ministry.id ? data.ministry : m))
      toast.success(data.ministry.is_active ? 'Ministry activated' : 'Ministry deactivated')
    } catch { toast.error('Failed to update ministry') }
  }

  const moveMinistry = async (ministry, direction) => {
    const sorted = [...ministries].sort((a, b) => a.display_order - b.display_order)
    const idx = sorted.findIndex(m => m.id === ministry.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const swap = sorted[swapIdx]
    try {
      await Promise.all([
        api.put(`/ministries/${ministry.id}`, { display_order: swap.display_order }),
        api.put(`/ministries/${swap.id}`, { display_order: ministry.display_order }),
      ])
      setMinistries(prev => prev.map(m => {
        if (m.id === ministry.id) return { ...m, display_order: swap.display_order }
        if (m.id === swap.id) return { ...m, display_order: ministry.display_order }
        return m
      }))
    } catch { toast.error('Failed to reorder') }
  }

  // ── Position CRUD ──────────────────────────────────────────────────────────
  const openPositionModal = (position = null) => {
    if (position) {
      setPositionForm({
        title: position.title, description: position.description || '',
        gender_constraint: position.gender_constraint || '',
        max_terms: position.max_terms || 2,
        chair_max_one_term: position.chair_max_one_term || false,
        display_order: position.display_order,
      })
      setPositionModal(position)
    } else {
      setPositionForm({ title: '', description: '', gender_constraint: '', max_terms: 2, chair_max_one_term: false, display_order: positions.length + 1 })
      setPositionModal('new')
    }
  }

  const savePosition = async () => {
    if (!positionForm.title.trim()) return toast.error('Position title required')
    setSaving(true)
    try {
      if (positionModal === 'new') {
        const { data } = await api.post('/positions', positionForm)
        setPositions(prev => [...prev, data.position].sort((a, b) => a.display_order - b.display_order))
        toast.success('Position created!')
      } else {
        const { data } = await api.put(`/positions/${positionModal.id}`, positionForm)
        setPositions(prev => prev.map(p => p.id === positionModal.id ? data.position : p))
        toast.success('Position updated!')
      }
      setPositionModal(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const togglePosition = async (position) => {
    try {
      const { data } = await api.put(`/positions/${position.id}`, { is_active: !position.is_active })
      setPositions(prev => prev.map(p => p.id === position.id ? data.position : p))
      toast.success(data.position.is_active ? 'Position activated' : 'Position deactivated')
    } catch { toast.error('Failed to update position') }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
    </div>
  )

  const sortedMinistries = [...ministries].sort((a, b) => a.display_order - b.display_order)
  const sortedPositions = [...positions].sort((a, b) => a.display_order - b.display_order)

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">System Settings</h1><p className="page-subtitle">Configure your MUTCU DMS portal</p></div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-montserrat font-bold whitespace-nowrap transition-all ${tab === t.id ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* ── System Identity ── */}
      {tab === 'identity' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-montserrat font-bold text-navy text-sm mb-4">System Identity</h2>
          {[
            { key: 'app_name', label: 'Application Name', placeholder: 'MUTCU DMS' },
            { key: 'org_name', label: 'Full Organization Name', placeholder: "Murang'a University of Technology Christian Union" },
            { key: 'org_short_name', label: 'Short Name', placeholder: 'MUTCU' },
            { key: 'org_motto', label: 'Motto', placeholder: 'Inspire Love, Hope & Godliness' },
            { key: 'founding_year', label: 'Founding Year', placeholder: '2026', type: 'number' },
            { key: 'contact_email', label: 'Contact Email', placeholder: 'admin@mutcu.org', type: 'email' },
            { key: 'portal_url', label: 'Portal URL', placeholder: 'https://portal.mutcu.org', type: 'url' },
          ].map(f => (
            <div key={f.key}>
              <label className="form-label">{f.label}</label>
              <input type={f.type || 'text'} className="form-input" placeholder={f.placeholder}
                value={settings[f.key] || ''} onChange={e => setSetting(f.key, e.target.value)} />
            </div>
          ))}
          <button onClick={() => saveSettings(['app_name','org_name','org_short_name','org_motto','founding_year','contact_email','portal_url'])}
            disabled={saving} className="btn-primary">
            <Save size={15} />{saving ? 'Saving...' : 'Save Identity Settings'}
          </button>
        </div>
      )}

      {/* ── Email Settings ── */}
      {tab === 'email' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-montserrat font-bold text-navy text-sm mb-4">Email Configuration</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            📧 Emails are sent via <strong>Brevo API</strong>. SMTP credentials are set in your Render environment variables.
            These settings control the display name and reply address.
          </div>
          {[
            { key: 'mail_from_name', label: 'From Name (display name)', placeholder: 'MUTCU DMS' },
            { key: 'mail_reply_to', label: 'Reply-To Email', placeholder: 'admin@mutcu.org', type: 'email' },
          ].map(f => (
            <div key={f.key}>
              <label className="form-label">{f.label}</label>
              <input type={f.type || 'text'} className="form-input" placeholder={f.placeholder}
                value={settings[f.key] || ''} onChange={e => setSetting(f.key, e.target.value)} />
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={() => saveSettings(['mail_from_name','mail_reply_to'])}
              disabled={saving} className="btn-primary">
              <Save size={15} />{saving ? 'Saving...' : 'Save Email Settings'}
            </button>
            <button onClick={sendTestEmail} disabled={testingEmail} className="btn-outline">
              <Send size={14} />{testingEmail ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </div>
      )}

      {/* ── Ministries ── */}
      {tab === 'ministries' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-montserrat font-bold text-navy">Ministries</h2>
              <p className="text-xs text-gray-400">{ministries.filter(m => m.is_active).length} active ministries</p>
            </div>
            <button onClick={() => openMinistryModal()} className="btn-primary btn-sm">
              <Plus size={14} />Add Ministry
            </button>
          </div>
          <div className="card">
            {sortedMinistries.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0 ${!m.is_active ? 'opacity-50' : ''}`}>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveMinistry(m, 'up')} disabled={i === 0} className="text-gray-300 hover:text-navy disabled:opacity-20 transition-colors">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => moveMinistry(m, 'down')} disabled={i === sortedMinistries.length - 1} className="text-gray-300 hover:text-navy disabled:opacity-20 transition-colors">
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div className="w-7 h-7 bg-navy/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-navy text-xs font-bold">{m.display_order}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy text-sm">{m.name}</div>
                  {m.description && <div className="text-xs text-gray-400 truncate">{m.description}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleMinistry(m)} title={m.is_active ? 'Deactivate' : 'Activate'}
                    className={`transition-colors ${m.is_active ? 'text-teal hover:text-red' : 'text-gray-300 hover:text-teal'}`}>
                    {m.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button onClick={() => openMinistryModal(m)} className="text-gray-400 hover:text-navy transition-colors">
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Positions ── */}
      {tab === 'positions' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-montserrat font-bold text-navy">EC Positions</h2>
              <p className="text-xs text-gray-400">{positions.filter(p => p.is_active).length} active positions</p>
            </div>
            <button onClick={() => openPositionModal()} className="btn-primary btn-sm">
              <Plus size={14} />Add Position
            </button>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Position</th><th>Gender</th><th>Max Terms</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {sortedPositions.map(p => (
                    <tr key={p.id} className={!p.is_active ? 'opacity-50' : ''}>
                      <td className="text-gray-400 text-xs">{p.display_order}</td>
                      <td>
                        <div className="font-bold text-navy text-sm">{p.title}</div>
                        {p.chair_max_one_term && <div className="text-xs text-orange">Chair — 1 term max</div>}
                      </td>
                      <td>
                        {p.gender_constraint
                          ? <span className="badge badge-navy">{p.gender_constraint}</span>
                          : <span className="text-gray-400 text-xs">Any</span>}
                      </td>
                      <td className="text-sm text-gray-500">{p.chair_max_one_term ? '1' : p.max_terms} term{p.max_terms !== 1 ? 's' : ''}</td>
                      <td>
                        <button onClick={() => togglePosition(p)}
                          className={`transition-colors ${p.is_active ? 'text-teal hover:text-red' : 'text-gray-300 hover:text-teal'}`}>
                          {p.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                      </td>
                      <td>
                        <button onClick={() => openPositionModal(p)} className="btn-outline btn-sm text-xs">
                          <Edit2 size={12} />Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications ── */}
      {tab === 'notifications' && (
        <div className="card p-6">
          <h2 className="font-montserrat font-bold text-navy text-sm mb-2">Email Notification Triggers</h2>
          <p className="text-xs text-gray-400 mb-5">Control which events automatically send emails to members.</p>
          <div className="space-y-3">
            {[
              { key: 'notify_on_approval', label: 'Member Approval', desc: 'Email member when their application is approved' },
              { key: 'notify_on_rejection', label: 'Member Rejection', desc: 'Email member when their application is rejected' },
              { key: 'notify_nominations_open', label: 'Nominations Open', desc: 'Email all active members when nominations open' },
              { key: 'notify_nominees_published', label: 'Nominees Published', desc: 'Email all active members when nominees are published' },
              { key: 'notify_objection_period', label: 'Objection Period', desc: 'Email all active members when objection period opens' },
            ].map(n => (
              <div key={n.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-semibold text-navy text-sm">{n.label}</div>
                  <div className="text-xs text-gray-400">{n.desc}</div>
                </div>
                <button onClick={() => setSetting(n.key, settings[n.key] === 'true' ? 'false' : 'true')}
                  className={`transition-colors ${settings[n.key] === 'true' ? 'text-teal' : 'text-gray-300'}`}>
                  {settings[n.key] === 'true' ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => saveSettings(['notify_on_approval','notify_on_rejection','notify_nominations_open','notify_nominees_published','notify_objection_period'])}
            disabled={saving} className="btn-primary mt-5">
            <Save size={15} />{saving ? 'Saving...' : 'Save Notification Settings'}
          </button>
        </div>
      )}

      {/* ── Ministry Modal ── */}
      {ministryModal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">{ministryModal === 'new' ? 'Add Ministry' : 'Edit Ministry'}</h3>
              <button onClick={() => setMinistryModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Ministry Name *</label>
                <input type="text" className="form-input" placeholder="e.g. Prayer Ministry"
                  value={ministryForm.name} onChange={e => setMinistryForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} placeholder="Brief description of this ministry..."
                  value={ministryForm.description} onChange={e => setMinistryForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Display Order</label>
                <input type="number" className="form-input" min={1}
                  value={ministryForm.display_order} onChange={e => setMinistryForm(f => ({ ...f, display_order: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={saveMinistry} disabled={saving} className="btn-primary flex-1 justify-center">
                <Check size={15} />{saving ? 'Saving...' : 'Save Ministry'}
              </button>
              <button onClick={() => setMinistryModal(null)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Position Modal ── */}
      {positionModal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">{positionModal === 'new' ? 'Add Position' : 'Edit Position'}</h3>
              <button onClick={() => setPositionModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Position Title *</label>
                <input type="text" className="form-input" placeholder="e.g. Chairperson"
                  value={positionForm.title} onChange={e => setPositionForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} placeholder="Role description..."
                  value={positionForm.description} onChange={e => setPositionForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Gender Constraint</label>
                  <select className="form-select" value={positionForm.gender_constraint}
                    onChange={e => setPositionForm(f => ({ ...f, gender_constraint: e.target.value }))}>
                    {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Max Terms</label>
                  <input type="number" className="form-input" min={1} max={5}
                    value={positionForm.max_terms} onChange={e => setPositionForm(f => ({ ...f, max_terms: parseInt(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Display Order</label>
                <input type="number" className="form-input" min={1}
                  value={positionForm.display_order} onChange={e => setPositionForm(f => ({ ...f, display_order: parseInt(e.target.value) }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-orange"
                  checked={positionForm.chair_max_one_term}
                  onChange={e => setPositionForm(f => ({ ...f, chair_max_one_term: e.target.checked }))} />
                <span className="text-sm text-gray-700">Chairperson rule — limit to 1 term only</span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={savePosition} disabled={saving} className="btn-primary flex-1 justify-center">
                <Check size={15} />{saving ? 'Saving...' : 'Save Position'}
              </button>
              <button onClick={() => setPositionModal(null)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}