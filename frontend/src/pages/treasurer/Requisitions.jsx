import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import {
  Plus, FileText, Search, Filter, X, Check, ChevronDown,
  Printer, Clock, CheckCircle, XCircle, Send, Eye, DollarSign
} from 'lucide-react'

const STATUS_CONFIG = {
  pending:           { label: 'Pending',            color: 'badge-gray',   icon: Clock },
  endorsed:          { label: 'Endorsed',           color: 'badge-navy',   icon: Check },
  under_review:      { label: 'Under Review',       color: 'badge-orange', icon: Clock },
  approved:          { label: 'Approved',           color: 'badge-teal',   icon: CheckCircle },
  partially_approved:{ label: 'Partially Approved', color: 'badge-orange', icon: CheckCircle },
  rejected:          { label: 'Rejected',           color: 'badge-red',    icon: XCircle },
  disbursed:         { label: 'Disbursed',          color: 'badge-green',  icon: DollarSign },
}

const ADMIN_ROLES = ['super_admin', 'ec_admin', 'cu_secretary']
const MINISTRY_ROLES = ['music_secretary','creative_arts_secretary','technical_media_secretary','hospitality_secretary','prayer_secretary','missions_secretary','bible_study_secretary','discipleship_secretary','welfare_secretary','ministry_secretary']

