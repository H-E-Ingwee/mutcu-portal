import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Save } from 'lucide-react'

export default function AdminCycleCreate() {
  const [form, setForm] = useState({ title:'', spiritual_year: `${new Date().getFullYear()}/${new Date().getFullYear()+1}`, cycle_type:'annual', prayer_start_date:'', nomination_open_date:'', nomination_close_date:'', nc_formation_deadline:'', vetting_deadline:'', publication_date:'', objection_deadline:'', agm_date:'' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    try {
      await api.post('/admin/cycles', form)
      toast.success('Nomination cycle created!')
      navigate('/admin/cycles')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create cycle') }
    finally { setLoading(false) }
  }

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header"><div><Link to="/admin/cycles" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2"><ArrowLeft size={12} />Back</Link><h1 className="page-title">Create Nomination Cycle</h1></div></div>
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="form-label">Cycle Title *</label><input type="text" className="form-input" placeholder="e.g. MUTCU Leadership Nominations 2026" value={form.title} onChange={e => set('title', e.target.value)} required /></div>
            <div><label className="form-label">Spiritual Year *</label><input type="text" className="form-input" placeholder="2026/2027" value={form.spiritual_year} onChange={e => set('spiritual_year', e.target.value)} required /></div>
            <div><label className="form-label">Cycle Type *</label><select className="form-select" value={form.cycle_type} onChange={e => set('cycle_type', e.target.value)}><option value="annual">Annual Nomination</option><option value="by_nomination">By-Nomination (Vacancy)</option></select></div>
            <div><label className="form-label">Prayer Period Start</label><input type="date" className="form-input" value={form.prayer_start_date} onChange={e => set('prayer_start_date', e.target.value)} /></div>
            <div><label className="form-label">Nominations Open *</label><input type="date" className="form-input" value={form.nomination_open_date} onChange={e => set('nomination_open_date', e.target.value)} required /></div>
            <div><label className="form-label">Nominations Close *</label><input type="date" className="form-input" value={form.nomination_close_date} onChange={e => set('nomination_close_date', e.target.value)} required /></div>
            <div><label className="form-label">NC Formation Deadline</label><input type="date" className="form-input" value={form.nc_formation_deadline} onChange={e => set('nc_formation_deadline', e.target.value)} /></div>
            <div><label className="form-label">Vetting Deadline</label><input type="date" className="form-input" value={form.vetting_deadline} onChange={e => set('vetting_deadline', e.target.value)} /></div>
            <div><label className="form-label">Publication Date</label><input type="date" className="form-input" value={form.publication_date} onChange={e => set('publication_date', e.target.value)} /></div>
            <div><label className="form-label">Objection Deadline</label><input type="date" className="form-input" value={form.objection_deadline} onChange={e => set('objection_deadline', e.target.value)} /></div>
            <div className="col-span-2"><label className="form-label">AGM Date</label><input type="date" className="form-input" value={form.agm_date} onChange={e => set('agm_date', e.target.value)} /></div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary"><Save size={15} />{loading ? 'Creating...' : 'Create Cycle'}</button>
        </form>
      </div>
    </div>
  )
}
