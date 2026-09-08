import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import ChangePassword from './pages/auth/ChangePassword'
import VerifyEmail from './pages/auth/VerifyEmail'

import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ProfileComplete from './pages/profile/ProfileComplete'
import ProfileEdit from './pages/profile/ProfileEdit'
import MemberCard from './pages/MemberCard'
import PublicProfile from './pages/PublicProfile'
import Announcements from './pages/Announcements'
import Contact from './pages/Contact'
import Leadership from './pages/Leadership'
import Analytics from './pages/Analytics'
import CalendarPage from './pages/Calendar'
import Constitution from './pages/Constitution'

import Nominations from './pages/nominations/Nominations'
import Nominees from './pages/nominations/Nominees'

import NCDashboard from './pages/nc/NCDashboard'
import NCPosition from './pages/nc/NCPosition'
import NCObjections from './pages/nc/NCObjections'
import NCSuggestions from './pages/nc/NCSuggestions'

import MembersList from './pages/secretary/MembersList'
import MembersPending from './pages/secretary/MembersPending'
import MemberCreate from './pages/secretary/MemberCreate'
import MemberEdit from './pages/secretary/MemberEdit'
import MembersImport from './pages/secretary/MembersImport'
import MinistryMembers from './pages/secretary/MinistryMembers'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminCycles from './pages/admin/AdminCycles'
import AdminCycleCreate from './pages/admin/AdminCycleCreate'
import AdminAppointNC from './pages/admin/AdminAppointNC'
import AdminRoles from './pages/admin/AdminRoles'
import AdminAuditLog from './pages/admin/AdminAuditLog'
import AdminPositions from './pages/admin/AdminPositions'
import AdminMessages from './pages/admin/AdminMessages'
import AdminSettings from './pages/admin/AdminSettings'
import AdminDisciplinary from './pages/admin/AdminDisciplinary'

import Requisitions from './pages/treasurer/Requisitions'
import TreasurerDashboard from './pages/treasurer/TreasurerDashboard'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange mx-auto mb-3"></div>
        <div className="text-xs text-gray-400 font-montserrat font-semibold">Loading...</div>
      </div>
    </div>
  )
}

const ALL_SECRETARY_ROLES = [
  'cu_secretary', 'ministry_secretary',
  'music_secretary', 'creative_arts_secretary', 'technical_media_secretary',
  'hospitality_secretary', 'prayer_secretary', 'missions_secretary',
  'bible_study_secretary', 'discipleship_secretary', 'welfare_secretary',
]

