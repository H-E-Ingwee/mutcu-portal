import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { Users, Clock, CheckCircle, BookOpen, Settings, BarChart3, Shield, ClipboardList, ChevronRight, ShieldAlert } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.get('/admin/dashboard').then(r => setData(r.data)).finally(() => setLoading(false)) }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  const { stats, activeCycle, currentEC, recentLogs } = data || {}

  const cycleStatusLabel = { setup:'Setup', prayer_period:'Prayer Period', nominations_open:'Nominations Open', vetting:'NC Vetting', nominees_published:'Nominees Published', objection_period:'Objection Period', pre_agm:'Pre-AGM', commissioned:'Commissioned' }

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Admin Dashboard</h1><p className="page-subtitle">System overview and management</p></div>
        <Link to="/admin/cycles/create" className="btn-primary btn-sm"><BookOpen size={14} />New Cycle</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Members', value: stats?.total_members||0, icon: Users, color: 'bg-navy/10', iconColor: 'text-navy' },
          { label: 'Active Members', value: stats?.active_members||0, icon: CheckCircle, color: 'bg-green-100', iconColor: 'text-green-600' },
          { label: 'Pending Approval', value: stats?.pending_members||0, icon: Clock, color: 'bg-orange/10', iconColor: 'text-orange' },
          { label: 'Ministries', value: stats?.ministry_count||0, icon: BookOpen, color: 'bg-teal/10', iconColor: 'text-teal' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.color}`}><s.icon size={20} className={s.iconColor} /></div>
            <div><div className="stat-number">{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Active Cycle */}
        <div className="card">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Active Nomination Cycle</h2></div>
          <div className="card-body">
            {activeCycle ? (
              <>
                <div className="font-montserrat font-bold text-navy mb-1">{activeCycle.title}</div>
                <span className="badge badge-teal mb-3 inline-block">{cycleStatusLabel[activeCycle.status]||activeCycle.status}</span>
                {[['Nominations Open', activeCycle.nomination_open_date],['Nominations Close', activeCycle.nomination_close_date],['Publication Date', activeCycle.publication_date],['AGM Date', activeCycle.agm_date]].map(([label, date], i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-50 text-sm last:border-0">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-semibold text-navy">{date ? new Date(date).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}) : '—'}</span>
                  </div>
                ))}
                <div className="flex gap-2 mt-4">
                  <Link to={`/admin/cycles/${activeCycle.id}/appoint-nc`} className="btn-outline btn-sm">Appoint NC</Link>
                  <Link to="/nc" className="btn-teal btn-sm">NC Dashboard</Link>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-gray-400 text-sm mb-3">No active cycle</div>
                <Link to="/admin/cycles/create" className="btn-primary btn-sm">Create Nomination Cycle</Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="card">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Quick Actions</h2></div>
          <div>
            {[
              { label: 'Member Register', sub: `${stats?.total_members||0} members`, to: '/secretary/members', icon: Users },
              { label: 'Pending Approvals', sub: `${stats?.pending_members||0} awaiting`, to: '/secretary/members/pending', icon: Clock },
              { label: 'Nomination Cycles', sub: 'Manage cycles', to: '/admin/cycles', icon: BookOpen },
              { label: 'EC Positions', sub: '13 positions', to: '/admin/positions', icon: Settings },
              { label: 'Analytics', sub: 'Data insights', to: '/analytics', icon: BarChart3 },
              { label: 'Role Management', sub: 'Assign roles', to: '/admin/roles', icon: Shield },
              { label: 'Audit Log', sub: 'System activity', to: '/admin/audit-log', icon: ClipboardList },
              { label: 'Disciplinary', sub: 'Case management', to: '/admin/disciplinary', icon: ShieldAlert },
              { label: 'System Settings', sub: 'Configure portal', to: '/admin/settings', icon: Settings },
            ].map((link, i) => (
              <Link key={i} to={link.to} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-all last:border-0">
                <div className="flex items-center gap-3">
                  <link.icon size={15} className="text-gray-400" />
                  <div><div className="font-semibold text-navy text-sm">{link.label}</div><div className="text-xs text-gray-400">{link.sub}</div></div>
                </div>
                <ChevronRight size={14} className="text-gray-300" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Recent Activity</h2><Link to="/admin/audit-log" className="btn-outline btn-sm text-xs">View All</Link></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Action</th><th>Actor</th><th>Time</th></tr></thead>
            <tbody>
              {(recentLogs||[]).length === 0 ? (
                <tr><td colSpan={3} className="text-center py-6 text-gray-400">No activity yet.</td></tr>
              ) : (recentLogs||[]).map((log, i) => (
                <tr key={i}>
                  <td><div className="font-semibold text-navy text-sm">{log.description || log.action?.replace(/\./g,' ')}</div></td>
                  <td className="text-sm text-gray-500">{log.actor?.name || 'System'}</td>
                  <td className="text-xs text-gray-400">{log.created_at ? formatDistanceToNow(new Date(log.created_at), {addSuffix:true}) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
