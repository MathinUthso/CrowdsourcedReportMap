const jwt = require('jsonwebtoken')
const { jwtSecret } = require('../settings')
const mysql = require('mysql2/promise')
const { dbUser, dbName, dbPassword, dbPort, dbHost } = require('../settings')

const pool = mysql.createPool({
  user: dbUser,
  database: dbName,
  password: dbPassword,
  port: dbPort,
  host: dbHost,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, jwtSecret)
    
    // Get user from database
    const [users] = await pool.execute(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    )
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    
    req.user = users[0]
    next()
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' })
  }
}

// Middleware to check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    
    next()
  }
}

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    req.user = null
    return next()
  }

  try {
    const decoded = jwt.verify(token, jwtSecret)
    
    const [users] = await pool.execute(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    )
    
    req.user = users.length > 0 ? users[0] : null
    next()
  } catch (error) {
    req.user = null
    next()
  }
}

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth
} 