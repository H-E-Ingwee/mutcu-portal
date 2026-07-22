const { verifyToken } = require('../lib/jwt')
const supabase = require('../lib/supabase')

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization
    
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }
    
    const token = header.split(' ')[1]
    
    let decoded
    try {
      decoded = verifyToken(token)
    } catch (jwtErr) {
      console.error('JWT verify failed:', jwtErr.message, 'Token prefix:', token.substring(0, 20))
      return res.status(401).json({ error: 'Invalid token: ' + jwtErr.message })
    }
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single()
    
    if (error || !user) {
      console.error('User not found for id:', decoded.id, error?.message)
      return res.status(401).json({ error: 'User not found' })
    }
    
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account deactivated' })
    }
    
    req.user = user
    next()
  } catch (err) {
    console.error('Auth middleware error:', err.message)
    return res.status(401).json({ error: 'Authentication failed' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Required role: ${roles.join(' or ')}. Your role: ${req.user.role}` })
    }
    next()
  }
}

function requireApproved(req, res, next) {
  if (req.user.enrollment_status !== 'active') {
    return res.status(403).json({ error: 'Account pending approval' })
  }
  next()
}

module.exports = { authenticate, requireRole, requireApproved }
