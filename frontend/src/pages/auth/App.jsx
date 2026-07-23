import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import VerifyEmail from './pages/auth/VerifyEmail'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import ChangePassword from './pages/auth/ChangePassword'

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

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminCycles from './pages/admin/AdminCycles'
import AdminCycleCreate from './pages/admin/AdminCycleCreate'
import AdminAppointNC from './pages/admin/AdminAppointNC'
import AdminRoles from './pages/admin/AdminRoles'
import AdminAuditLog from './pages/admin/AdminAuditLog'
import AdminPositions from './pages/admin/AdminPositions'
import AdminMessages from './pages/admin/AdminMessages'

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

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />

  const token = localStorage.getItem('mutcu_token')
  const savedUser = localStorage.getItem('mutcu_user')
  const effectiveUser = user || (token && savedUser ? JSON.parse(savedUser) : null)

  if (!effectiveUser) return <Navigate to="/login" replace />

  // Enforce email verification
  if (!effectiveUser.email_verified) return <Navigate to="/verify-email" replace />

  // Enforce password change
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
      {/* Public */}
      <Route path="/member/:mutcuNumber" element={<PublicProfile />} />

      {/* Guest only */}
      <Route path="/" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />

      {/* Auth - no layout, no verification required */}
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/profile/complete" element={<ProtectedRoute><ProfileComplete /></ProtectedRoute>} />

      {/* Main app - requires email verification */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile/edit" element={<ProfileEdit />} />
        <Route path="member-card" element={<MemberCard />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="contact" element={<Contact />} />
        <Route path="leadership" element={<Leadership />} />
        <Route path="nominations" element={<Nominations />} />
        <Route path="nominations/nominees" element={<Nominees />} />

        <Route path="nc" element={<ProtectedRoute roles={['nc_member','ec_admin','super_admin']}><NCDashboard /></ProtectedRoute>} />
        <Route path="nc/position/:positionId" element={<ProtectedRoute roles={['nc_member','ec_admin','super_admin']}><NCPosition /></ProtectedRoute>} />
        <Route path="nc/objections" element={<ProtectedRoute roles={['nc_member','ec_admin','super_admin']}><NCObjections /></ProtectedRoute>} />
        <Route path="nc/suggestions" element={<ProtectedRoute roles={['nc_member','ec_admin','super_admin']}><NCSuggestions /></ProtectedRoute>} />

        <Route path="secretary/members" element={<ProtectedRoute roles={['cu_secretary','ec_admin','super_admin']}><MembersList /></ProtectedRoute>} />
        <Route path="secretary/members/pending" element={<ProtectedRoute roles={['cu_secretary','ec_admin','super_admin']}><MembersPending /></ProtectedRoute>} />
        <Route path="secretary/members/create" element={<ProtectedRoute roles={['cu_secretary','ec_admin','super_admin']}><MemberCreate /></ProtectedRoute>} />
        <Route path="secretary/members/:id/edit" element={<ProtectedRoute roles={['cu_secretary','ec_admin','super_admin']}><MemberEdit /></ProtectedRoute>} />
        <Route path="secretary/members/import" element={<ProtectedRoute roles={['cu_secretary','ec_admin','super_admin']}><MembersImport /></ProtectedRoute>} />

        <Route path="admin" element={<ProtectedRoute roles={['ec_admin','super_admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="admin/cycles" element={<ProtectedRoute roles={['ec_admin','super_admin']}><AdminCycles /></ProtectedRoute>} />
        <Route path="admin/cycles/create" element={<ProtectedRoute roles={['ec_admin','super_admin']}><AdminCycleCreate /></ProtectedRoute>} />
        <Route path="admin/cycles/:id/appoint-nc" element={<ProtectedRoute roles={['ec_admin','super_admin']}><AdminAppointNC /></ProtectedRoute>} />
        <Route path="admin/roles" element={<ProtectedRoute roles={['super_admin']}><AdminRoles /></ProtectedRoute>} />
        <Route path="admin/audit-log" element={<ProtectedRoute roles={['ec_admin','super_admin']}><AdminAuditLog /></ProtectedRoute>} />
        <Route path="admin/positions" element={<ProtectedRoute roles={['ec_admin','super_admin']}><AdminPositions /></ProtectedRoute>} />
        <Route path="admin/messages" element={<ProtectedRoute roles={['ec_admin','super_admin','cu_secretary']}><AdminMessages /></ProtectedRoute>} />

        <Route path="analytics" element={<ProtectedRoute roles={['ec_admin','super_admin']}><Analytics /></ProtectedRoute>} />
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