function PrintModal({ requisition, onClose }) {
  const printRef = useRef(null)
  const items = typeof requisition.items === 'string' ? JSON.parse(requisition.items) : (requisition.items || [])

  const handlePrint = () => {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>Requisition ${requisition.requisition_number}</title>
    <style>
      * { margin:0;padding:0;box-sizing:border-box; }
      body { font-family:Arial,sans-serif;color:#1a1a2e;background:#fff;padding:20px; }
      .header { background:linear-gradient(135deg,#04003D,#0a0060);color:white;padding:20px 28px;border-radius:8px;margin-bottom:20px; }
      .header h1 { font-size:18px;font-weight:800;color:#FF9700;margin-bottom:4px; }
      .header p { font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:1px; }
      .doc-title { text-align:center;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#04003D;margin-bottom:16px;border-bottom:2px solid #FF9700;padding-bottom:8px; }
      .meta-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px; }
      .meta-item label { font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9CA3AF;display:block;margin-bottom:2px; }
      .meta-item span { font-size:12px;font-weight:600;color:#04003D; }
      table { width:100%;border-collapse:collapse;margin-bottom:16px; }
      th { background:#04003D;color:#FF9700;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px; }
      td { padding:7px 10px;border-bottom:1px solid #F0F0F0;font-size:11px;color:#374151; }
      tr:nth-child(even) td { background:#FAFAFA; }
      .totals { display:flex;justify-content:flex-end;gap:24px;margin-bottom:20px; }
      .total-item { text-align:right; }
      .total-item label { font-size:9px;font-weight:700;text-transform:uppercase;color:#9CA3AF;display:block; }
      .total-item span { font-size:14px;font-weight:800;color:#04003D; }
      .total-item.approved span { color:#065F46; }
      .signatures { display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:24px; }
      .sig-box { border-top:2px solid #04003D;padding-top:8px; }
      .sig-box .sig-name { font-size:11px;font-weight:700;color:#04003D; }
      .sig-box .sig-role { font-size:9px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px; }
      .sig-box .sig-date { font-size:9px;color:#9CA3AF;margin-top:4px; }
      .status-badge { display:inline-block;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:700;text-transform:uppercase; }
      .footer { text-align:center;font-size:9px;color:#9CA3AF;margin-top:20px;border-top:1px solid #E5E7EB;padding-top:10px; }
      @media print { body { padding:0; } }
    </style></head><body>${content}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  const statusCfg = STATUS_CONFIG[requisition.status] || STATUS_CONFIG.pending

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-montserrat font-bold text-navy">Print Requisition</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-primary btn-sm"><Printer size={14} />Print</button>
            <button onClick={onClose} className="btn-outline btn-sm"><X size={14} /></button>
          </div>
        </div>

        {/* Printable content */}
        <div ref={printRef} className="p-6">
          <div className="header">
            <h1>MUTCU DMS</h1>
            <p>MURANG'A UNIVERSITY OF TECHNOLOGY CHRISTIAN UNION · Inspire Love, Hope & Godliness</p>
          </div>

          <div className="doc-title">Official Requisition Form</div>

          <div className="meta-grid">
            <div className="meta-item"><label>Requisition No.</label><span>{requisition.requisition_number}</span></div>
            <div className="meta-item"><label>Status</label><span className={`status-badge`} style={{background: requisition.status === 'approved' || requisition.status === 'disbursed' ? '#D1FAE5' : '#FEF3C7', color: requisition.status === 'approved' || requisition.status === 'disbursed' ? '#065F46' : '#92400E'}}>{statusCfg.label}</span></div>
            <div className="meta-item"><label>Ministry / Department</label><span>{requisition.ministry || 'General'}</span></div>
            <div className="meta-item"><label>Spiritual Year</label><span>{requisition.spiritual_year || '—'}</span></div>
            <div className="meta-item"><label>Submitted By</label><span>{requisition.requester?.name || '—'}</span></div>
            <div className="meta-item"><label>Date Submitted</label><span>{new Date(requisition.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
            <div className="meta-item" style={{gridColumn:'1/-1'}}><label>Purpose / Title</label><span>{requisition.title}</span></div>
            {requisition.purpose && <div className="meta-item" style={{gridColumn:'1/-1'}}><label>Purpose Details</label><span>{requisition.purpose}</span></div>}
          </div>

          <table>
            <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Cost (KES)</th><th>Total (KES)</th><th>Approved (KES)</th></tr></thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{parseFloat(item.unit_cost).toLocaleString()}</td>
                  <td>{parseFloat(item.total).toLocaleString()}</td>
                  <td>{item.approved_amount ? parseFloat(item.approved_amount).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="totals">
            <div className="total-item"><label>Total Requested</label><span>KES {parseFloat(requisition.total_requested).toLocaleString()}</span></div>
            {requisition.total_approved && <div className="total-item approved"><label>Total Approved</label><span>KES {parseFloat(requisition.total_approved).toLocaleString()}</span></div>}
          </div>

          {requisition.review_notes && <div style={{background:'#FEF3C7',border:'1px solid #F59E0B',borderRadius:'6px',padding:'10px 14px',marginBottom:'16px',fontSize:'11px'}}><strong>Treasurer's Notes:</strong> {requisition.review_notes}</div>}

          <div className="signatures">
            <div className="sig-box">
              <div style={{height:'40px'}}></div>
              <div className="sig-name">{requisition.requester?.name || '_______________'}</div>
              <div className="sig-role">Ministry Secretary / Requester</div>
              <div className="sig-date">Date: {new Date(requisition.created_at).toLocaleDateString('en-GB')}</div>
            </div>
            <div className="sig-box">
              <div style={{height:'40px'}}></div>
              <div className="sig-name">{requisition.endorser?.name || '_______________'}</div>
              <div className="sig-role">Ministry Chairperson (EC Member)</div>
              <div className="sig-date">Date: {requisition.endorsed_at ? new Date(requisition.endorsed_at).toLocaleDateString('en-GB') : '_______________'}</div>
            </div>
            <div className="sig-box">
              <div style={{height:'40px'}}></div>
              <div className="sig-name">{requisition.approver?.name || '_______________'}</div>
              <div className="sig-role">Chairperson of the Union</div>
              <div className="sig-date">Date: {requisition.approved_at ? new Date(requisition.approved_at).toLocaleDateString('en-GB') : '_______________'}</div>
            </div>
          </div>

          <div className="footer">MUTCU Digital Management System · portal.mutcu.org · Inspire Love, Hope & Godliness · © 2025 MUTCU</div>
        </div>
      </div>
    </div>
  )
}

export default function Requisitions() {
  const { user } = useAuth()
  const [requisitions, setRequisitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [showPrint, setShowPrint] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState([])

  // New requisition form
  const [newForm, setNewForm] = useState({
    title: '', ministry: user?.primary_ministry || '', purpose: '',
    spiritual_year: '', ministry_chairperson_id: '',
    items: [{ description: '', quantity: 1, unit_cost: 0, total: 0 }],
  })

  // Review form
  const [reviewForm, setReviewForm] = useState({ status: '', total_approved: '', review_notes: '' })
  const [showReview, setShowReview] = useState(false)

  const isAdmin = ADMIN_ROLES.includes(user?.role)
  const canSubmit = [...MINISTRY_ROLES, ...ADMIN_ROLES].includes(user?.role)

  useEffect(() => {
    fetchRequisitions()
    if (isAdmin) {
      api.get('/members?limit=200&status=active').then(r => setMembers(r.data.members || [])).catch(() => {})
    }
  }, [filterStatus])

  const fetchRequisitions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      const { data } = await api.get('/requisitions?' + params)
      setRequisitions(data.requisitions || [])
    } catch { toast.error('Failed to load requisitions') }
    finally { setLoading(false) }
  }

  const updateItem = (idx, field, value) => {
    const items = [...newForm.items]
    items[idx] = { ...items[idx], [field]: value }
    if (field === 'quantity' || field === 'unit_cost') {
      items[idx].total = parseFloat(items[idx].quantity || 0) * parseFloat(items[idx].unit_cost || 0)
    }
    setNewForm(f => ({ ...f, items }))
  }

  const addItem = () => setNewForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_cost: 0, total: 0 }] }))
  const removeItem = (idx) => setNewForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  const totalRequested = newForm.items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0)

  const submitRequisition = async () => {
    if (!newForm.title || newForm.items.some(i => !i.description)) {
      return toast.error('Title and all item descriptions are required')
    }
    setSaving(true)
    try {
      const { data } = await api.post('/requisitions', { ...newForm, items: newForm.items })
      toast.success(data.message)
      setRequisitions(prev => [data.requisition, ...prev])
      setShowNew(false)
      setNewForm({ title: '', ministry: user?.primary_ministry || '', purpose: '', spiritual_year: '', ministry_chairperson_id: '', items: [{ description: '', quantity: 1, unit_cost: 0, total: 0 }] })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const endorseRequisition = async (id) => {
    setSaving(true)
    try {
      const { data } = await api.put(`/requisitions/${id}/endorse`, { endorsement_note: '' })
      toast.success(data.message)
      fetchRequisitions()
      setSelected(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const submitReview = async () => {
    if (!reviewForm.status) return toast.error('Please select a status')
    setSaving(true)
    try {
      const { data } = await api.put(`/requisitions/${selected.id}/review`, reviewForm)
      toast.success(data.message)
      fetchRequisitions()
      setShowReview(false)
      setSelected(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const approveRequisition = async (id) => {
    setSaving(true)
    try {
      const { data } = await api.put(`/requisitions/${id}/approve`, {})
      toast.success(data.message)
      fetchRequisitions()
      setSelected(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const disburseRequisition = async (id) => {
    if (!window.confirm('Mark this requisition as disbursed?')) return
    setSaving(true)
    try {
      const { data } = await api.put(`/requisitions/${id}/disburse`, {})
      toast.success(data.message)
      fetchRequisitions()
      setSelected(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const filtered = requisitions.filter(r =>
    !search || r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.requisition_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.ministry?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {showPrint && <PrintModal requisition={showPrint} onClose={() => setShowPrint(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Requisitions</h1>
          <p className="page-subtitle">{isAdmin ? `${requisitions.length} total requisitions` : 'My requisitions'}</p>
        </div>
        {canSubmit && (
          <button onClick={() => setShowNew(true)} className="btn-primary btn-sm">
            <Plus size={14} />New Requisition
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* List */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="card p-3 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" className="form-input pl-9 text-sm" placeholder="Search requisitions..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </select>
          </div>

          <div className="card overflow-hidden flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <FileText size={32} className="mx-auto mb-2 text-gray-200" />
                No requisitions found.
              </div>
            ) : filtered.map(r => {
              const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending
              return (
                <div key={r.id} onClick={() => setSelected(r)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-all ${selected?.id === r.id ? 'bg-orange/5 border-l-2 border-l-orange' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-navy text-sm truncate">{r.title}</span>
                    </div>
                    <div className="text-xs text-gray-400">{r.requisition_number} · {r.ministry || 'General'}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge ${cfg.color} text-xs`}>{cfg.label}</span>
                      <span className="text-xs text-gray-500">KES {parseFloat(r.total_requested).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center">
                <FileText size={48} className="text-gray-200 mx-auto mb-3" />
                <div className="text-gray-400 text-sm">Select a requisition to view details</div>
              </div>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="card-header">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-montserrat font-bold text-navy text-sm">{selected.requisition_number}</span>
                    <span className={`badge ${STATUS_CONFIG[selected.status]?.color}`}>{STATUS_CONFIG[selected.status]?.label}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {selected.ministry || 'General'} · KES {parseFloat(selected.total_requested).toLocaleString()}
                    {selected.total_approved && ` · Approved: KES ${parseFloat(selected.total_approved).toLocaleString()}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowPrint(selected)} className="btn-outline btn-sm"><Printer size={14} />Print</button>
                </div>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                <div>
                  <div className="font-montserrat font-bold text-navy text-sm mb-1">{selected.title}</div>
                  {selected.purpose && <div className="text-xs text-gray-500">{selected.purpose}</div>}
                </div>

                {/* Items table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-400 font-semibold">Description</th>
                      <th className="text-right py-2 text-gray-400 font-semibold">Qty</th>
                      <th className="text-right py-2 text-gray-400 font-semibold">Unit (KES)</th>
                      <th className="text-right py-2 text-gray-400 font-semibold">Total (KES)</th>
                    </tr></thead>
                    <tbody>
                      {(typeof selected.items === 'string' ? JSON.parse(selected.items) : selected.items || []).map((item, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-2 text-navy">{item.description}</td>
                          <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                          <td className="py-2 text-right text-gray-600">{parseFloat(item.unit_cost).toLocaleString()}</td>
                          <td className="py-2 text-right font-semibold text-navy">{parseFloat(item.total).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-navy">
                        <td colSpan={3} className="py-2 font-bold text-navy text-right">Total Requested:</td>
                        <td className="py-2 font-bold text-orange text-right">KES {parseFloat(selected.total_requested).toLocaleString()}</td>
                      </tr>
                      {selected.total_approved && (
                        <tr>
                          <td colSpan={3} className="py-1 font-bold text-navy text-right">Total Approved:</td>
                          <td className="py-1 font-bold text-teal text-right">KES {parseFloat(selected.total_approved).toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Workflow status */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-montserrat font-bold text-gray-400 uppercase tracking-wide">Approval Workflow</div>
                  {[
                    { label: 'Submitted by', value: selected.requester?.name, date: selected.created_at, done: true },
                    { label: 'Endorsed by (Ministry Chairperson)', value: selected.endorser?.name, date: selected.endorsed_at, done: !!selected.endorsed_at },
                    { label: 'Reviewed by (CU Treasurer)', value: selected.reviewer?.name, date: selected.reviewed_at, done: !!selected.reviewed_at },
                    { label: 'Approved by (Chairperson of Union)', value: selected.approver?.name, date: selected.approved_at, done: !!selected.approved_at },
                    { label: 'Disbursed', value: selected.status === 'disbursed' ? 'Funds released' : null, date: selected.disbursed_at, done: !!selected.disbursed_at },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-teal' : 'bg-gray-200'}`}>
                        {step.done ? <Check size={10} className="text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-navy">{step.label}</div>
                        {step.value && <div className="text-xs text-gray-500">{step.value}{step.date ? ` · ${new Date(step.date).toLocaleDateString('en-GB')}` : ''}</div>}
                      </div>
                    </div>
                  ))}
                </div>

                {selected.review_notes && (
                  <div className="bg-orange/5 border border-orange/20 rounded-lg p-3 text-xs text-gray-700">
                    <strong className="text-orange">Treasurer's Notes:</strong> {selected.review_notes}
                  </div>
                )}

                {/* Action buttons based on role and status */}
                <div className="flex gap-2 flex-wrap">
                  {/* Endorse — EC members for pending requisitions */}
                  {selected.status === 'pending' && (isAdmin || MINISTRY_ROLES.includes(user?.role)) && (
                    <button onClick={() => endorseRequisition(selected.id)} disabled={saving} className="btn-primary btn-sm">
                      <Check size={14} />Endorse as Chairperson
                    </button>
                  )}

                  {/* Review — CU Treasurer */}
                  {['endorsed', 'pending'].includes(selected.status) && ['cu_secretary', 'ec_admin', 'super_admin'].includes(user?.role) && (
                    <button onClick={() => { setReviewForm({ status: '', total_approved: selected.total_requested, review_notes: '' }); setShowReview(true) }} className="btn-outline btn-sm">
                      <Eye size={14} />Review & Set Amount
                    </button>
                  )}

                  {/* Approve — Chairperson of Union (ec_admin) */}
                  {['under_review', 'endorsed'].includes(selected.status) && ['ec_admin', 'super_admin'].includes(user?.role) && (
                    <button onClick={() => approveRequisition(selected.id)} disabled={saving} className="btn-teal btn-sm">
                      <CheckCircle size={14} />Approve & Sign
                    </button>
                  )}

                  {/* Disburse — Treasurer */}
                  {selected.status === 'approved' && ['cu_secretary', 'ec_admin', 'super_admin'].includes(user?.role) && (
                    <button onClick={() => disburseRequisition(selected.id)} disabled={saving} className="btn-primary btn-sm">
                      <DollarSign size={14} />Mark Disbursed
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Requisition Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">New Requisition</h3>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="form-label">Requisition Title *</label>
                  <input type="text" className="form-input" placeholder="e.g. Music Ministry Equipment Purchase"
                    value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Ministry / Department</label>
                  <input type="text" className="form-input" placeholder="e.g. Music Ministry"
                    value={newForm.ministry} onChange={e => setNewForm(f => ({ ...f, ministry: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Spiritual Year</label>
                  <input type="text" className="form-input" placeholder="e.g. 2026/2027"
                    value={newForm.spiritual_year} onChange={e => setNewForm(f => ({ ...f, spiritual_year: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Purpose / Justification</label>
                  <textarea className="form-input" rows={2} placeholder="Explain why this requisition is needed..."
                    value={newForm.purpose} onChange={e => setNewForm(f => ({ ...f, purpose: e.target.value }))} />
                </div>
                {isAdmin && members.length > 0 && (
                  <div className="col-span-2">
                    <label className="form-label">Ministry Chairperson (EC Member to Endorse)</label>
                    <select className="form-select" value={newForm.ministry_chairperson_id} onChange={e => setNewForm(f => ({ ...f, ministry_chairperson_id: e.target.value }))}>
                      <option value="">Select EC member...</option>
                      {members.filter(m => ['ec_admin', 'super_admin', 'cu_secretary'].includes(m.role) || m.role?.includes('secretary')).map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.role?.replace(/_/g, ' ')})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label mb-0">Items *</label>
                  <button type="button" onClick={addItem} className="btn-outline btn-sm text-xs"><Plus size={12} />Add Item</button>
                </div>
                <div className="space-y-2">
                  {newForm.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input type="text" className="form-input col-span-5 text-sm" placeholder="Description"
                        value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                      <input type="number" className="form-input col-span-2 text-sm" placeholder="Qty" min="1"
                        value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                      <input type="number" className="form-input col-span-3 text-sm" placeholder="Unit Cost"
                        value={item.unit_cost} onChange={e => updateItem(idx, 'unit_cost', e.target.value)} />
                      <div className="col-span-1 text-xs text-gray-500 text-right">{parseFloat(item.total || 0).toLocaleString()}</div>
                      {newForm.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="col-span-1 text-red hover:text-red/70"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-right mt-2 font-montserrat font-bold text-navy text-sm">
                  Total: KES {totalRequested.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitRequisition} disabled={saving} className="btn-primary flex-1 justify-center">
                <Send size={15} />{saving ? 'Submitting...' : 'Submit Requisition'}
              </button>
              <button onClick={() => setShowNew(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReview && selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">Review Requisition</h3>
              <button onClick={() => setShowReview(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="font-semibold text-navy">{selected.title}</div>
              <div className="text-gray-500 text-xs">{selected.requisition_number} · Requested: KES {parseFloat(selected.total_requested).toLocaleString()}</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Decision *</label>
                <div className="space-y-2">
                  {[
                    { value: 'approved', label: 'Approve Full Amount' },
                    { value: 'partially_approved', label: 'Partially Approve' },
                    { value: 'under_review', label: 'Request More Information' },
                    { value: 'rejected', label: 'Reject' },
                  ].map(o => (
                    <label key={o.value} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${reviewForm.status === o.value ? 'border-orange bg-orange/5' : 'border-gray-200'}`}>
                      <input type="radio" name="status" value={o.value} className="accent-orange"
                        checked={reviewForm.status === o.value} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))} />
                      <span className="text-sm font-semibold text-navy">{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {['approved', 'partially_approved'].includes(reviewForm.status) && (
                <div>
                  <label className="form-label">Approved Amount (KES) *</label>
                  <input type="number" className="form-input" value={reviewForm.total_approved}
                    onChange={e => setReviewForm(f => ({ ...f, total_approved: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="form-label">Notes <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                <textarea className="form-input" rows={3} placeholder="Add notes for the requester..."
                  value={reviewForm.review_notes} onChange={e => setReviewForm(f => ({ ...f, review_notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitReview} disabled={saving} className="btn-primary flex-1 justify-center">
                <Check size={15} />{saving ? 'Saving...' : 'Submit Review'}
              </button>
              <button onClick={() => setShowReview(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}