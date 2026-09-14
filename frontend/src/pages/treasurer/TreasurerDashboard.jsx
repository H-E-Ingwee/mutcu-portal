import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { DollarSign, Clock, CheckCircle, FileText, TrendingUp, AlertCircle, TrendingDown, BarChart3, BookOpen, User, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react'

export default function TreasurerDashboard() {
  const [summary, setSummary] = useState(null)
  const [pending, setPending] = useState([])
  const [balance, setBalance] = useState(null)
  const [vsActual, setVsActual] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentYear] = useState(`${new Date().getFullYear()}/${new Date().getFullYear() + 1}`)

  useEffect(() => {
    Promise.all([
      api.get('/requisitions/stats/summary'),
      api.get('/requisitions?status=endorsed&limit=5'),
      api.get(`/treasury/balance?spiritual_year=${currentYear}`),
      api.get(`/treasury/budgets/vs-actual?spiritual_year=${currentYear}`),
    ]).then(([sumRes, pendRes, balRes, vaRes]) => {
      setSummary(sumRes.data.summary)
      setPending(pendRes.data.requisitions || [])
      setBalance(balRes.data)
      setVsActual((vaRes.data.vs_actual || []).filter(m => m.over_budget || m.utilization >= 80).slice(0, 4))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  const overBudget = vsActual.filter(m => m.over_budget)

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Treasurer Dashboard</h1>
          <p className="page-subtitle">Financial overview — {currentYear}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/treasurer/profile" className="btn-outline btn-sm"><User size={14} /> My Profile</Link>
          <Link to="/treasurer/reports" className="btn-primary btn-sm"><BarChart3 size={14} /> Reports</Link>
        </div>
      </div>

      {/* Fund Balance Hero */}
      {balance && (
        <div className="bg-gradient-to-r from-navy to-[#0a0060] rounded-2xl p-6 mb-6 shadow-lg">
          <div className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Current Fund Balance — {currentYear}</div>
          <div className={`text-4xl font-montserrat font-bold mb-4 ${parseFloat(balance.balance) >= 0 ? 'text-orange' : 'text-red'}`}>
            KES {parseFloat(balance.balance || 0).toLocaleString()}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpRight size={14} className="text-teal" />
                <span className="text-white/60 text-xs font-semibold">Total Income</span>
              </div>
              <div className="text-teal font-montserrat font-bold text-lg">KES {parseFloat(balance.total_income || 0).toLocaleString()}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownRight size={14} className="text-orange" />
                <span className="text-white/60 text-xs font-semibold">Total Disbursed</span>
              </div>
              <div className="text-orange font-montserrat font-bold text-lg">KES {parseFloat(balance.total_expenses || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Over-budget Alerts */}
      {overBudget.length > 0 && (
        <div className="card p-4 mb-5 border-l-4 border-red bg-red/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red" />
            <span className="font-montserrat font-bold text-red text-sm">{overBudget.length} Ministry Over Budget</span>
          </div>
          <div className="space-y-1">
            {overBudget.map(m => (
              <div key={m.ministry} className="flex items-center justify-between text-sm">
                <span className="text-navy font-semibold">{m.ministry}</span>
                <span className="text-red font-bold">KES {Math.abs(m.remaining).toLocaleString()} over</span>
              </div>
            ))}
          </div>
          <Link to="/treasurer/budget" className="text-xs text-red font-semibold mt-2 inline-block hover:underline">View Budget Manager →</Link>
        </div>
      )}

      {/* Requisition Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Requisitions', value: summary?.total_submitted || 0, icon: FileText, color: 'text-navy', bg: 'bg-navy/10' },
          { label: 'Total Requested', value: `KES ${(summary?.total_requested || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-orange', bg: 'bg-orange/10' },
          { label: 'Total Approved', value: `KES ${(summary?.total_approved || 0).toLocaleString()}`, icon: CheckCircle, color: 'text-teal', bg: 'bg-teal/10' },
          { label: 'Total Disbursed', value: `KES ${(summary?.total_disbursed || 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
        ].map((s, i) => (
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

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { to: '/treasurer/requisitions', icon: FileText, label: 'Requisitions', color: 'bg-orange/10 text-orange', desc: 'Review & disburse' },
          { to: '/treasurer/income', icon: TrendingUp, label: 'Income Ledger', color: 'bg-teal/10 text-teal', desc: 'Record income' },
          { to: '/treasurer/budget', icon: BarChart3, label: 'Budget Manager', color: 'bg-navy/10 text-navy', desc: 'Set allocations' },
          { to: '/treasurer/ledger', icon: BookOpen, label: 'General Ledger', color: 'bg-purple-100 text-purple-600', desc: 'Full transactions' },
        ].map((item, i) => (
          <Link key={i} to={item.to} className="card p-4 hover:shadow-md transition-all hover:border-orange/20 border border-transparent">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${item.color}`}>
              <item.icon size={18} />
            </div>
            <div className="font-montserrat font-bold text-navy text-sm">{item.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requisition Status Breakdown */}
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
              const count = summary?.by_status?.[status] || 0
              const total = summary?.total_submitted || 1
              const pct = Math.round(count / total * 100)
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-gray-500 flex-shrink-0">{cfg.label}</div>
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

        {/* Pending Review */}
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

        {/* Budget Utilization Alerts */}
        {vsActual.length > 0 && (
          <div className="card lg:col-span-2">
            <div className="card-header">
              <h2 className="font-montserrat font-bold text-navy text-sm">Budget Utilization Alerts</h2>
              <Link to="/treasurer/budget" className="btn-outline btn-sm text-xs">Full Budget</Link>
            </div>
            <div className="card-body space-y-3">
              {vsActual.map(m => (
                <div key={m.ministry} className="flex items-center gap-3">
                  <div className="w-40 text-sm font-semibold text-navy truncate flex-shrink-0">{m.ministry.replace(' Ministry', '')}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${m.over_budget ? 'bg-red' : m.utilization >= 90 ? 'bg-orange' : 'bg-yellow-400'}`}
                      style={{ width: `${Math.min(m.utilization || 0, 100)}%` }} />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold w-10 text-right ${m.over_budget ? 'text-red' : 'text-orange'}`}>{m.utilization}%</span>
                    {m.over_budget && <AlertTriangle size={13} className="text-red" />}
                  </div>
                  <div className={`text-xs font-semibold w-28 text-right flex-shrink-0 ${m.over_budget ? 'text-red' : 'text-orange'}`}>
                    {m.over_budget ? `KES ${Math.abs(m.remaining).toLocaleString()} over` : `KES ${m.remaining.toLocaleString()} left`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ministry Spending */}
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