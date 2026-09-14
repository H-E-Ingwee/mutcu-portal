import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, Save, X, TrendingUp, DollarSign } from 'lucide-react'

const CATEGORIES = ['Offering', 'Fundraising', 'Donation', 'Grant', 'RMC Collection', 'Event Proceeds', 'Other']

export default function IncomeLedger() {
  const [income, setIncome] = useState([])
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ source: '', category: 'Offering', amount: '', date: new Date().toISOString().split('T')[0], notes: '', received_by: '' })

  useEffect(() => {
    api.get('/treasury/spiritual-years').then(r => {
      const yrs = r.data.years || []
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

  const load = async (yr = selectedYear, pg = 1) => {
    if (!yr) return
    setLoading(true)
    try {
      const res = await api.get(`/treasury/income?spiritual_year=${yr}&page=${pg}&limit=20`)
      setIncome(res.data.income || [])
      setTotalCount(res.data.total || 0)
      setTotal((res.data.income || []).reduce((s, r) => s + parseFloat(r.amount || 0), 0))
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load(selectedYear, 1); setPage(1) }, [selectedYear])

  const save = async () => {
    if (!form.source || !form.amount || !form.date) return toast.error('Source, amount, and date are required')
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/treasury/income/${editingId}`, { ...form, spiritual_year: selectedYear })
        toast.success('Income entry updated')
      } else {
        await api.post('/treasury/income', { ...form, spiritual_year: selectedYear })
        toast.success('Income recorded!')
      }
      setShowForm(false); setEditingId(null)
      setForm({ source: '', category: 'Offering', amount: '', date: new Date().toISOString().split('T')[0], notes: '', received_by: '' })
      load(selectedYear, 1)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  const deleteEntry = async (id) => {
    if (!window.confirm('Delete this income entry?')) return
    try {
      await api.delete(`/treasury/income/${id}`)
      setIncome(prev => prev.filter(i => i.id !== id))
      toast.success('Entry deleted')
    } catch { toast.error('Failed to delete') }
  }

  const startEdit = (entry) => {
    setForm({ source: entry.source, category: entry.category, amount: entry.amount, date: entry.date, notes: entry.notes || '', received_by: entry.received_by || '' })
    setEditingId(entry.id)
    setShowForm(true)
  }

  const downloadCSV = async () => {
    try {
      const res = await fetch(`/api/treasury/reports/income-expenditure?spiritual_year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mutcu_token')}` }
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `income-${selectedYear}.csv`; a.click()
    } catch { toast.error('Export failed') }
  }

  const categoryColor = { Offering: 'badge-navy', Fundraising: 'badge-orange', Donation: 'badge-teal', Grant: 'badge-green', 'RMC Collection': 'badge-gray', 'Event Proceeds': 'badge-teal', Other: 'badge-gray' }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Income Ledger</h1>
          <p className="page-subtitle">Record and track all CU income and collections</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="form-select text-sm py-1.5" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={downloadCSV} className="btn-outline btn-sm">Export CSV</button>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ source: '', category: 'Offering', amount: '', date: new Date().toISOString().split('T')[0], notes: '', received_by: '' }) }}
            className="btn-primary btn-sm"><Plus size={14} /> Record Income</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {CATEGORIES.slice(0, 4).map(cat => {
          const catTotal = income.filter(i => i.category === cat).reduce((s, i) => s + parseFloat(i.amount || 0), 0)
          return (
            <div key={cat} className="card p-4 text-center">
              <div className="text-lg font-montserrat font-bold text-navy">KES {catTotal.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-0.5">{cat}</div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card p-5 mb-5 border-l-4 border-teal">
          <h3 className="font-montserrat font-bold text-navy mb-4">{editingId ? 'Edit Income Entry' : 'Record New Income'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="form-label">Source / Description <span className="text-orange">*</span></label>
              <input className="form-input" placeholder="e.g. Sunday Offering — 14 Sep 2026"
                value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Amount (KES) <span className="text-orange">*</span></label>
              <input type="number" className="form-input" placeholder="0.00" min="0" step="0.01"
                value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Date <span className="text-orange">*</span></label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Received / Counted By</label>
              <input className="form-input" placeholder="Name of person who received/counted"
                value={form.received_by} onChange={e => setForm(p => ({ ...p, received_by: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Notes</label>
              <input className="form-input" placeholder="Additional notes..."
                value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Save size={14} /> {editingId ? 'Update' : 'Record Income'}</>}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-outline px-4"><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      {/* Income Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-montserrat font-bold text-navy text-sm">Income Records — {selectedYear}</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{totalCount} entries</span>
            <span className="font-montserrat font-bold text-teal text-sm">Total: KES {income.reduce((s, i) => s + parseFloat(i.amount || 0), 0).toLocaleString()}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange" /></div>
        ) : income.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <DollarSign size={32} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No income recorded for {selectedYear}.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-3 mx-auto"><Plus size={14} /> Record First Income</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Ref</th>
                    <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Source</th>
                    <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Category</th>
                    <th className="text-right px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Amount (KES)</th>
                    <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Received By</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {income.map(entry => (
                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{entry.income_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-navy text-sm">{entry.source}</div>
                        {entry.notes && <div className="text-xs text-gray-400">{entry.notes}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${categoryColor[entry.category] || 'badge-gray'} text-xs`}>{entry.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-teal">KES {parseFloat(entry.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{entry.received_by || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => startEdit(entry)} className="p-1.5 text-gray-400 hover:text-navy rounded-lg hover:bg-gray-100"><Edit2 size={13} /></button>
                          <button onClick={() => deleteEntry(entry.id)} className="p-1.5 text-gray-400 hover:text-red rounded-lg hover:bg-red/5"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={4} className="px-4 py-3 font-montserrat font-bold text-navy text-sm">PAGE TOTAL</td>
                    <td className="px-4 py-3 text-right font-montserrat font-bold text-teal">
                      KES {income.reduce((s, i) => s + parseFloat(i.amount || 0), 0).toLocaleString()}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* Pagination */}
            {totalCount > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, totalCount)} of {totalCount}</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => { setPage(p => p - 1); load(selectedYear, page - 1) }} className="btn-outline btn-sm">← Prev</button>
                  <button disabled={page * 20 >= totalCount} onClick={() => { setPage(p => p + 1); load(selectedYear, page + 1) }} className="btn-outline btn-sm">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}