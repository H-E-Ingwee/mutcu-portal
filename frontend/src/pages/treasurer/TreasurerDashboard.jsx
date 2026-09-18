import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import {
  DollarSign, Clock, CheckCircle, FileText, TrendingUp, AlertCircle,
  TrendingDown, BarChart3, BookOpen, User, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Calendar, MessageSquare, Settings, ChevronRight
} from 'lucide-react'

// ─── Quick Link Card ──────────────────────────────────────────
function QuickLink({ to, icon: Icon, label, desc, color, badge }) {
  return (
    <Link to={to} className="card p-4 hover:shadow-md transition-all hover:border-orange/20 border border-transparent group">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-montserrat font-bold text-navy text-sm flex items-center gap-2">
            {label}
            {badge > 0 && (
              <span className="bg-orange text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
            )}
          </div>
          <div className="text-xs text-gray-400 truncate">{desc}</div>
        </div>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-orange transition-colors flex-shrink-0" />
      </div>
    </Link>
  )
}

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
          <Icon size={20} className={color} />
        </div>
        <div>
          <div className={`text-xl font-montserrat font-bold ${color}`}>{value}</div>
          <div className="text-xs text-gray-400 font-semibold">{label}</div>
          {sub && <div className="text-xs text-gray-300">{sub}</div>}
        </div>
      </div>
    </div>
  )
}

