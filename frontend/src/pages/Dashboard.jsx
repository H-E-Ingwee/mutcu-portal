import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { FileText, Award, CreditCard, Users, Settings, BarChart3, Clock, CheckCircle } from 'lucide-react'

export default function Dashboard() {
  const { user, isAdmin, isSecretary, isNC } = useAuth()
  const [cycle, setCycle] = useState(null)
  const [stats, setStats] = useState({ total_members:0, active_members:0, pending_members:0, ministry_count:0 })
  const [currentEC, setCurrentEC] = useState([])
  const [loading, setLoading] = useState(true)

  const photoUrl = user?.photo_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('mutcu_token')
      console.log('TOKEN CHECK:', token ? 'EXISTS: ' + token.substring(0,20) : 'NULL - NOT STORED')
      try {
        const cycleRes = await api.get('/nominations/cycle')
        setCycle(cycleRes.data?.cycle || null)
      } catch (e) { setCycle(null) }

      if (isAdmin && isAdmin()) {
        try {
          const adminRes = await api.get('/admin/dashboard')
          if (adminRes.data?.stats) setStats(adminRes.data.stats)
          if (adminRes.data?.currentEC) setCurrentEC(adminRes.data.currentEC)
        } catch (e) { /* ignore */ }
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const isPending = user?.enrollment_status === 'pending'

  const cycleStatusLabel = {
    setup: 'Setup', prayer_period: 'Prayer Period', nominations_open: 'Nominations Open',
    vetting: 'NC Vetting', nominees_published: 'Nominees Published',
    objection_period: 'Objection Period', pre_agm: 'Pre-AGM', commissioned: 'Commissioned',
  }

  const cycleStatusColor = {
    nominations_open: 'badge-green', nominees_published: 'badge-teal',
    objection_period: 'badge-red', vetting: 'badge-orange',
    commissioned: 'badge-navy', default: 'badge-gray'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
    </div>
  )

  return (
    <div>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy to-[#0a0060] rounded-2xl p-6 mb-6 flex items-center justify-between flex-wrap gap-4 shadow-lg">
        <div>
          <div className="text-white/40 text-xs font-montserrat font-semibold uppercase tracking-wider mb-1">
            {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </div>
          <h1 className="text-2xl font-montserrat font-bold text-white mb-1">
            {isPending ? `Welcome, ${user?.name?.split(' ')[0]}!` : `Welcome back, ${user?.name?.split(' ')[0]}!`}
          </h1>
          <p className="text-white/50 text-sm">
            {isPending ? 'Membership Application Submitted'
              : `${(user?.role||'').replace(/_/g,' ')} · ${user?.primary_ministry || 'General Member'}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {cycle && !isPending && (
            <div className="text-right hidden sm:block">
              <div className="text-white/40 text-xs font-montserrat font-semibold uppercase tracking-wider">Active Cycle</div>
              <div className="text-orange font-montserrat font-bold text-sm">{cycle.spiritual_year}</div>
            </div>
          )}
          <img src={photoUrl} alt={user?.name} className="w-14 h-14 rounded-full object-cover border-2 border-orange/50" />
        </div>
      </div>

      {/* Pending Notice */}
      {isPending && (
        <div className="card p-6 mb-6 border-l-4 border-orange">
          <div className="flex items-start gap-4">
            <Clock size={24} className="text-orange flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-montserrat font-bold text-navy mb-1">Application Pending Approval</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Your membership application is being reviewed by the CU Secretary.
                You will receive an email once approved.
              </p>
              {!user?.profile_complete && (
                <Link to="/profile/complete" className="btn-primary mt-3 inline-flex">Complete Your Profile</Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Cycle Banner */}
      {cycle && !isPending && (
        <div className="card p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-montserrat font-bold text-navy text-sm mb-0.5">{cycle.title}</div>
            <div className="text-gray-500 text-xs">
              Status: <strong>{cycleStatusLabel[cycle.status] || cycle.status}</strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${cycleStatusColor[cycle.status] || 'badge-gray'}`}>
              {cycleStatusLabel[cycle.status] || cycle.status}
            </span>
            {cycle.status === 'nominations_open' &&
              !['nc_member','ec_admin','super_admin','cu_secretary'].includes(user?.role) && (
              <Link to="/nominations" className="btn-primary btn-sm">Submit Recommendation</Link>
            )}
            {['nominees_published','objection_period','pre_agm'].includes(cycle.status) && (
              <Link to="/nominations/nominees" className="btn-teal btn-sm">View Nominees</Link>
            )}
          </div>
        </div>
      )}

      {/* Admin Stats */}
      {isAdmin && isAdmin() && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Members', value: stats.total_members||0, icon: Users, color: 'bg-navy/10', iconColor: 'text-navy' },
            { label: 'Active Members', value: stats.active_members||0, icon: CheckCircle, color: 'bg-green-100', iconColor: 'text-green-600' },
            { label: 'Pending Approval', value: stats.pending_members||0, icon: Clock, color: 'bg-orange/10', iconColor: 'text-orange' },
            { label: 'Ministries', value: stats.ministry_count||0, icon: Award, color: 'bg-teal/10', iconColor: 'text-teal' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className={`stat-icon ${s.color}`}><s.icon size={20} className={s.iconColor} /></div>
              <div><div className="stat-number">{s.value}</div><div className="stat-label">{s.label}</div></div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 card">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy">Quick Actions</h2></div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { to: '/nominations', icon: FileText, label: 'Nominate', color: 'bg-orange/10 text-orange',
                  show: !['nc_member','ec_admin','super_admin'].includes(user?.role) && !isPending },
                { to: '/nominations/nominees', icon: Award, label: 'Nominees', color: 'bg-teal/10 text-teal', show: !isPending },
                { to: '/member-card', icon: CreditCard, label: 'Member Card', color: 'bg-navy/10 text-navy', show: !isPending },
                { to: '/nc', icon: FileText, label: 'NC Panel', color: 'bg-orange/10 text-orange', show: isNC && isNC() },
                { to: '/secretary/members', icon: Users, label: 'Members', color: 'bg-blue-100 text-blue-600', show: isSecretary && isSecretary() },
                { to: '/admin', icon: Settings, label: 'Admin', color: 'bg-red/10 text-red', show: isAdmin && isAdmin() },
                { to: '/analytics', icon: BarChart3, label: 'Analytics', color: 'bg-purple-100 text-purple-600', show: isAdmin && isAdmin() },
                { to: '/profile/edit', icon: Users, label: 'My Profile', color: 'bg-gray-100 text-gray-600', show: true },
              ].filter(a => a.show).map((action, i) => (
                <Link key={i} to={action.to}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-orange/30 hover:bg-orange/5 transition-all duration-150 text-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                    <action.icon size={18} />
                  </div>
                  <span className="text-xs font-montserrat font-bold text-navy">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-montserrat font-bold text-navy">My Profile</h2>
            <Link to="/profile/edit" className="btn-outline btn-sm">Edit</Link>
          </div>
          <div className="card-body text-center">
            <img src={photoUrl} alt={user?.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-orange mx-auto mb-3" />
            <div className="font-montserrat font-bold text-navy text-sm mb-0.5">{user?.name}</div>
            <div className="text-gray-400 text-xs mb-3">{user?.email}</div>
            <div className="flex flex-wrap gap-1.5 justify-center mb-3">
              <span className="badge badge-teal">{user?.membership_type || 'full'} member</span>
              {user?.year_of_study && <span className="badge badge-navy">Year {user.year_of_study}</span>}
            </div>
            {user?.mutcu_number && (
              <div className="bg-orange/10 rounded-lg px-3 py-1.5 inline-block">
                <span className="font-montserrat font-bold text-orange text-sm">{user.mutcu_number}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
