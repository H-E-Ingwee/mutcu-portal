const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET || 'mutcu_jwt_secret_2026_CHANGE_THIS_IN_PRODUCTION_NOW'

console.log('JWT Secret loaded:', SECRET ? SECRET.substring(0, 10) + '...' : 'MISSING!')

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
}

function verifyToken(token) {
  return jwt.verify(token, SECRET)
}

module.exports = { signToken, verifyToken }
