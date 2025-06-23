const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const mysql = require('mysql2/promise')
const { 
  dbUser, 
  dbName, 
  dbPassword, 
  dbPort, 
  dbHost, 
  jwtSecret, 
  jwtExpiresIn, 
  bcryptRounds 
} = require('../settings')

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

// Helper function to log audit events
const logAudit = async (userId, action, tableName, recordId, oldValues = null, newValues = null, ipAddress = null) => {
  try {
    await pool.execute(
      'INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, action, tableName, recordId, JSON.stringify(oldValues), JSON.stringify(newValues), ipAddress]
    )
  } catch (error) {
    console.error('Audit log error:', error)
  }
}

// POST /auth/register - User registration
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body
    const ipAddress = req.ip

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    )

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, bcryptRounds)

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'user']
    )

    const userId = result.insertId

    // Log audit
    await logAudit(userId, 'CREATE', 'users', userId, null, { username, email, role: 'user' }, ipAddress)

    // Generate JWT token
    const token = jwt.sign({ userId }, jwtSecret, { expiresIn: jwtExpiresIn })

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        username,
        email,
        role: 'user'
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// POST /auth/login - User login
const login = async (req, res) => {
  try {
    const { username, password } = req.body
    const ipAddress = req.ip

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    // Get user
    const [users] = await pool.execute(
      'SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = ? OR email = ?',
      [username, username]
    )

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = users[0]

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: jwtExpiresIn })

    // Log audit
    await logAudit(user.id, 'LOGIN', 'users', user.id, null, null, ipAddress)

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /auth/profile - Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id

    const [users] = await pool.execute(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [userId]
    )

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user: users[0] })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// PUT /auth/profile - Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id
    const { email } = req.body
    const ipAddress = req.ip

    // Get current user data
    const [currentUsers] = await pool.execute(
      'SELECT email FROM users WHERE id = ?',
      [userId]
    )

    if (currentUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const oldValues = { email: currentUsers[0].email }

    // Update email if provided
    if (email && email !== currentUsers[0].email) {
      // Check if email is already taken
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      )

      if (existingUsers.length > 0) {
        return res.status(409).json({ error: 'Email already exists' })
      }

      await pool.execute(
        'UPDATE users SET email = ? WHERE id = ?',
        [email, userId]
      )

      // Log audit
      await logAudit(userId, 'UPDATE', 'users', userId, oldValues, { email }, ipAddress)
    }

    res.json({ message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /users - Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    )

    res.json({ users })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// PUT /users/:id/status - Update user status (admin only)
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { is_active } = req.body
    const adminId = req.user.id
    const ipAddress = req.ip

    // Get current user data
    const [currentUsers] = await pool.execute(
      'SELECT is_active FROM users WHERE id = ?',
      [id]
    )

    if (currentUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const oldValues = { is_active: currentUsers[0].is_active }

    // Update status
    await pool.execute(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [is_active, id]
    )

    // Log audit
    await logAudit(adminId, 'UPDATE_STATUS', 'users', id, oldValues, { is_active }, ipAddress)

    res.json({ message: 'User status updated successfully' })
  } catch (error) {
    console.error('Update user status error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  getAllUsers,
  updateUserStatus
} 