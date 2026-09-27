import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
  timeout: 20000, // 20 second timeout — handles Render cold starts
})

// ─── Attach token to every request ───────────────────────────────────────────
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('mutcu_token')
    if (token) config.headers['Authorization'] = `Bearer ${token}`
    return config
  },
  error => Promise.reject(error)
)

// ─── Response interceptor — friendly errors + smart logout ───────────────────
api.interceptors.response.use(
  res => res,
  async err => {
    const url = err.config?.url || ''
    const status = err.response?.status
    const code = err.response?.data?.code

    // Only redirect on 401 for non-auth endpoints AND not a server-busy situation
    if (status === 401 && !url.includes('/auth/') && code !== 'SERVER_BUSY') {
      localStorage.removeItem('mutcu_token')
      localStorage.removeItem('mutcu_user')
      window.location.href = '/login'
    }

    // Enhance error message for timeout / network errors
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      err.response = err.response || {}
      err.response.data = {
        error: 'The server is taking longer than usual. Please check your connection and try again.',
        code: 'TIMEOUT',
      }
    }

    if (!err.response && err.message === 'Network Error') {
      err.response = {
        data: {
          error: 'Unable to reach the server. Please check your internet connection and try again.',
          code: 'NETWORK_ERROR',
        },
        status: 0,
      }
    }

    return Promise.reject(err)
  }
)

export default api
