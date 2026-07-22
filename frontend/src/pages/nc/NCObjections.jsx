import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'

export default function NCObjections() {
  const [objections, setObjections] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})

  useEffect(() => { api.get('/nc/objections').then(r => setObjections(r.data.objections||[])).finally(() => setLoading(false)) }, [])

  const resolve = async (id, nc_decision, nc_decision_reason) => {
    setSaving(prev => ({...prev, [id]: true}))
    try {
      await api.post(`/nc/objections/${id}/resolve`, { nc_decision, nc_decision_reason })
      toast.success('Objection resolved')
      setObjections(prev => prev.map(o => o.id === id ? {...o, nc_decision, nc_decision_reason} : o))
    } catch (err) { toast.error('Failed to resolve') }
    finally { setSaving(prev => ({...prev, [id]: false})) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header">
        <div><Link to="/nc" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2"><ArrowLeft size={12} />Back</Link><h1 className="page-title">Objections Inbox</h1></div>
      </div>
      {objections.length === 0 ? (
        <div className="card p-8 text-center"><div className="text-gray-400 text-sm">No objections submitted yet.</div></div>
      ) : objections.map(obj => (
        <div key={obj.id} className="card mb-4">
          <div className="card-header">
            <div>
              <h2 className="font-montserrat font-bold text-navy text-sm">Objection to {obj.nominee?.candidate?.name}</h2>
              <div className="text-xs text-gray-400">Position: {obj.nominee?.position?.title}</div>
            </div>
            {obj.nc_decision ? <span className={`badge ${obj.nc_decision==='upheld'?'badge-red':obj.nc_decision==='dismissed'?'badge-teal':'badge-orange'}`}>{obj.nc_decision.replace(/_/g,' ')}</span> : <span className="badge badge-gray">Pending</span>}
          </div>
          <div className="card-body">
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600">{obj.grounds}</div>
            <ObjectionResolveForm objId={obj.id} current={obj} onResolve={resolve} saving={saving[obj.id]} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ObjectionResolveForm({ objId, current, onResolve, saving }) {
  const [decision, setDecision] = useState(current.nc_decision || '')
  const [reason, setReason] = useState(current.nc_decision_reason || '')
  return (
    <div className="grid grid-cols-2 gap-3">
      <div><label className="form-label">Decision</label><select className="form-select" value={decision} onChange={e => setDecision(e.target.value)}><option value="">Select...</option><option value="upheld">Upheld — Remove nominee</option><option value="dismissed">Dismissed</option><option value="substitution_made">Substitution Made</option></select></div>
      <div><label className="form-label">Reason</label><input type="text" className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Brief reason" /></div>
      <button onClick={() => onResolve(objId, decision, reason)} disabled={saving || !decision} className="btn-primary btn-sm col-span-2 justify-center">{saving ? 'Saving...' : 'Save Decision'}</button>
    </div>
  )
}
