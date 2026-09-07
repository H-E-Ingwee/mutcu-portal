import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

// All EC coordinator roles (EC members who manage ministries)
const EC_COORDINATOR_ROLES = [
  'prayer_coordinator', 'music_coordinator', 'missions_coordinator',
  'bible_study_coordinator', 'discipleship_coordinator',
  'tech_media_coordinator', 'creative_arts_coordinator',
  '1st_vp', '2nd_vp', 'vice_secretary', 'treasurer',
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
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('mutcu_token')
    if (!token) { setLoading(false); return }
    api.get('/auth/me')
      .then(res => {
        setUser(res.data.user)
        localStorage.setItem('mutcu_user', JSON.stringify(res.data.user))
      })
      .catch(() => {
        localStorage.removeItem('mutcu_token')
        localStorage.removeItem('mutcu_user')
        setUser(null)
      })
      .finally(() => setLoading(false))
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

  const hasRole = (...roles) => user && roles.includes(user.role)

  // Super admin and EC Admin (Chairperson) — full access
  const isAdmin = () => hasRole('super_admin', 'ec_admin')

  // Secretary — broad access (not nominations, not role management)
  const isSecretary = () => hasRole('super_admin', 'ec_admin', 'cu_secretary')

  // Treasurer — financial access
  const isTreasurer = () => hasRole('super_admin', 'ec_admin', 'cu_secretary', 'treasurer')

  // NC roles — includes chair and secretary who can act
  const isNC = () => hasRole('super_admin', 'ec_admin', 'nc_chair', 'nc_secretary', 'nc_member')
  const isNCAction = () => hasRole('super_admin', 'ec_admin', 'nc_chair', 'nc_secretary')

  // EC Coordinator (ministry coordinator EC member)
  const isECCoordinator = () => user && EC_COORDINATOR_ROLES.includes(user.role)

  // Ministry Secretary (committee level)
  const isMinistrySecretary = () => user && MINISTRY_SECRETARY_ROLES.includes(user.role)

  // Any leadership role (EC + coordinators + secretaries)
  const isLeadership = () => isSecretary() || isECCoordinator() || isMinistrySecretary() ||
    hasRole(...NC_ROLES, ...INTERIM_ROLES)

  // Can manage requisitions (EC + secretaries + coordinators + treasurer)
  const canManageRequisitions = () => isSecretary() || isTreasurer() || isECCoordinator() ||
    isMinistrySecretary() || hasRole(...INTERIM_ROLES)

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
      hasRole, isAdmin, isSecretary, isTreasurer, isNC, isNCAction,
      isECCoordinator, isMinistrySecretary, isLeadership,
      canManageRequisitions, isApproved, getMyMinistry,
      EC_COORDINATOR_ROLES, MINISTRY_SECRETARY_ROLES, NC_ROLES, INTERIM_ROLES,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)