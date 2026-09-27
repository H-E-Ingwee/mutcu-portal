import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

// All EC coordinator roles (EC members who manage ministries)
const EC_COORDINATOR_ROLES = [
  'prayer_coordinator', 'music_coordinator', 'missions_coordinator',
  'bible_study_coordinator', 'discipleship_coordinator',
  'tech_media_coordinator', 'creative_arts_coordinator',
  '1st_vp', '2nd_vp', 'vice_secretary', 'cu_treasurer',
]

// All ministry secretary roles (committee-level)
const MINISTRY_SECRETARY_ROLES = [
  'music_secretary', 'creative_arts_secretary', 'technical_media_secretary',
  'hospitality_secretary', 'prayer_secretary', 'missions_secretary',
  'bible_study_secretary', 'discipleship_secretary', 'welfare_secretary',
  'ministry_secretary',
]

// NC roles
const NC_ROLES = ['nc_chair', 'nc_secretary', 'nc_member']

// Interim EC roles
const INTERIM_ROLES = ['interim_chair', 'interim_secretary', 'interim_treasurer']

export function AuthProvider({ children }) {
  // Initialize from localStorage cache for instant load (verified async below)
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('mutcu_user')
      return cached ? JSON.parse(cached) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(() => {
    // If no token, not loading. If cached user exists, show UI immediately
    const token = localStorage.getItem('mutcu_token')
    if (!token) return false
    const cached = localStorage.getItem('mutcu_user')
    return !cached // only show spinner if no cached user
  })

  useEffect(() => {
    const token = localStorage.getItem('mutcu_token')
    if (!token) { setLoading(false); return }

    // Load cached user instantly — no spinner, no flicker
    const cached = localStorage.getItem('mutcu_user')
    if (cached) {
      try {
        setUser(JSON.parse(cached))
        setLoading(false) // show UI immediately from cache
      } catch {}
    }

    // Verify token in background with retry logic
    // Does NOT log out on timeout/network error — only on explicit 401
    const verifyWithRetry = async (retries = 2) => {
      try {
        const res = await api.get('/auth/me')
        setUser(res.data.user)
        localStorage.setItem('mutcu_user', JSON.stringify(res.data.user))
      } catch (err) {
        const status = err.response?.status
        const isNetworkError = !err.response || err.code === 'ECONNABORTED'

        if (isNetworkError && retries > 0) {
          // Server busy / cold start — retry after delay, don't log out
          console.warn('[AUTH] Server unreachable, retrying in 3s...', retries, 'retries left')
          setTimeout(() => verifyWithRetry(retries - 1), 3000)
          return
        }

        if (status === 401) {
          // Genuine auth failure — clear session
          localStorage.removeItem('mutcu_token')
          localStorage.removeItem('mutcu_user')
          setUser(null)
        }
        // For 500/503/timeout after retries — keep cached user, don't log out
        // User will be re-verified on next navigation
      } finally {
        setLoading(false)
      }
    }

    verifyWithRetry()
  }, [])

  const login = useCallback((token, userData) => {
    localStorage.setItem('mutcu_token', token)
    localStorage.setItem('mutcu_user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('mutcu_token')
    localStorage.removeItem('mutcu_user')
    setUser(null)
  }, [])

  const updateUser = useCallback((userData) => {
    setUser(userData)
    localStorage.setItem('mutcu_user', JSON.stringify(userData))
  }, [])

  // hasRole checks BOTH primary role and secondary_role (dual roles support)
  // e.g. a music_coordinator who is also nc_chair will pass hasRole('nc_chair')
  const hasRole = (...roles) => {
    if (!user) return false
    if (roles.includes(user.role)) return true
    if (user.secondary_role && roles.includes(user.secondary_role)) return true
    return false
  }

  // Super admin and EC Admin (Chairperson) — full access
  const isAdmin = () => hasRole('super_admin', 'ec_admin')

  // Secretary — broad access (not nominations, not role management)
  const isSecretary = () => hasRole('super_admin', 'ec_admin', 'cu_secretary', 'vice_secretary')

  // CU Treasurer — dedicated financial role (separate from Secretary)
  const isTreasurer = () => hasRole('super_admin', 'ec_admin', 'cu_treasurer')

  // NC roles — includes chair and secretary who can act
  // Also checks secondary_role so EC members appointed to NC keep their ministry access
  const isNC = () => hasRole('super_admin', 'ec_admin', 'nc_chair', 'nc_secretary', 'nc_member')
  const isNCAction = () => hasRole('super_admin', 'ec_admin', 'nc_chair', 'nc_secretary')
  const isNCChair = () => hasRole('nc_chair') || user?.secondary_role === 'nc_chair'

  // EC Coordinator (ministry coordinator EC member)
  const isECCoordinator = () => user && EC_COORDINATOR_ROLES.includes(user.role)

  // Ministry Secretary (committee level)
  const isMinistrySecretary = () => user && MINISTRY_SECRETARY_ROLES.includes(user.role)

  // Any leadership role (EC + coordinators + secretaries)
  const isLeadership = () => isSecretary() || isECCoordinator() || isMinistrySecretary() ||
    hasRole(...NC_ROLES, ...INTERIM_ROLES)

  // Can manage requisitions (EC + secretaries + coordinators + treasurer, NOT regular members)
  const canManageRequisitions = () => isSecretary() || isTreasurer() || isECCoordinator() ||
    isMinistrySecretary() || hasRole(...INTERIM_ROLES) || hasRole('cu_treasurer', '1st_vp', '2nd_vp', 'vice_secretary')

  // Approved member
  const isApproved = () => user?.enrollment_status === 'active'

  // Get ministry for current user's role
  const getMyMinistry = () => {
    const roleMinistryMap = {
      music_secretary: 'Music Ministry',
      music_coordinator: 'Music Ministry',
      creative_arts_secretary: 'Creative Arts Ministry',
      creative_arts_coordinator: 'Creative Arts Ministry',
      technical_media_secretary: 'Technical & Media Ministry',
      tech_media_coordinator: 'Technical & Media Ministry',
      hospitality_secretary: 'Hospitality Ministry',
      prayer_secretary: 'Prayer Ministry',
      prayer_coordinator: 'Prayer Ministry',
      missions_secretary: 'Missions & Evangelism Ministry',
      missions_coordinator: 'Missions & Evangelism Ministry',
      bible_study_secretary: 'Bible Study & Training Ministry',
      bible_study_coordinator: 'Bible Study & Training Ministry',
      discipleship_secretary: 'Discipleship Ministry',
      discipleship_coordinator: 'Discipleship Ministry',
      welfare_secretary: 'Welfare Ministry',
    }
    return roleMinistryMap[user?.role] || null
  }

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, updateUser,
      hasRole, isAdmin, isSecretary, isTreasurer, isNC, isNCAction, isNCChair,
      isECCoordinator, isMinistrySecretary, isLeadership,
      canManageRequisitions, isApproved, getMyMinistry,
      EC_COORDINATOR_ROLES, MINISTRY_SECRETARY_ROLES, NC_ROLES, INTERIM_ROLES,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)