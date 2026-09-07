import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { DollarSign, Clock, CheckCircle, XCircle, FileText, TrendingUp, AlertCircle } from 'lucide-react'

export default function TreasurerDashboard() {
  const [summary, setSummary] = useState(null)
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/requisitions/stats/summary'),
      api.get('/requisitions?status=endorsed&limit=5'),
    ]).then(([sumRes, pendRes]) => {
      setSummary(sumRes.data.summary)
      setPending(pendRes.data.requisitions || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  const stats = [
    { label: 'Total Submitted', value: summary?.total_submitted || 0, icon: FileText, color: 'text-navy', bg: 'bg-navy/10' },
    { label: 'Total Requested', value: `KES ${(summary?.total_requested || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-orange', bg: 'bg-orange/10' },
    { label: 'Total Approved', value: `KES ${(summary?.total_approved || 0).toLocaleString()}`, icon: CheckCircle, color: 'text-teal', bg: 'bg-teal/10' },
    { label: 'Total Disbursed', value: `KES ${(summary?.total_disbursed || 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
  ]

  const statusBreakdown = summary?.by_status || {}

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Treasurer Dashboard</h1>
          <p className="page-subtitle">Financial overview and requisition management</p>
        </div>
        <Link to="/treasurer/requisitions" className="btn-primary btn-sm">
          <FileText size={14} />All Requisitions
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div>
                <div className={`text-lg font-montserrat font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-400 font-semibold">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <div className="card">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Requisitions by Status</h2></div>
          <div className="card-body space-y-2">
            {Object.entries({
              pending: { label: 'Pending', color: 'bg-gray-200', text: 'text-gray-600' },
              endorsed: { label: 'Endorsed (Awaiting Review)', color: 'bg-orange', text: 'text-white' },
              under_review: { label: 'Under Review', color: 'bg-orange/60', text: 'text-white' },
              approved: { label: 'Approved', color: 'bg-teal', text: 'text-white' },
              partially_approved: { label: 'Partially Approved', color: 'bg-yellow-400', text: 'text-white' },
              rejected: { label: 'Rejected', color: 'bg-red', text: 'text-white' },
              disbursed: { label: 'Disbursed', color: 'bg-green-500', text: 'text-white' },
            }).map(([status, cfg]) => {
              const count = statusBreakdown[status] || 0
              const total = summary?.total_submitted || 1
              const pct = Math.round(count / total * 100)
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-gray-500 flex-shrink-0">{cfg.label}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className={`h-full ${cfg.color} rounded-full flex items-center justify-end pr-2 transition-all`} style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}>
                      {count > 0 && <span className={`text-xs font-bold ${cfg.text}`}>{count}</span>}
                    </div>
                  </div>
                  <div className="w-8 text-xs text-gray-400 text-right">{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pending review */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-montserrat font-bold text-navy text-sm">
              <AlertCircle size={14} className="inline mr-1 text-orange" />
              Awaiting Your Review
            </h2>
            <Link to="/treasurer/requisitions?status=endorsed" className="btn-outline btn-sm text-xs">View All</Link>
          </div>
          <div>
            {pending.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <CheckCircle size={24} className="mx-auto mb-2 text-teal" />
                All caught up! No requisitions awaiting review.
              </div>
            ) : pending.map(r => (
              <Link key={r.id} to="/treasurer/requisitions" className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-all">
                <div className="w-8 h-8 bg-orange/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={14} className="text-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy text-sm truncate">{r.title}</div>
                  <div className="text-xs text-gray-400">{r.requisition_number} · {r.ministry || 'General'}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-orange text-sm">KES {parseFloat(r.total_requested).toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Endorsed</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Ministry breakdown */}
        {summary?.by_ministry && Object.keys(summary.by_ministry).length > 0 && (
          <div className="card lg:col-span-2">
            <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Spending by Ministry</h2></div>
            <div className="card-body">
              <div className="space-y-2">
                {Object.entries(summary.by_ministry).sort((a, b) => b[1] - a[1]).map(([ministry, amount]) => {
                  const maxAmount = Math.max(...Object.values(summary.by_ministry))
                  const pct = Math.round(amount / maxAmount * 100)
                  return (
                    <div key={ministry} className="flex items-center gap-3">
                      <div className="w-40 text-xs text-gray-600 truncate flex-shrink-0">{ministry}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-navy to-orange rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-28 text-xs font-semibold text-navy text-right">KES {amount.toLocaleString()}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}