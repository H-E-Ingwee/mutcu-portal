import { useEffect, useState, useRef } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, Save, X, TrendingUp, AlertTriangle, CheckCircle, Upload, Download, FileSpreadsheet, Eye, RefreshCw } from 'lucide-react'
import AIBudgetAdvisor from '../../components/treasury/AIBudgetAdvisor'

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
  const [activeYear, setActiveYear] = useState(null)
  const [selectedYear, setSelectedYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('view') // 'view' | 'manual' | 'upload'
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ministry: '', category: 'General', allocated_amount: '', notes: '' })

  // Upload state
  const fileRef = useRef(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState(null) // { rows, warnings, totalAmount, ... }
  const [previewRows, setPreviewRows] = useState([]) // editable preview
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [importing, setImporting] = useState(false)

  // Load years from financial_years table
  useEffect(() => {
    api.get('/treasury/years').then(r => {
      const yrs = r.data.years || []
      setYears(yrs)
      const active = yrs.find(y => y.is_active)
      if (active) { setActiveYear(active); setSelectedYear(active.label) }
      else if (yrs.length > 0) setSelectedYear(yrs[0].label)
    }).catch(() => {
      // Fallback to spiritual-years endpoint
      api.get('/treasury/spiritual-years').then(r => {
        const labels = r.data.labels || []
        setYears(labels.map(l => ({ label: l, is_active: false, is_closed: false })))
        if (labels.length > 0) setSelectedYear(labels[0])
      }).catch(() => {})
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

  const reloadBudgets = async () => {
    const [bRes, vaRes] = await Promise.all([
      api.get(`/treasury/budgets?spiritual_year=${selectedYear}`),
      api.get(`/treasury/budgets/vs-actual?spiritual_year=${selectedYear}`),
    ])
    setBudgets(bRes.data.budgets || [])
    setVsActual(vaRes.data.vs_actual || [])
  }

  // ── Manual entry ──────────────────────────────────────────────
  const saveManual = async () => {
    if (!form.ministry || !form.allocated_amount) return toast.error('Ministry and amount are required')
    setSaving(true)
    try {
      await api.post('/treasury/budgets', { ...form, spiritual_year: selectedYear })
      toast.success('Budget saved!')
      setShowForm(false); setEditingId(null)
      setForm({ ministry: '', category: 'General', allocated_amount: '', notes: '' })
      await reloadBudgets()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  const deleteBudget = async (id) => {
    if (!window.confirm('Delete this budget entry?')) return
    try {
      await api.delete(`/treasury/budgets/${id}`)
      setBudgets(prev => prev.filter(b => b.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  const startEdit = (b) => {
    setForm({ ministry: b.ministry, category: b.category, allocated_amount: b.allocated_amount, notes: b.notes || '' })
    setEditingId(b.id); setShowForm(true); setTab('manual')
  }

  // ── Excel Upload ──────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Only Excel files (.xlsx or .xls) are accepted')
      return
    }
    setUploadFile(file)
    setParseResult(null)
    setPreviewRows([])
  }

  const parseFile = async () => {
    if (!uploadFile) return toast.error('Please select an Excel file first')
    setParsing(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      const res = await api.post('/treasury/budgets/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setParseResult(res.data)
      setPreviewRows(res.data.rows.map((r, i) => ({ ...r, _idx: i, _valid: true })))
      toast.success(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to parse file')
    } finally { setParsing(false) }
  }

  const updatePreviewRow = (idx, field, value) => {
    setPreviewRows(prev => prev.map(r => r._idx === idx ? { ...r, [field]: value } : r))
  }

  const removePreviewRow = (idx) => {
    setPreviewRows(prev => prev.filter(r => r._idx !== idx))
  }

  const confirmImport = async () => {
    const validRows = previewRows.filter(r => r._valid !== false && r.ministry && r.allocated_amount > 0)
    if (validRows.length === 0) return toast.error('No valid rows to import')
    if (!selectedYear) return toast.error('Please select a financial year')

    const selectedYearData = years.find(y => y.label === selectedYear)
    if (selectedYearData?.is_closed) return toast.error('Cannot import into a closed financial year')

    setImporting(true)
    try {
      const res = await api.post('/treasury/budgets/bulk-import', {
        rows: validRows,
        spiritual_year: selectedYear,
        replace_existing: replaceExisting,
      })
      toast.success(res.data.message)
      setParseResult(null); setPreviewRows([]); setUploadFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setTab('view')
      await reloadBudgets()
    } catch (err) { toast.error(err.response?.data?.error || 'Import failed') }
    finally { setImporting(false) }
  }

  const downloadTemplate = () => {
    const token = localStorage.getItem('mutcu_token')
    const a = document.createElement('a')
    a.href = `/api/treasury/budgets/template`
    // Fetch with auth header
    fetch('/api/treasury/budgets/template', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'mutcu-budget-template.xlsx'; a.click()
        URL.revokeObjectURL(url)
      }).catch(() => toast.error('Download failed'))
  }

  const downloadCSV = async () => {
    try {
      const token = localStorage.getItem('mutcu_token')
      const res = await fetch(`/api/treasury/reports/budget-utilization?spiritual_year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `budget-${selectedYear}.csv`; a.click()
    } catch { toast.error('Export failed') }
  }

  const selectedYearData = years.find(y => y.label === selectedYear)
  const isClosedYear = selectedYearData?.is_closed

  if (loading && !selectedYear) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

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
            {years.map(y => (
              <option key={y.label || y} value={y.label || y}>
                {y.label || y}{y.is_active ? ' (Active)' : ''}{y.is_closed ? ' (Closed)' : ''}
              </option>
            ))}
          </select>
          <button onClick={downloadCSV} className="btn-outline btn-sm">Export CSV</button>
        </div>
      </div>

      {/* Closed year warning */}
      {isClosedYear && (
        <div className="card p-3 mb-4 bg-gray-50 border border-gray-200 flex items-center gap-2 text-sm text-gray-500">
          <AlertTriangle size={14} className="text-orange flex-shrink-0" />
          This financial year is <strong>closed</strong>. Budget data is read-only.
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
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

      {/* Tabs */}
      {!isClosedYear && (
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
          {[
            { id: 'view', label: 'Budget Overview', icon: Eye },
            { id: 'manual', label: 'Add Manually', icon: Plus },
            { id: 'upload', label: 'Import from Excel', icon: Upload },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'}`}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── TAB: Manual Entry ── */}
      {tab === 'manual' && !isClosedYear && (
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
            <button onClick={saveManual} disabled={saving} className="btn-primary">
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Save size={14} /> Save Budget</>}
            </button>
            <button onClick={() => { setTab('view'); setEditingId(null) }} className="btn-outline px-4"><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      {/* ── TAB: Excel Upload ── */}
      {tab === 'upload' && !isClosedYear && (
        <div className="space-y-4 mb-5">
          {/* Step 1: Download template */}
          <div className="card p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">1</div>
              <div className="flex-1">
                <h3 className="font-montserrat font-bold text-navy mb-1">Download the Budget Template</h3>
                <p className="text-gray-400 text-sm mb-3">Use our pre-formatted Excel template with all MUTCU ministries pre-filled. Fill in the amounts and upload.</p>
                <button onClick={downloadTemplate} className="btn-outline btn-sm">
                  <Download size={14} /> Download Template (.xlsx)
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Upload file */}
          <div className="card p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">2</div>
              <div className="flex-1">
                <h3 className="font-montserrat font-bold text-navy mb-1">Upload Your Budget Excel File</h3>
                <p className="text-gray-400 text-sm mb-3">Upload a .xlsx or .xls file. The system will auto-detect Ministry, Category, Amount, and Notes columns.</p>

                {/* Drop zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${uploadFile ? 'border-teal bg-teal/5' : 'border-gray-200 hover:border-orange/50 hover:bg-orange/5'}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const evt = { target: { files: [f] } }; handleFileSelect(evt) } }}
                >
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileSpreadsheet size={24} className="text-teal" />
                      <div className="text-left">
                        <div className="font-semibold text-navy text-sm">{uploadFile.name}</div>
                        <div className="text-xs text-gray-400">{(uploadFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setUploadFile(null); setParseResult(null); setPreviewRows([]); if (fileRef.current) fileRef.current.value = '' }}
                        className="ml-2 text-gray-400 hover:text-red"><X size={16} /></button>
                    </div>
                  ) : (
                    <>
                      <Upload size={28} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Click to browse or drag & drop your Excel file here</p>
                      <p className="text-xs text-gray-300 mt-1">Accepts .xlsx and .xls files only</p>
                    </>
                  )}
                </div>

                {uploadFile && !parseResult && (
                  <button onClick={parseFile} disabled={parsing} className="btn-primary mt-3">
                    {parsing ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Reading file...</> : <><Eye size={14} /> Preview Budget Data</>}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Preview & confirm */}
          {parseResult && previewRows.length > 0 && (
            <div className="card p-5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">3</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <h3 className="font-montserrat font-bold text-navy">Review & Confirm Import</h3>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {previewRows.length} rows · Total: KES {previewRows.reduce((s, r) => s + parseFloat(r.allocated_amount || 0), 0).toLocaleString()}
                        {' '}· Sheet: <em>{parseResult.sheetName}</em>
                      </p>
                    </div>
                    <button onClick={() => { setParseResult(null); setPreviewRows([]) }} className="btn-outline btn-sm">
                      <RefreshCw size={13} /> Re-upload
                    </button>
                  </div>

                  {/* Warnings */}
                  {parseResult.warnings?.length > 0 && (
                    <div className="bg-orange/5 border border-orange/20 rounded-xl p-3 mb-3">
                      <div className="flex items-center gap-2 text-orange text-xs font-semibold mb-1">
                        <AlertTriangle size={13} /> {parseResult.warnings.length} rows skipped
                      </div>
                      {parseResult.warnings.map((w, i) => <div key={i} className="text-xs text-orange/80">{w}</div>)}
                    </div>
                  )}

                  {/* Column mapping info */}
                  <div className="bg-navy/5 rounded-xl p-3 mb-3 text-xs text-gray-500">
                    <strong>Detected columns:</strong> Ministry → <em>{parseResult.columnMapping?.ministry}</em> · 
                    Category → <em>{parseResult.columnMapping?.category}</em> · 
                    Amount → <em>{parseResult.columnMapping?.amount}</em>
                  </div>

                  {/* Editable preview table */}
                  <div className="overflow-x-auto rounded-xl border border-gray-100 mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">Ministry</th>
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">Category</th>
                          <th className="text-right px-3 py-2 text-xs font-bold text-gray-400 uppercase">Amount (KES)</th>
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">Notes</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map(row => (
                          <tr key={row._idx} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <select className="form-select text-xs py-1" value={row.ministry}
                                onChange={e => updatePreviewRow(row._idx, 'ministry', e.target.value)}>
                                {MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}
                                {!MINISTRIES.includes(row.ministry) && <option value={row.ministry}>{row.ministry}</option>}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select className="form-select text-xs py-1" value={row.category}
                                onChange={e => updatePreviewRow(row._idx, 'category', e.target.value)}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" className="form-input text-xs py-1 text-right w-28"
                                value={row.allocated_amount}
                                onChange={e => updatePreviewRow(row._idx, 'allocated_amount', parseFloat(e.target.value) || 0)} />
                            </td>
                            <td className="px-3 py-2">
                              <input className="form-input text-xs py-1" value={row.notes || ''}
                                onChange={e => updatePreviewRow(row._idx, 'notes', e.target.value)}
                                placeholder="Optional notes" />
                            </td>
                            <td className="px-3 py-2">
                              <button onClick={() => removePreviewRow(row._idx)}
                                className="text-gray-300 hover:text-red transition-colors"><X size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 border-t-2 border-gray-200">
                          <td colSpan={2} className="px-3 py-2 font-bold text-navy text-sm">TOTAL</td>
                          <td className="px-3 py-2 text-right font-bold text-navy">
                            KES {previewRows.reduce((s, r) => s + parseFloat(r.allocated_amount || 0), 0).toLocaleString()}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Replace existing option */}
                  <label className="flex items-center gap-2 text-sm text-gray-600 mb-4 cursor-pointer">
                    <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)}
                      className="rounded border-gray-300" />
                    <span>Replace all existing budget entries for <strong>{selectedYear}</strong> (recommended for fresh import)</span>
                  </label>

                  <button onClick={confirmImport} disabled={importing || previewRows.length === 0}
                    className="btn-primary">
                    {importing
                      ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Importing...</>
                      : <><CheckCircle size={14} /> Import {previewRows.length} Budget Entries</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      
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
                  {!isClosedYear && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {vsActual.map((m, i) => (
                  <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 ${m.over_budget ? 'bg-red/5' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-navy text-sm">{m.ministry}</td>
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
                            <div className={`h-full rounded-full ${m.over_budget ? 'bg-red' : m.utilization >= 80 ? 'bg-orange' : 'bg-teal'}`}
                              style={{ width: `${Math.min(m.utilization, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-bold w-10 text-right ${m.over_budget ? 'text-red' : m.utilization >= 80 ? 'text-orange' : 'text-teal'}`}>
                            {m.utilization}%
                          </span>
                          {m.over_budget && <AlertTriangle size={13} className="text-red flex-shrink-0" />}
                          {!m.over_budget && m.utilization < 80 && <CheckCircle size={13} className="text-teal flex-shrink-0" />}
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    {!isClosedYear && (
                      <td className="px-4 py-3">
                        {m.categories?.map(b => (
                          <button key={b.id} onClick={() => startEdit(b)}
                            className="p-1 text-gray-400 hover:text-navy rounded"><Edit2 size={12} /></button>
                        ))}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Budget Entries List ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-montserrat font-bold text-navy text-sm">Budget Entries — {selectedYear}</h2>
          {!isClosedYear && (
            <button onClick={() => setTab('manual')} className="btn-outline btn-sm"><Plus size={13} /> Add Entry</button>
          )}
        </div>
        {budgets.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <TrendingUp size={32} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No budget entries for {selectedYear}.</p>
            {!isClosedYear && (
              <div className="flex gap-2 justify-center mt-3">
                <button onClick={() => setTab('manual')} className="btn-outline btn-sm"><Plus size={13} /> Add Manually</button>
                <button onClick={() => setTab('upload')} className="btn-primary btn-sm"><Upload size={13} /> Import Excel</button>
              </div>
            )}
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
                  {!isClosedYear && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {budgets.map(b => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-navy">{b.ministry}</td>
                    <td className="px-4 py-3"><span className="badge badge-gray text-xs">{b.category}</span></td>
                    <td className="px-4 py-3 text-right font-bold text-navy">KES {parseFloat(b.allocated_amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{b.notes || '—'}</td>
                    {!isClosedYear && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => startEdit(b)} className="p-1.5 text-gray-400 hover:text-navy rounded-lg hover:bg-gray-100"><Edit2 size={13} /></button>
                          <button onClick={() => deleteBudget(b.id)} className="p-1.5 text-gray-400 hover:text-red rounded-lg hover:bg-red/5"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={2} className="px-4 py-3 font-montserrat font-bold text-navy text-sm">TOTAL</td>
                  <td className="px-4 py-3 text-right font-montserrat font-bold text-navy">KES {totalBudget.toLocaleString()}</td>
                  <td colSpan={isClosedYear ? 1 : 2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}