import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, Save, X, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

const MINISTRIES = [
  'Prayer Ministry', 'Music Ministry', 'Missions & Evangelism Ministry',
  'Bible Study & Training Ministry', 'Discipleship Ministry',
  'Creative Arts Ministry', 'Technical & Media Ministry',
  'Hospitality Ministry', 'Welfare Committee', 'Resource Mobilization Committee',
  'General / Administration',
]

const CATEGORIES = ['General', 'Events', 'Equipment', 'Transport', 'Printing', 'Welfare', 'Outreach', 'Training', 'Other']

export default function BudgetManager() {
  const [budgets, setBudgets] = useState([])
  const [vsActual, setVsActual] = useState([])
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ministry: '', category: 'General', allocated_amount: '', notes: '' })

  useEffect(() => {
    api.get('/treasury/spiritual-years').then(r => {
      const yrs = r.data.years || []
      // Add current year if not present
      const currentYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
      if (!yrs.includes(currentYear)) yrs.unshift(currentYear)
      setYears(yrs)
      setSelectedYear(yrs[0] || currentYear)
    }).catch(() => {
      const currentYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
      setYears([currentYear])
      setSelectedYear(currentYear)
    })
  }, [])

  useEffect(() => {
    if (!selectedYear) return
    setLoading(true)
    Promise.all([
      api.get(`/treasury/budgets?spiritual_year=${selectedYear}`),
      api.get(`/treasury/budgets/vs-actual?spiritual_year=${selectedYear}`),
    ]).then(([bRes, vaRes]) => {
      setBudgets(bRes.data.budgets || [])
      setVsActual(vaRes.data.vs_actual || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [selectedYear])

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.allocated_amount || 0), 0)

  const save = async () => {
    if (!form.ministry || !form.allocated_amount) return toast.error('Ministry and amount are required')
    setSaving(true)
    try {
      await api.post('/treasury/budgets', { ...form, spiritual_year: selectedYear })
      toast.success('Budget saved!')
      setShowForm(false)
      setEditingId(null)
      setForm({ ministry: '', category: 'General', allocated_amount: '', notes: '' })
      // Reload
      const [bRes, vaRes] = await Promise.all([
        api.get(`/treasury/budgets?spiritual_year=${selectedYear}`),
        api.get(`/treasury/budgets/vs-actual?spiritual_year=${selectedYear}`),
      ])
      setBudgets(bRes.data.budgets || [])
      setVsActual(vaRes.data.vs_actual || [])
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  const deleteBudget = async (id) => {
    if (!window.confirm('Delete this budget entry?')) return
    try {
      await api.delete(`/treasury/budgets/${id}`)
      setBudgets(prev => prev.filter(b => b.id !== id))
      toast.success('Budget entry deleted')
    } catch (err) { toast.error('Failed to delete') }
  }

  const startEdit = (b) => {
    setForm({ ministry: b.ministry, category: b.category, allocated_amount: b.allocated_amount, notes: b.notes || '' })
    setEditingId(b.id)
    setShowForm(true)
  }

  const downloadCSV = async () => {
    try {
      const res = await fetch(`/api/treasury/reports/budget-utilization?spiritual_year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mutcu_token')}` }
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `budget-${selectedYear}.csv`; a.click()
    } catch { toast.error('Export failed') }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Budget Manager</h1>
          <p className="page-subtitle">Set and track ministry budget allocations</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="form-select text-sm py-1.5" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={downloadCSV} className="btn-outline btn-sm">Export CSV</button>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ministry: '', category: 'General', allocated_amount: '', notes: '' }) }}
            className="btn-primary btn-sm"><Plus size={14} /> Add Budget</button>
        </div>
      </div>

      {/* Total Budget Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <div className="text-2xl font-montserrat font-bold text-navy">KES {totalBudget.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">Total Budget Allocated</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-montserrat font-bold text-teal">
            KES {vsActual.reduce((s, m) => s + (m.spent || 0), 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">Total Spent</div>
        </div>
        <div className="card p-4 text-center">
          <div className={`text-2xl font-montserrat font-bold ${totalBudget - vsActual.reduce((s, m) => s + (m.spent || 0), 0) < 0 ? 'text-red' : 'text-green-600'}`}>
            KES {(totalBudget - vsActual.reduce((s, m) => s + (m.spent || 0), 0)).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">Remaining Balance</div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card p-5 mb-5 border-l-4 border-orange">
          <h3 className="font-montserrat font-bold text-navy mb-4">{editingId ? 'Edit Budget Entry' : 'Add Budget Allocation'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="form-label">Ministry <span className="text-orange">*</span></label>
              <select className="form-select" value={form.ministry} onChange={e => setForm(p => ({ ...p, ministry: e.target.value }))}>
                <option value="">Select ministry...</option>
                {MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Allocated Amount (KES) <span className="text-orange">*</span></label>
              <input type="number" className="form-input" placeholder="0.00" min="0" step="0.01"
                value={form.allocated_amount} onChange={e => setForm(p => ({ ...p, allocated_amount: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Notes (Optional)</label>
              <input className="form-input" placeholder="e.g. For MULEWO event expenses"
                value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Save size={14} /> Save Budget</>}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-outline px-4"><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      {/* Budget vs Actual Table */}
      {vsActual.length > 0 && (
        <div className="card mb-5">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Budget vs Actual — {selectedYear}</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Ministry</th>
                  <th className="text-right px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Allocated</th>
                  <th className="text-right px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Spent</th>
                  <th className="text-right px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Remaining</th>
                  <th className="px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Utilization</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {vsActual.map((m, i) => (
                  <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 ${m.over_budget ? 'bg-red/5' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-navy text-sm">{m.ministry}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-navy">
                      {m.allocated > 0 ? `KES ${m.allocated.toLocaleString()}` : <span className="text-gray-300 text-xs">No budget</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-orange">KES {m.spent.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-bold ${m.remaining < 0 ? 'text-red' : 'text-green-600'}`}>
                      KES {m.remaining.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {m.utilization !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${m.over_budget ? 'bg-red' : m.utilization >= 80 ? 'bg-orange' : 'bg-teal'}`}
                              style={{ width: `${Math.min(m.utilization, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-bold w-10 text-right ${m.over_budget ? 'text-red' : m.utilization >= 80 ? 'text-orange' : 'text-teal'}`}>
                            {m.utilization}%
                          </span>
                          {m.over_budget && <AlertTriangle size={14} className="text-red flex-shrink-0" />}
                          {!m.over_budget && m.utilization < 80 && <CheckCircle size={14} className="text-teal flex-shrink-0" />}
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {m.allocated > 0 && (
                        <div className="flex gap-1">
                          {m.categories?.map(b => (
                            <button key={b.id} onClick={() => startEdit(b)}
                              className="p-1 text-gray-400 hover:text-navy rounded"><Edit2 size={12} /></button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Budget Entries List */}
      <div className="card">
        <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Budget Entries — {selectedYear}</h2></div>
        {budgets.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <TrendingUp size={32} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No budget entries for {selectedYear}.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-3 mx-auto">
              <Plus size={14} /> Add First Budget
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Ministry</th>
                  <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Category</th>
                  <th className="text-right px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Amount (KES)</th>
                  <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Notes</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {budgets.map(b => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-navy">{b.ministry}</td>
                    <td className="px-4 py-3"><span className="badge badge-gray text-xs">{b.category}</span></td>
                    <td className="px-4 py-3 text-right font-bold text-navy">KES {parseFloat(b.allocated_amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{b.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => startEdit(b)} className="p-1.5 text-gray-400 hover:text-navy rounded-lg hover:bg-gray-100"><Edit2 size={13} /></button>
                        <button onClick={() => deleteBudget(b.id)} className="p-1.5 text-gray-400 hover:text-red rounded-lg hover:bg-red/5"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={2} className="px-4 py-3 font-montserrat font-bold text-navy text-sm">TOTAL</td>
                  <td className="px-4 py-3 text-right font-montserrat font-bold text-navy">KES {totalBudget.toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}