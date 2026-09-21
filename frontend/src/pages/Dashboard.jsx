import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import {
  FileText, Award, CreditCard, Users, Settings, BarChart3,
  Clock, CheckCircle, Megaphone, Send, History, CalendarDays,
  Church, Bell, BookOpen, ShieldAlert, DollarSign, TrendingUp,
  ArrowUpRight, ArrowDownRight, AlertTriangle, X
} from 'lucide-react'

// ─── Pending member skeleton ──────────────────────────────────
function PendingMemberSkeleton({ user }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-4">
        <div className="card p-6 border-l-4 border-orange">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock size={24} className="text-orange" />
            </div>
            <div className="flex-1">
              <h2 className="font-montserrat font-bold text-navy text-lg mb-1">
                Welcome, {user?.name?.split(' ')[0]}! 🙏
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                Your membership application has been received and is being reviewed by the CU Secretary.
                You will receive an email notification once your membership is approved.
              </p>
              <div className="bg-orange/5 border border-orange/20 rounded-lg p-3 text-xs text-orange">
                <strong>What happens next:</strong>
                <ol className="mt-1 space-y-1 list-decimal list-inside">
                  <li>Secretary reviews your application</li>
                  <li>You receive an approval email with your MUTCU number</li>
                  <li>Full access to all MUTCU DMS features is granted</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-montserrat font-bold text-navy text-sm mb-3">Available While Pending</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/contact" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-orange/30 hover:bg-orange/5 transition-all text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500"><Send size={18} /></div>
              <span className="text-xs font-montserrat font-bold text-navy">Contact Admin</span>
            </Link>
            <Link to="/profile/edit" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-orange/30 hover:bg-orange/5 transition-all text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500"><Users size={18} /></div>
              <span className="text-xs font-montserrat font-bold text-navy">My Profile</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Countdown Timer ──────────────────────────────────────────
function CountdownTimer({ targetDate, label }) {
  const [timeLeft, setTimeLeft] = useState({})
  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - new Date()
      if (diff <= 0) return setTimeLeft({ expired: true })
      setTimeLeft({ days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000) })
    }
    calc()
    const interval = setInterval(calc, 60000)
    return () => clearInterval(interval)
  }, [targetDate])
  if (timeLeft.expired) return <span className="text-red text-xs font-bold">Closed</span>
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">{label}:</span>
      <div className="flex gap-1">
        {timeLeft.days > 0 && <span className="bg-navy text-white text-xs font-bold px-1.5 py-0.5 rounded">{timeLeft.days}d</span>}
        <span className="bg-orange text-white text-xs font-bold px-1.5 py-0.5 rounded">{timeLeft.hours}h</span>
        <span className="bg-orange/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">{timeLeft.minutes}m</span>
      </div>
    </div>
  )
}

