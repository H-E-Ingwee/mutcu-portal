require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const app = express()
const PORT = process.env.PORT || 5000

// CORS - allow all Vercel deployments + custom domain
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://mutcu-portal.vercel.app',
  'https://portal.mutcu.org',
  // Allow any vercel.app subdomain for preview deployments
]

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    // Allow any vercel.app domain
    if (origin.endsWith('.vercel.app')) return callback(null, true)
    // Check allowed list
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

// Handle preflight requests
app.options('*', cors())

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 })
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 })
app.use('/api/', limiter)
app.use('/api/auth/', authLimiter)

// Routes
app.use('/api/auth',          require('./routes/auth'))
app.use('/api/users',         require('./routes/users'))
app.use('/api/members',       require('./routes/members'))
app.use('/api/ministries',    require('./routes/ministries'))
app.use('/api/positions',     require('./routes/positions'))
app.use('/api/cycles',        require('./routes/cycles'))
app.use('/api/nominations',   require('./routes/nominations'))
app.use('/api/nc',            require('./routes/nc'))
app.use('/api/admin',         require('./routes/admin'))
app.use('/api/analytics',     require('./routes/analytics'))
app.use('/api/upload',        require('./routes/upload'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/messages',      require('./routes/messages'))
app.use('/api/announcements', require('./routes/announcements'))
app.use('/api/leadership',    require('./routes/leadership'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'MUTCU DMS API', version: '2.1.0' })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`MUTCU DMS API v2.1 running on port ${PORT}`)
})

module.exports = app