const NC_ROLES = ['nc_member', 'nc_chair', 'nc_secretary', 'ec_admin', 'super_admin']
const ADMIN_ROLES = ['ec_admin', 'super_admin']
const ADMIN_AND_SECRETARY = ['ec_admin', 'super_admin', 'cu_secretary']

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  const token = localStorage.getItem('mutcu_token')
  const savedUser = localStorage.getItem('mutcu_user')
  const effectiveUser = user || (token && savedUser ? JSON.parse(savedUser) : null)
  if (!effectiveUser) return <Navigate to="/login" replace />
  if (effectiveUser.must_change_password) return <Navigate to="/change-password" replace />
  if (roles && !roles.includes(effectiveUser.role)) return <Navigate to="/dashboard" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  const token = localStorage.getItem('mutcu_token')
  if (user || token) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/member/:mutcuNumber" element={<PublicProfile />} />

      <Route path="/" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />

      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/profile/complete" element={<ProtectedRoute><ProfileComplete /></ProtectedRoute>} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile/edit" element={<ProfileEdit />} />
        <Route path="member-card" element={<MemberCard />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="contact" element={<Contact />} />
        <Route path="leadership" element={<Leadership />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="constitution" element={<Constitution />} />
        <Route path="nominations" element={<Nominations />} />
        <Route path="nominations/nominees" element={<Nominees />} />
        <Route path="treasurer" element={<ProtectedRoute roles={['cu_treasurer','ec_admin','super_admin','cu_secretary',...ALL_SECRETARY_ROLES,'1st_vp','2nd_vp','vice_secretary','prayer_coordinator','music_coordinator','missions_coordinator','bible_study_coordinator','discipleship_coordinator','tech_media_coordinator','creative_arts_coordinator','interim_chair','interim_secretary','interim_treasurer']}><TreasurerDashboard /></ProtectedRoute>} />
        <Route path="treasurer/requisitions" element={<ProtectedRoute roles={['cu_treasurer','ec_admin','super_admin','cu_secretary',...ALL_SECRETARY_ROLES,'1st_vp','2nd_vp','vice_secretary','prayer_coordinator','music_coordinator','missions_coordinator','bible_study_coordinator','discipleship_coordinator','tech_media_coordinator','creative_arts_coordinator','interim_chair','interim_secretary','interim_treasurer']}><Requisitions /></ProtectedRoute>} />

        {/* NC Panel */}
        <Route path="nc" element={<ProtectedRoute roles={NC_ROLES}><NCDashboard /></ProtectedRoute>} />
        <Route path="nc/position/:positionId" element={<ProtectedRoute roles={NC_ROLES}><NCPosition /></ProtectedRoute>} />
        <Route path="nc/objections" element={<ProtectedRoute roles={NC_ROLES}><NCObjections /></ProtectedRoute>} />
        <Route path="nc/suggestions" element={<ProtectedRoute roles={NC_ROLES}><NCSuggestions /></ProtectedRoute>} />

        {/* Ministry Members — for ministry secretaries and EC coordinators */}
        <Route path="secretary/ministry-members" element={<ProtectedRoute roles={[...ALL_SECRETARY_ROLES, 'prayer_coordinator','music_coordinator','missions_coordinator','bible_study_coordinator','discipleship_coordinator','tech_media_coordinator','creative_arts_coordinator','1st_vp','2nd_vp','treasurer','vice_secretary']}><MinistryMembers /></ProtectedRoute>} />

        {/* Secretary — all secretary roles */}
        <Route path="secretary/members" element={<ProtectedRoute roles={[...ADMIN_AND_SECRETARY, ...ALL_SECRETARY_ROLES]}><MembersList /></ProtectedRoute>} />
        <Route path="secretary/members/pending" element={<ProtectedRoute roles={ADMIN_AND_SECRETARY}><MembersPending /></ProtectedRoute>} />
        <Route path="secretary/members/create" element={<ProtectedRoute roles={ADMIN_AND_SECRETARY}><MemberCreate /></ProtectedRoute>} />
        <Route path="secretary/members/:id/edit" element={<ProtectedRoute roles={[...ADMIN_AND_SECRETARY, ...ALL_SECRETARY_ROLES]}><MemberEdit /></ProtectedRoute>} />
        <Route path="secretary/members/import" element={<ProtectedRoute roles={ADMIN_AND_SECRETARY}><MembersImport /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="admin" element={<ProtectedRoute roles={ADMIN_AND_SECRETARY}><AdminDashboard /></ProtectedRoute>} />
        <Route path="admin/cycles" element={<ProtectedRoute roles={[...ADMIN_AND_SECRETARY,'nc_chair']}><AdminCycles /></ProtectedRoute>} />
        <Route path="admin/cycles/create" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminCycleCreate /></ProtectedRoute>} />
        <Route path="admin/cycles/:id/appoint-nc" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminAppointNC /></ProtectedRoute>} />
        <Route path="admin/roles" element={<ProtectedRoute roles={['super_admin']}><AdminRoles /></ProtectedRoute>} />
        <Route path="admin/audit-log" element={<ProtectedRoute roles={ADMIN_AND_SECRETARY}><AdminAuditLog /></ProtectedRoute>} />
        <Route path="admin/positions" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminPositions /></ProtectedRoute>} />
        <Route path="admin/messages" element={<ProtectedRoute roles={ADMIN_AND_SECRETARY}><AdminMessages /></ProtectedRoute>} />
        <Route path="admin/settings" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminSettings /></ProtectedRoute>} />
        <Route path="admin/disciplinary" element={<ProtectedRoute roles={ADMIN_AND_SECRETARY}><AdminDisciplinary /></ProtectedRoute>} />
        <Route path="analytics" element={<ProtectedRoute roles={ADMIN_AND_SECRETARY}><Analytics /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem', fontWeight: 600 } }} />
      </BrowserRouter>
    </AuthProvider>
  )
}