import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('mutcu_token')
    if (!token) {
      setLoading(false)
      return
    }
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
  const isAdmin = () => hasRole('super_admin', 'ec_admin')
  const isSecretary = () => hasRole('super_admin', 'ec_admin', 'cu_secretary')
  const isNC = () => hasRole('super_admin', 'ec_admin', 'nc_member')
  const isApproved = () => user?.enrollment_status === 'active'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, hasRole, isAdmin, isSecretary, isNC, isApproved }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
