import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { AlertTriangle, ShieldCheck, Shield } from 'lucide-react'

/**
 * Lightweight anomaly badge — auto-runs on mount for endorsed/pending requisitions.
 * Shows a small colored badge next to the requisition.
 */
export default function AIAnomalyBadge({ requisitionId, status }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // Only run anomaly check for requisitions awaiting review
  const shouldCheck = ['pending', 'endorsed', 'under_review'].includes(status)

  useEffect(() => {
    if (!shouldCheck || !requisitionId) return
    setLoading(true)
    api.post('/ai/treasury/anomaly-check', { requisition_id: requisitionId })
      .then(res => setResult(res.data))
      .catch(() => {}) // Fail silently
      .finally(() => setLoading(false))
  }, [requisitionId])

  if (!shouldCheck || loading || !result) return null
  if (!result.has_anomalies) {
    return (
      <div className="flex items-center gap-1 text-xs text-teal" title="No anomalies detected">
        <ShieldCheck size={12} /> Clear
      </div>
    )
  }

  const config = {
    HIGH:   { color: 'text-red',    bg: 'bg-red/10',    icon: AlertTriangle, label: 'High Risk' },
    MEDIUM: { color: 'text-orange', bg: 'bg-orange/10', icon: Shield,        label: 'Review Needed' },
    LOW:    { color: 'text-orange', bg: 'bg-orange/5',  icon: Shield,        label: 'Minor Flag' },
  }
  const cfg = config[result.risk_level] || config.LOW

  return (
    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}
      title={result.flags?.join('; ') || 'Anomaly detected'}>
      <cfg.icon size={11} />
      {cfg.label}
    </div>
  )
}