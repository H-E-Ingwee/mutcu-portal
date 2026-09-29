const { verifyToken } = require('../lib/jwt')
const prisma = require('../lib/prisma')

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
      return res.status(401).json({ error: 'Invalid token: ' + jwtErr.message })
    }

    // Prisma findUnique — uses connection pool efficiently
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    })

    if (!user) return res.status(401).json({ error: 'User not found' })
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' })

    req.user = user
    next()
  } catch (err) {
    console.error('Auth middleware error:', err.message)
    return res.status(401).json({ error: 'Authentication failed' })
  }
}

// requireRole checks BOTH primary role and secondary_role (dual roles support)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
    const primaryMatch = roles.includes(req.user.role)
    const secondaryMatch = req.user.secondary_role && roles.includes(req.user.secondary_role)
    if (!primaryMatch && !secondaryMatch) {
      return res.status(403).json({
        error: `Required role: ${roles.join(' or ')}. Your role: ${req.user.role}${req.user.secondary_role ? ' + ' + req.user.secondary_role : ''}`
      })
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
