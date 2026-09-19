import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Save, X, Award, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react'

export default function AdminPositions() {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', gender_constraint: '',
    max_terms: 2, chair_max_one_term: false, display_order: 99, is_active: true,
  })

  const load = () => {
    api.get('/positions/all').then(r => setPositions(r.data.positions || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const resetForm = () => {
    setForm({ title: '', description: '', gender_constraint: '', max_terms: 2, chair_max_one_term: false, display_order: positions.length + 1, is_active: true })
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (pos) => {
    setForm({
      title: pos.title,
      description: pos.description || '',
      gender_constraint: pos.gender_constraint || '',
      max_terms: pos.max_terms || 2,
      chair_max_one_term: pos.chair_max_one_term || false,
      display_order: pos.display_order || 99,
      is_active: pos.is_active !== false,
    })
    setEditingId(pos.id)
    setShowForm(true)
  }

  const save = async () => {
    if (!form.title.trim()) return toast.error('Position title is required')
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/positions/${editingId}`, form)
        toast.success('Position updated')
      } else {
        await api.post('/positions', form)
        toast.success('Position created')
      }
      load()
      resetForm()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  const toggleActive = async (pos) => {
    try {
      await api.put(`/positions/${pos.id}`, { is_active: !pos.is_active })
      setPositions(prev => prev.map(p => p.id === pos.id ? { ...p, is_active: !p.is_active } : p))
      toast.success(pos.is_active ? 'Position deactivated' : 'Position activated')
    } catch { toast.error('Failed to update') }
  }

  const moveOrder = async (pos, direction) => {
    const sorted = [...positions].sort((a, b) => a.display_order - b.display_order)
    const idx = sorted.findIndex(p => p.id === pos.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const swap = sorted[swapIdx]
    try {
      await Promise.all([
        api.put(`/positions/${pos.id}`, { display_order: swap.display_order }),
        api.put(`/positions/${swap.id}`, { display_order: pos.display_order }),
      ])
      load()
    } catch { toast.error('Failed to reorder') }
  }

  const deletePos = async (pos) => {
    if (!window.confirm(`Delete "${pos.title}"? This cannot be undone and may affect nomination cycles.`)) return
    try {
      await api.delete(`/positions/${pos.id}`)
      setPositions(prev => prev.filter(p => p.id !== pos.id))
      toast.success('Position deleted')
    } catch (err) { toast.error(err.response?.data?.error || 'Cannot delete — position may be in use') }
  }

  const sorted = [...positions].sort((a, b) => (a.display_order || 99) - (b.display_order || 99))

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">EC Positions</h1>
          <p className="page-subtitle">Manage Executive Council positions — {positions.filter(p => p.is_active).length} active</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary btn-sm">
          <Plus size={14} /> Add Position
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-5 mb-5 border-l-4 border-orange">
          <h3 className="font-montserrat font-bold text-navy mb-4">{editingId ? 'Edit Position' : 'Add New Position'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="form-label">Position Title <span className="text-orange">*</span></label>
              <input className="form-input" placeholder="e.g. Chairperson"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Brief description of the role"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Gender Constraint</label>
              <select className="form-select" value={form.gender_constraint} onChange={e => setForm(f => ({ ...f, gender_constraint: e.target.value }))}>
                <option value="">None (Any gender)</option>
                <option value="female">Female only</option>
                <option value="male">Male only</option>
              </select>
            </div>
            <div>
              <label className="form-label">Max Terms</label>
              <select className="form-select" value={form.max_terms} onChange={e => setForm(f => ({ ...f, max_terms: parseInt(e.target.value) }))}>
                <option value={1}>1 term</option>
                <option value={2}>2 terms</option>
                <option value={3}>3 terms</option>
              </select>
            </div>
            <div>
              <label className="form-label">Display Order</label>
              <input type="number" className="form-input" min="1" max="99"
                value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 99 }))} />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-orange" checked={form.chair_max_one_term}
                  onChange={e => setForm(f => ({ ...f, chair_max_one_term: e.target.checked }))} />
                <span className="text-sm text-gray-700">Chairperson: max 1 term</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-teal" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Save size={14} /> {editingId ? 'Update' : 'Create'} Position</>}
            </button>
            <button onClick={resetForm} className="btn-outline px-4"><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      {/* Positions list */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h2 className="font-montserrat font-bold text-navy text-sm">All Positions</h2>
          <span className="text-xs text-gray-400">{positions.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase w-16">Order</th>
                <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Position</th>
                <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Gender</th>
                <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Max Terms</th>
                <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((pos, idx) => (
                <tr key={pos.id} className={`border-b border-gray-50 hover:bg-gray-50 ${!pos.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400 w-5">{pos.display_order}</span>
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveOrder(pos, 'up')} disabled={idx === 0}
                          className="text-gray-300 hover:text-navy disabled:opacity-20"><ArrowUp size={11} /></button>
                        <button onClick={() => moveOrder(pos, 'down')} disabled={idx === sorted.length - 1}
                          className="text-gray-300 hover:text-navy disabled:opacity-20"><ArrowDown size={11} /></button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-navy">{pos.title}</div>
                    {pos.description && <div className="text-xs text-gray-400">{pos.description}</div>}
                    {pos.chair_max_one_term && <div className="text-xs text-orange">Chair: 1 term max</div>}
                  </td>
                  <td className="px-4 py-3">
                    {pos.gender_constraint ? (
                      <span className={`badge text-xs ${pos.gender_constraint === 'female' ? 'badge-teal' : 'badge-navy'}`}>
                        {pos.gender_constraint} only
                      </span>
                    ) : <span className="text-xs text-gray-400">Any</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{pos.max_terms || 2} term{(pos.max_terms || 2) > 1 ? 's' : ''}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${pos.is_active ? 'badge-teal' : 'badge-gray'}`}>
                      {pos.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => toggleActive(pos)} className="p-1.5 text-gray-400 hover:text-navy rounded-lg hover:bg-gray-100"
                        title={pos.is_active ? 'Deactivate' : 'Activate'}>
                        {pos.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button onClick={() => startEdit(pos)} className="p-1.5 text-gray-400 hover:text-navy rounded-lg hover:bg-gray-100">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deletePos(pos)} className="p-1.5 text-gray-400 hover:text-red rounded-lg hover:bg-red/5">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}