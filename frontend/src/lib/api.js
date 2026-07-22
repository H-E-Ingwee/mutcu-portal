import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

console.log('API URL:', API_URL)

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

// Attach token to EVERY request
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('mutcu_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    console.log('API REQUEST:', config.method?.toUpperCase(), config.url, 'Token:', token ? 'YES' : 'NO')
    return config
  },
  error => Promise.reject(error)
)

// Handle responses
api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || ''
    const status = err.response?.status
    console.log('API ERROR:', status, url)
    
    // Only redirect on 401 for non-auth endpoints
    if (status === 401 && !url.includes('/auth/')) {
      localStorage.removeItem('mutcu_token')
      localStorage.removeItem('mutcu_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