// ─── Treasurer Alert Banner ───────────────────────────────────
function TreasurerAlerts({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null
  return (
    <div className="space-y-2 mb-5">
      {alerts.map((alert, i) => (
        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
          alert.level === 'critical' ? 'bg-red/5 border-red/20' :
          alert.level === 'warning'  ? 'bg-orange/5 border-orange/20' :
          'bg-blue-50 border-blue-200'
        }`}>
          <AlertTriangle size={15} className={`flex-shrink-0 mt-0.5 ${
            alert.level === 'critical' ? 'text-red' :
            alert.level === 'warning'  ? 'text-orange' : 'text-blue-500'
          }`} />
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-bold mb-0.5 ${
              alert.level === 'critical' ? 'text-red' :
              alert.level === 'warning'  ? 'text-orange' : 'text-blue-600'
            }`}>{alert.title}</div>
            <div className="text-xs text-gray-600">{alert.message}</div>
          </div>
          {alert.link && (
            <Link to={alert.link} className="text-xs font-semibold text-orange hover:underline flex-shrink-0">
              View →
            </Link>
          )}
          <button onClick={() => onDismiss(i)} className="text-gray-300 hover:text-gray-500 flex-shrink-0 p-0.5">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────
export default function Dashboard() {
  const { user, isAdmin, isSecretary, isNC, canManageRequisitions, isTreasurer } = useAuth()
  const navigate = useNavigate()

  const [cycle, setCycle] = useState(null)
  const [stats, setStats] = useState({ total_members: 0, active_members: 0, pending_members: 0, ministry_count: 0 })
  const [currentEC, setCurrentEC] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [ministryContent, setMinistryContent] = useState([])
  const [loading, setLoading] = useState(true)

  // Treasury state
  const [treasuryBalance, setTreasuryBalance] = useState(null)
  const [treasuryPending, setTreasuryPending] = useState(0)
  const [treasuryAlerts, setTreasuryAlerts] = useState([])
  const [dismissedAlerts, setDismissedAlerts] = useState([])
  const [currentYear] = useState(`${new Date().getFullYear()}/${new Date().getFullYear() + 1}`)

  const photoUrl = user?.photo_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`

  const isPending = user?.enrollment_status === 'pending'

  // NC Chair redirect
  useEffect(() => {
    if (user?.role === 'nc_chair') navigate('/nc', { replace: true })
  }, [user])

  // Main data fetch
  useEffect(() => {
    const fetchData = async () => {
      // Nominations cycle
      try {
        const cycleRes = await api.get('/nominations/cycle')
        setCycle(cycleRes.data?.cycle || null)
      } catch {}

      // Announcements
      try {
        const annRes = await api.get('/announcements')
        setAnnouncements((annRes.data?.announcements || []).slice(0, 3))
      } catch {}

      // Ministry content
      if (user?.primary_ministry || user?.secondary_ministry) {
        try {
          const mcRes = await api.get('/ministry-content/my')
          setMinistryContent(mcRes.data?.content || [])
        } catch {}
      }

      // Admin stats
      if (isAdmin && isAdmin()) {
        try {
          const adminRes = await api.get('/admin/dashboard')
          if (adminRes.data?.stats) setStats(adminRes.data.stats)
          if (adminRes.data?.currentEC) setCurrentEC(adminRes.data.currentEC)
        } catch {}
      }

      // Treasury data + alerts
      if (isTreasurer && isTreasurer()) {
        const alerts = []
        try {
          const [balRes, pendRes, vaRes] = await Promise.all([
            api.get(`/treasury/balance?spiritual_year=${currentYear}`),
            api.get('/requisitions?status=endorsed&limit=1'),
            api.get(`/treasury/budgets/vs-actual?spiritual_year=${currentYear}`),
          ])
          const bal = balRes.data
          setTreasuryBalance(bal)
          const pendCount = pendRes.data.total || 0
          setTreasuryPending(pendCount)

          // Alert: pending requisitions
          if (pendCount > 0) {
            alerts.push({
              level: 'warning',
              title: `${pendCount} Requisition${pendCount > 1 ? 's' : ''} Awaiting Your Review`,
              message: `${pendCount} endorsed requisition${pendCount > 1 ? 's are' : ' is'} waiting for your review and approval.`,
              link: '/treasurer/requisitions',
            })
          }

          // Alert: low balance
          const balance = parseFloat(bal?.balance || 0)
          const totalIncome = parseFloat(bal?.total_income || 0)
          if (totalIncome > 0 && balance < totalIncome * 0.1) {
            alerts.push({
              level: 'critical',
              title: 'Low Fund Balance',
              message: `Current balance KES ${balance.toLocaleString()} is below 10% of total income. Review expenditure.`,
              link: '/treasurer/ledger',
            })
          }

          // Alert: over-budget ministries
          const vsActual = vaRes.data.vs_actual || []
          const overBudget = vsActual.filter(m => m.over_budget)
          const nearLimit = vsActual.filter(m => !m.over_budget && (m.utilization || 0) >= 80)

          overBudget.forEach(m => {
            alerts.push({
              level: 'critical',
              title: `${m.ministry} — Over Budget`,
              message: `Spent KES ${(m.spent || 0).toLocaleString()} against KES ${(m.allocated || 0).toLocaleString()} budget (${m.utilization}%).`,
              link: '/treasurer/budget',
            })
          })

          nearLimit.slice(0, 2).forEach(m => {
            alerts.push({
              level: 'warning',
              title: `${m.ministry} — ${m.utilization}% of Budget Used`,
              message: `Only KES ${(m.remaining || 0).toLocaleString()} remaining. Monitor spending closely.`,
              link: '/treasurer/budget',
            })
          })
        } catch {}
        setTreasuryAlerts(alerts)
      }

      setLoading(false)
    }

    if (!isPending) fetchData()
    else setLoading(false)
  }, [])

  const dismissAlert = (idx) => setDismissedAlerts(prev => [...prev, idx])
  const visibleAlerts = treasuryAlerts.filter((_, i) => !dismissedAlerts.includes(i))

  if (isPending) return <PendingMemberSkeleton user={user} />

  const cycleStatusLabel = { setup: 'Setup', prayer_period: 'Prayer Period', nominations_open: 'Nominations Open', vetting: 'NC Vetting', nominees_published: 'Nominees Published', objection_period: 'Objection Period', pre_agm: 'Pre-AGM', commissioned: 'Commissioned' }
  const cycleStatusColor = { nominations_open: 'badge-green', nominees_published: 'badge-teal', objection_period: 'badge-red', vetting: 'badge-orange', commissioned: 'badge-navy' }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  const userMinistries = [user?.primary_ministry, user?.secondary_ministry].filter(Boolean)
  const ministryMeetings = ministryContent.filter(c => c.content_type === 'meeting_schedule')
  const ministryAnnouncements = ministryContent.filter(c => c.content_type === 'announcement')

  return (
    <div>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy to-[#0a0060] rounded-2xl p-6 mb-6 flex items-center justify-between flex-wrap gap-4 shadow-lg">
        <div>
          <div className="text-white/40 text-xs font-montserrat font-semibold uppercase tracking-wider mb-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <h1 className="text-2xl font-montserrat font-bold text-white mb-1">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-white/50 text-sm">
            {(user?.role || '').replace(/_/g, ' ')} · {user?.primary_ministry || 'General Member'}
            {user?.secondary_ministry && ` · ${user.secondary_ministry}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Treasurer notification bell */}
          {isTreasurer && isTreasurer() && visibleAlerts.length > 0 && (
            <div className="relative">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Bell size={18} className="text-white" />
              </div>
              <span className="absolute -top-1 -right-1 bg-red text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {visibleAlerts.length}
              </span>
            </div>
          )}
          {cycle && (
            <div className="text-right hidden sm:block">
              <div className="text-white/40 text-xs font-montserrat font-semibold uppercase tracking-wider">Active Cycle</div>
              <div className="text-orange font-montserrat font-bold text-sm">{cycle.spiritual_year}</div>
            </div>
          )}
          <img src={photoUrl} alt={user?.name} className="w-14 h-14 rounded-full object-cover border-2 border-orange/50" />
        </div>
      </div>

      {/* Treasurer Alerts */}
      {isTreasurer && isTreasurer() && (
        <TreasurerAlerts alerts={visibleAlerts} onDismiss={dismissAlert} />
      )}

      {/* Active Cycle Banner — hidden for associates */}
      {cycle && user?.role !== 'associate_member' && (
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-montserrat font-bold text-navy text-sm mb-0.5">{cycle.title}</div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`badge ${cycleStatusColor[cycle.status] || 'badge-gray'}`}>{cycleStatusLabel[cycle.status] || cycle.status}</span>
                {cycle.status === 'nominations_open' && cycle.nomination_close_date && (
                  <CountdownTimer targetDate={cycle.nomination_close_date} label="Closes" />
                )}
                {cycle.status === 'objection_period' && cycle.objection_deadline && (
                  <CountdownTimer targetDate={cycle.objection_deadline} label="Objections close" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cycle.status === 'nominations_open' && !['nc_member', 'nc_chair', 'nc_secretary', 'ec_admin', 'super_admin', 'cu_secretary'].includes(user?.role) && (
                <Link to="/nominations" className="btn-primary btn-sm">Submit Recommendation</Link>
              )}
              {['nominees_published', 'objection_period', 'pre_agm'].includes(cycle.status) && (
                <Link to="/nominations/nominees" className="btn-teal btn-sm">View Nominees</Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Stats */}
      {isAdmin && isAdmin() && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Members', value: stats.total_members || 0, icon: Users, color: 'bg-navy/10', iconColor: 'text-navy' },
            { label: 'Active Members', value: stats.active_members || 0, icon: CheckCircle, color: 'bg-green-100', iconColor: 'text-green-600' },
            { label: 'Pending Approval', value: stats.pending_members || 0, icon: Clock, color: 'bg-orange/10', iconColor: 'text-orange', link: '/secretary/members/pending' },
            { label: 'Ministries', value: stats.ministry_count || 0, icon: Church, color: 'bg-teal/10', iconColor: 'text-teal' },
          ].map((s, i) => (
            <div key={i} className={`stat-card ${s.link ? 'cursor-pointer hover:shadow-md transition-all' : ''}`} onClick={() => s.link && (window.location.href = s.link)}>
              <div className={`stat-icon ${s.color}`}><s.icon size={20} className={s.iconColor} /></div>
              <div><div className="stat-number">{s.value}</div><div className="stat-label">{s.label}</div></div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions + Content */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card">
            <div className="card-header"><h2 className="font-montserrat font-bold text-navy">Quick Actions</h2></div>
            <div className="card-body">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { to: '/nominations', icon: FileText, label: 'Nominate', color: 'bg-orange/10 text-orange', show: !['nc_member', 'nc_chair', 'nc_secretary', 'ec_admin', 'super_admin', 'associate_member'].includes(user?.role) },
                  { to: '/nominations/nominees', icon: Award, label: 'Nominees', color: 'bg-teal/10 text-teal', show: user?.role !== 'associate_member' },
                  { to: '/member-card', icon: CreditCard, label: 'Member Card', color: 'bg-navy/10 text-navy', show: true },
                  { to: '/announcements', icon: Megaphone, label: 'Announcements', color: 'bg-purple-100 text-purple-600', show: true },
                  { to: '/leadership', icon: History, label: 'Leadership', color: 'bg-blue-100 text-blue-600', show: true },
                  { to: '/calendar', icon: CalendarDays, label: 'Calendar', color: 'bg-teal/10 text-teal', show: true },
                  { to: '/contact', icon: Send, label: 'Contact Admin', color: 'bg-gray-100 text-gray-600', show: true },
                  { to: '/constitution', icon: BookOpen, label: 'Constitution', color: 'bg-navy/10 text-navy', show: true },
                  { to: '/nc', icon: FileText, label: 'NC Panel', color: 'bg-orange/10 text-orange', show: isNC && isNC() },
                  { to: '/secretary/members', icon: Users, label: 'Members', color: 'bg-blue-100 text-blue-600', show: isSecretary && isSecretary() },
                  { to: '/admin', icon: Settings, label: 'Admin', color: 'bg-red/10 text-red', show: isAdmin && isAdmin() },
                  { to: '/analytics', icon: BarChart3, label: 'Analytics', color: 'bg-purple-100 text-purple-600', show: isAdmin && isAdmin() },
                  { to: '/treasurer/requisitions', icon: FileText, label: 'Requisitions', color: 'bg-green-100 text-green-600', show: canManageRequisitions && canManageRequisitions() },
                  { to: '/admin/disciplinary', icon: ShieldAlert, label: 'Disciplinary', color: 'bg-red/10 text-red', show: isAdmin && isAdmin() },
                  { to: '/profile/edit', icon: Users, label: 'My Profile', color: 'bg-gray-100 text-gray-600', show: true },
                ].filter(a => a.show).map((action, i) => (
                  <Link key={i} to={action.to} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-orange/30 hover:bg-orange/5 transition-all duration-150 text-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}><action.icon size={18} /></div>
                    <span className="text-xs font-montserrat font-bold text-navy">{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Ministry Dashboard */}
          {userMinistries.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-montserrat font-bold text-navy">My Ministries</h2>
                <div className="flex gap-1">
                  {userMinistries.map(m => <span key={m} className="badge badge-teal text-xs">{m.replace(' Ministry', '')}</span>)}
                </div>
              </div>
              <div className="card-body space-y-3">
                {ministryMeetings.length > 0 && (
                  <div>
                    <div className="text-xs font-montserrat font-bold text-gray-400 uppercase tracking-wide mb-2">Meeting Schedule</div>
                    {ministryMeetings.map(m => (
                      <div key={m.id} className="flex items-center gap-3 p-2 bg-navy/5 rounded-lg mb-1">
                        <CalendarDays size={14} className="text-navy flex-shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-navy">{m.title}</div>
                          {m.meeting_day && <div className="text-xs text-gray-500">{m.meeting_day}{m.meeting_time ? ` at ${m.meeting_time}` : ''}{m.meeting_venue ? ` — ${m.meeting_venue}` : ''}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {ministryAnnouncements.length > 0 && (
                  <div>
                    <div className="text-xs font-montserrat font-bold text-gray-400 uppercase tracking-wide mb-2">Ministry Announcements</div>
                    {ministryAnnouncements.slice(0, 2).map(a => (
                      <div key={a.id} className="p-2 border-b border-gray-50 last:border-0">
                        <div className="text-sm font-semibold text-navy">{a.title}</div>
                        {a.body && <div className="text-xs text-gray-500 line-clamp-2">{a.body}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {ministryContent.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No ministry updates yet.</p>}
              </div>
            </div>
          )}

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="card">
              <div className="card-header"><h2 className="font-montserrat font-bold text-navy">Latest Announcements</h2><Link to="/announcements" className="btn-outline btn-sm text-xs">View All</Link></div>
              <div>
                {announcements.map((a, i) => (
                  <div key={a.id} className={`px-5 py-3 ${i < announcements.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className="font-semibold text-navy text-sm mb-0.5">{a.title}</div>
                    <div className="text-gray-500 text-xs line-clamp-2">{a.body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Treasury Section — Treasurer only */}
          {isTreasurer && isTreasurer() && (
            <div className="card border-l-4 border-orange">
              <div className="card-header">
                <h2 className="font-montserrat font-bold text-navy flex items-center gap-2">
                  <DollarSign size={15} className="text-orange" /> Treasury — {currentYear}
                </h2>
                <Link to="/treasurer" className="btn-outline btn-sm text-xs">Full Dashboard →</Link>
              </div>
              <div className="card-body">
                {/* Balance */}
                {treasuryBalance && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center bg-teal/5 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-1">Income</div>
                      <div className="font-montserrat font-bold text-teal text-sm">KES {parseFloat(treasuryBalance.total_income || 0).toLocaleString()}</div>
                    </div>
                    <div className="text-center bg-orange/5 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-1">Disbursed</div>
                      <div className="font-montserrat font-bold text-orange text-sm">KES {parseFloat(treasuryBalance.total_expenses || 0).toLocaleString()}</div>
                    </div>
                    <div className={`text-center rounded-xl p-3 ${parseFloat(treasuryBalance.balance || 0) >= 0 ? 'bg-green-50' : 'bg-red/5'}`}>
                      <div className="text-xs text-gray-400 mb-1">Balance</div>
                      <div className={`font-montserrat font-bold text-sm ${parseFloat(treasuryBalance.balance || 0) >= 0 ? 'text-green-600' : 'text-red'}`}>
                        KES {parseFloat(treasuryBalance.balance || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
                {/* Quick links */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { to: '/treasurer/requisitions', icon: FileText, label: 'Requisitions', color: 'bg-orange/10 text-orange', badge: treasuryPending },
                    { to: '/treasurer/income', icon: TrendingUp, label: 'Income Ledger', color: 'bg-teal/10 text-teal' },
                    { to: '/treasurer/budget', icon: BarChart3, label: 'Budget Manager', color: 'bg-navy/10 text-navy' },
                    { to: '/treasurer/reports', icon: FileText, label: 'Reports', color: 'bg-green-100 text-green-600' },
                  ].map((item, i) => (
                    <Link key={i} to={item.to} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-orange/30 hover:bg-orange/5 transition-all text-center relative">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color}`}><item.icon size={16} /></div>
                      <span className="text-xs font-montserrat font-bold text-navy">{item.label}</span>
                      {item.badge > 0 && <span className="absolute -top-1 -right-1 bg-orange text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{item.badge}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div>
          <div className="card">
            <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">My Profile</h2><Link to="/profile/edit" className="btn-outline btn-sm">Edit</Link></div>
            <div className="card-body text-center">
              <img src={photoUrl} alt={user?.name} className="w-20 h-20 rounded-full object-cover border-2 border-orange mx-auto mb-3" />
              <div className="font-montserrat font-bold text-navy text-sm mb-0.5">{user?.name}</div>
              <div className="text-gray-400 text-xs mb-3">{user?.email}</div>
              <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                <span className="badge badge-teal">{user?.membership_type || 'full'} member</span>
                {user?.year_of_study && <span className="badge badge-navy">Year {user.year_of_study}</span>}
                {user?.course_type && <span className="badge badge-gray">{user.course_type}</span>}
              </div>
              {user?.mutcu_number && (
                <div className="bg-orange/10 rounded-lg px-3 py-1.5 inline-block mb-2">
                  <span className="font-montserrat font-bold text-orange text-sm">{user.mutcu_number}</span>
                </div>
              )}
              {user?.primary_ministry && <div className="text-xs text-gray-400">{user.primary_ministry}</div>}
              {user?.secondary_ministry && <div className="text-xs text-gray-400">{user.secondary_ministry}</div>}
              {user?.pending_changes && (
                <div className="mt-2 bg-orange/5 border border-orange/20 rounded-lg p-2 text-xs text-orange">
                  ⏳ Profile changes pending secretary approval
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}