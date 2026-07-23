import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import api from '../lib/api'
import {
  LayoutDashboard, Users, FileText, Award, BarChart3, Settings,
  LogOut, Menu, Bell, UserCircle, Shield, BookOpen, Mic2,
  MessageSquare, ClipboardList, Megaphone, History, Send, X, CalendarDays
} from 'lucide-react'

export default function Layout() {
  const { user, logout, isAdmin, isSecretary, isNC } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])

  const photoUrl = user?.photo_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const { data } = await api.get('/notifications/unread-count')
      setUnreadCount(data.count || 0)
    } catch {}
  }

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.notifications || [])
    } catch {}
  }

  const toggleNotifications = () => {
    if (!showNotifications) fetchNotifications()
    setShowNotifications(!showNotifications)
  }

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
    } catch {}
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const NavItem = ({ to, icon: Icon, label, badge }) => (
    <NavLink to={to} onClick={() => setSidebarOpen(false)}
      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
      <Icon size={16} />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="bg-orange text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {badge}
        </span>
      )}
    </NavLink>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden p-0.5">
              <img src="/mutcu-icon.png" alt="MUTCU" className="w-full h-full object-contain"
                onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='<span class="text-navy font-bold text-sm font-montserrat">M</span>' }} />
            </div>
            <div>
              <div className="font-montserrat font-bold text-white text-sm">MUTCU DMS</div>
              <div className="text-white/40 text-xs">Digital Management</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/announcements" icon={Megaphone} label="Announcements" />
          <NavItem to="/nominations" icon={FileText} label="Nominations" />
          <NavItem to="/nominations/nominees" icon={Award} label="Nominees" />
          <NavItem to="/member-card" icon={UserCircle} label="Member Card" />
          <NavItem to="/leadership" icon={History} label="Leadership History" />
          <NavItem to="/calendar" icon={CalendarDays} label="Calendar" />
          <NavItem to="/contact" icon={Send} label="Contact Admin" />

          {isNC && isNC() && (
            <>
              <div className="text-white/30 text-xs font-montserrat font-semibold uppercase tracking-wider px-4 pt-4 pb-1">Nomination College</div>
              <NavItem to="/nc" icon={ClipboardList} label="NC Dashboard" />
              <NavItem to="/nc/objections" icon={MessageSquare} label="Objections" />
              <NavItem to="/nc/suggestions" icon={Mic2} label="Suggestions" />
            </>
          )}

          {isSecretary && isSecretary() && (
            <>
              <div className="text-white/30 text-xs font-montserrat font-semibold uppercase tracking-wider px-4 pt-4 pb-1">Secretary</div>
              <NavItem to="/secretary/members" icon={Users} label="Member Register" />
              <NavItem to="/secretary/members/pending" icon={Bell} label="Pending Approvals" />
            </>
          )}

          {isAdmin && isAdmin() && (
            <>
              <div className="text-white/30 text-xs font-montserrat font-semibold uppercase tracking-wider px-4 pt-4 pb-1">Administration</div>
              <NavItem to="/admin" icon={Settings} label="Admin Dashboard" />
              <NavItem to="/admin/cycles" icon={BookOpen} label="Nomination Cycles" />
              <NavItem to="/admin/positions" icon={Award} label="EC Positions" />
              <NavItem to="/admin/messages" icon={MessageSquare} label="Messages" />
              <NavItem to="/analytics" icon={BarChart3} label="Analytics" />
              <NavItem to="/admin/roles" icon={Shield} label="Role Management" />
              <NavItem to="/admin/audit-log" icon={ClipboardList} label="Audit Log" />
              <NavItem to="/admin/settings" icon={Settings} label="System Settings" />
            </>
          )}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2">
            <img src={photoUrl} alt={user?.name} className="w-8 h-8 rounded-full object-cover border-2 border-orange/50" />
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-white/40 text-xs truncate">{user?.mutcu_number || user?.email}</div>
            </div>
            <button onClick={handleLogout} className="text-white/40 hover:text-red transition-colors p-1" title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-navy p-1 lg:hidden"><Menu size={20} /></button>
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/mutcu-icon.png" alt="MUTCU" className="w-6 h-6 object-contain"
                onError={e => e.target.style.display='none'} />
              <span className="font-montserrat font-bold text-navy text-sm">MUTCU DMS</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button onClick={toggleNotifications} className="relative p-2 text-gray-500 hover:text-navy hover:bg-gray-100 rounded-lg transition-all">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-orange text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-montserrat font-bold text-navy text-sm">Notifications</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-orange hover:underline">Mark all read</button>}
                      <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">No notifications</div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${!n.read_at ? 'bg-orange/5' : ''}`}>
                        <div className="font-semibold text-navy text-xs">{n.title}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{n.body}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Profile */}
            <NavLink to="/profile/edit" className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-all">
              <img src={photoUrl} alt={user?.name} className="w-7 h-7 rounded-full object-cover border border-orange/30" />
              <span className="text-sm font-semibold text-navy hidden sm:block">{user?.name?.split(' ')[0]}</span>
            </NavLink>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