export default function TreasurerDashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [pending, setPending] = useState([])
  const [balance, setBalance] = useState(null)
  const [vsActual, setVsActual] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentYear] = useState(`${new Date().getFullYear()}/${new Date().getFullYear() + 1}`)

  const photoUrl = user?.photo_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'T')}&background=04003D&color=FF9700&size=200&bold=true`

  useEffect(() => {
    Promise.all([
      api.get('/requisitions/stats/summary').catch(() => ({ data: { summary: null } })),
      api.get('/requisitions?status=endorsed&limit=5').catch(() => ({ data: { requisitions: [] } })),
      api.get(`/treasury/balance?spiritual_year=${currentYear}`).catch(() => ({ data: null })),
      api.get(`/treasury/budgets/vs-actual?spiritual_year=${currentYear}`).catch(() => ({ data: { vs_actual: [] } })),
    ]).then(([sumRes, pendRes, balRes, vaRes]) => {
      setSummary(sumRes.data.summary)
      setPending(pendRes.data.requisitions || [])
      setBalance(balRes.data)
      setVsActual((vaRes.data.vs_actual || []).filter(m => m.over_budget || (m.utilization || 0) >= 80).slice(0, 4))
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
    </div>
  )

  const overBudget = vsActual.filter(m => m.over_budget)

  return (
    <div className="space-y-6">

      {/* ── SECTION 1: Personal Welcome ── */}
      <div className="bg-gradient-to-r from-navy to-[#0a0060] rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4 shadow-lg">
        <div>
          <div className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <h1 className="text-2xl font-montserrat font-bold text-white mb-0.5">
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-white/50 text-sm">CU Treasurer · {currentYear}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/treasurer/profile" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all">
            <User size={14} /> My Profile
          </Link>
          <img src={photoUrl} alt={user?.name} className="w-12 h-12 rounded-full object-cover border-2 border-orange/50" />
        </div>
      </div>

      {/* ── SECTION 2: Fund Balance ── */}
      <div>
        <h2 className="font-montserrat font-bold text-navy text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
          <DollarSign size={14} className="text-orange" /> Fund Balance — {currentYear}
        </h2>
        {balance ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5 border-l-4 border-teal">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal/10 rounded-xl flex items-center justify-center">
                  <ArrowUpRight size={20} className="text-teal" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Total Income</div>
                  <div className="text-xl font-montserrat font-bold text-teal">
                    KES {parseFloat(balance.total_income || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <div className="card p-5 border-l-4 border-orange">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange/10 rounded-xl flex items-center justify-center">
                  <ArrowDownRight size={20} className="text-orange" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Total Disbursed</div>
                  <div className="text-xl font-montserrat font-bold text-orange">
                    KES {parseFloat(balance.total_expenses || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <div className={`card p-5 border-l-4 ${parseFloat(balance.balance || 0) >= 0 ? 'border-green-500' : 'border-red'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${parseFloat(balance.balance || 0) >= 0 ? 'bg-green-100' : 'bg-red/10'}`}>
                  <DollarSign size={20} className={parseFloat(balance.balance || 0) >= 0 ? 'text-green-600' : 'text-red'} />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Current Balance</div>
                  <div className={`text-xl font-montserrat font-bold ${parseFloat(balance.balance || 0) >= 0 ? 'text-green-600' : 'text-red'}`}>
                    KES {parseFloat(balance.balance || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-4 text-center text-gray-400 text-sm">
            No balance data yet. Record income entries to see the fund balance.
          </div>
        )}
      </div>

      {/* ── SECTION 3: Requisition Stats ── */}
      {summary && (
        <div>
          <h2 className="font-montserrat font-bold text-navy text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
            <FileText size={14} className="text-orange" /> Requisitions Overview
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Submitted" value={summary.total_submitted || 0} icon={FileText} color="text-navy" bg="bg-navy/10" />
            <StatCard label="Total Requested" value={`KES ${(summary.total_requested || 0).toLocaleString()}`} icon={TrendingUp} color="text-orange" bg="bg-orange/10" />
            <StatCard label="Total Approved" value={`KES ${(summary.total_approved || 0).toLocaleString()}`} icon={CheckCircle} color="text-teal" bg="bg-teal/10" />
            <StatCard label="Total Disbursed" value={`KES ${(summary.total_disbursed || 0).toLocaleString()}`} icon={DollarSign} color="text-green-600" bg="bg-green-100" />
          </div>
        </div>
      )}

      {/* ── SECTION 4: Alerts ── */}
      {(overBudget.length > 0 || pending.length > 0) && (
        <div>
          <h2 className="font-montserrat font-bold text-navy text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red" /> Alerts
          </h2>
          <div className="space-y-3">
            {overBudget.length > 0 && (
              <div className="card p-4 border-l-4 border-red bg-red/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={15} className="text-red" />
                  <span className="font-montserrat font-bold text-red text-sm">{overBudget.length} {overBudget.length === 1 ? 'Ministry' : 'Ministries'} Over Budget</span>
                </div>
                <div className="space-y-1">
                  {overBudget.map(m => (
                    <div key={m.ministry} className="flex items-center justify-between text-sm">
                      <span className="text-navy font-semibold">{m.ministry}</span>
                      <span className="text-red font-bold">KES {Math.abs(m.remaining || 0).toLocaleString()} over</span>
                    </div>
                  ))}
                </div>
                <Link to="/treasurer/budget" className="text-xs text-red font-semibold mt-2 inline-block hover:underline">
                  View Budget Manager →
                </Link>
              </div>
            )}
            {pending.length > 0 && (
              <div className="card p-4 border-l-4 border-orange bg-orange/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={15} className="text-orange" />
                  <span className="font-montserrat font-bold text-orange text-sm">{pending.length} Requisition{pending.length > 1 ? 's' : ''} Awaiting Your Review</span>
                </div>
                <div className="space-y-1">
                  {pending.slice(0, 3).map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-navy font-semibold truncate flex-1 mr-2">{r.title}</span>
                      <span className="text-orange font-bold flex-shrink-0">KES {parseFloat(r.total_requested || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <Link to="/treasurer/requisitions" className="text-xs text-orange font-semibold mt-2 inline-block hover:underline">
                  Review Requisitions →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 5: Treasury Modules ── */}
      <div>
        <h2 className="font-montserrat font-bold text-navy text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
          <BarChart3 size={14} className="text-orange" /> Treasury Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickLink to="/treasurer/requisitions" icon={FileText} label="Requisitions" desc="Review, approve & disburse funds" color="bg-orange/10 text-orange" badge={pending.length} />
          <QuickLink to="/treasurer/income" icon={TrendingUp} label="Income Ledger" desc="Record offerings, fundraising & donations" color="bg-teal/10 text-teal" />
          <QuickLink to="/treasurer/budget" icon={BarChart3} label="Budget Manager" desc="Set & track ministry allocations" color="bg-navy/10 text-navy" />
          <QuickLink to="/treasurer/ledger" icon={BookOpen} label="General Ledger" desc="Full transaction history & running balance" color="bg-purple-100 text-purple-600" />
          <QuickLink to="/treasurer/reports" icon={FileText} label="Financial Reports" desc="Download & print official reports" color="bg-green-100 text-green-600" />
          <QuickLink to="/treasurer/years" icon={Calendar} label="Financial Years" desc="Manage & close financial years" color="bg-blue-100 text-blue-600" />
        </div>
      </div>

      {/* ── SECTION 6: Other Access ── */}
      <div>
        <h2 className="font-montserrat font-bold text-navy text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
          <Settings size={14} className="text-gray-400" /> Other Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickLink to="/analytics" icon={BarChart3} label="Analytics & Reports" desc="Member statistics and system reports" color="bg-gray-100 text-gray-600" />
          <QuickLink to="/admin/messages" icon={MessageSquare} label="Messages" desc="View and reply to member messages" color="bg-gray-100 text-gray-600" />
        </div>
      </div>

      {/* ── SECTION 7: Budget Utilization Alerts ── */}
      {vsActual.length > 0 && (
        <div>
          <h2 className="font-montserrat font-bold text-navy text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
            <TrendingDown size={14} className="text-orange" /> Budget Utilization Alerts
          </h2>
          <div className="card">
            <div className="card-body space-y-3">
              {vsActual.map(m => (
                <div key={m.ministry} className="flex items-center gap-3">
                  <div className="w-36 text-sm font-semibold text-navy truncate flex-shrink-0">
                    {m.ministry.replace(' Ministry', '')}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${m.over_budget ? 'bg-red' : (m.utilization || 0) >= 90 ? 'bg-orange' : 'bg-yellow-400'}`}
                      style={{ width: `${Math.min(m.utilization || 0, 100)}%` }} />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold w-10 text-right ${m.over_budget ? 'text-red' : 'text-orange'}`}>
                      {m.utilization || 0}%
                    </span>
                    {m.over_budget && <AlertTriangle size={13} className="text-red" />}
                  </div>
                  <div className={`text-xs font-semibold w-28 text-right flex-shrink-0 ${m.over_budget ? 'text-red' : 'text-orange'}`}>
                    {m.over_budget
                      ? `KES ${Math.abs(m.remaining || 0).toLocaleString()} over`
                      : `KES ${(m.remaining || 0).toLocaleString()} left`}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-3">
              <Link to="/treasurer/budget" className="text-xs text-orange font-semibold hover:underline">
                View Full Budget Manager →
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}