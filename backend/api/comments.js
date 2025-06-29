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

// POST /reports/:id/comments - Add a comment to a report
const addComment = async (req, res) => {
  try {
    const { id } = req.params
    const { content, parent_id } = req.body
    const userId = req.user.id
    const ipAddress = req.ip

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' })
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment too long (max 1000 characters)' })
    }

    // Check if report exists
    const [reports] = await pool.execute('SELECT id FROM reports WHERE id = ?', [id])
    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' })
    }

    // Check if parent comment exists (for nested comments)
    if (parent_id) {
      const [parentComments] = await pool.execute(
        'SELECT id FROM report_comments WHERE id = ? AND report_id = ?',
        [parent_id, id]
      )
      if (parentComments.length === 0) {
        return res.status(400).json({ error: 'Parent comment not found' })
      }
    }

    // Insert comment
    const [result] = await pool.execute(
      'INSERT INTO report_comments (report_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [id, userId, parent_id || null, content.trim()]
    )

    const commentId = result.insertId

    // Add points for commenting (2 points per comment)
    // We'll track this through the audit log and calculate in the leaderboard
    await logAudit(userId, 'COMMENT_POINTS', 'report_comments', commentId, null, {
      points_awarded: 2,
      reason: 'Comment added'
    }, ipAddress)

    // Log audit for comment creation
    await logAudit(userId, 'CREATE', 'report_comments', commentId, null, {
      report_id: id,
      parent_id,
      content: content.trim()
    }, ipAddress)

    res.status(201).json({
      message: 'Comment added successfully',
      comment_id: commentId,
      points_awarded: 2
    })
  } catch (error) {
    console.error('Add comment error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /reports/:id/comments - Get comments for a report
const getComments = async (req, res) => {
  try {
    const { id } = req.params

    // Check if report exists
    const [reports] = await pool.execute('SELECT id FROM reports WHERE id = ?', [id])
    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' })
    }

    // Get comments with user information
    const [comments] = await pool.execute(`
      SELECT 
        rc.*,
        u.username
      FROM report_comments rc
      LEFT JOIN users u ON rc.user_id = u.id
      WHERE rc.report_id = ?
      ORDER BY rc.created_at ASC
    `, [id])

    res.json({ comments })
  } catch (error) {
    console.error('Get comments error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// PUT /comments/:id - Update a comment
const updateComment = async (req, res) => {
  try {
    const { id } = req.params
    const { content } = req.body
    const userId = req.user.id
    const ipAddress = req.ip

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' })
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment too long (max 1000 characters)' })
    }

    // Get current comment
    const [comments] = await pool.execute(
      'SELECT * FROM report_comments WHERE id = ? AND user_id = ?',
      [id, userId]
    )

    if (comments.length === 0) {
      return res.status(404).json({ error: 'Comment not found or access denied' })
    }

    const oldValues = { content: comments[0].content }

    // Update comment
    await pool.execute(
      'UPDATE report_comments SET content = ?, is_edited = TRUE WHERE id = ?',
      [content.trim(), id]
    )

    // Log audit
    await logAudit(userId, 'UPDATE', 'report_comments', id, oldValues, { content: content.trim() }, ipAddress)

    res.json({ message: 'Comment updated successfully' })
  } catch (error) {
    console.error('Update comment error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// DELETE /comments/:id - Delete a comment
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const ipAddress = req.ip

    // Get current comment
    const [comments] = await pool.execute(
      'SELECT * FROM report_comments WHERE id = ? AND user_id = ?',
      [id, userId]
    )

    if (comments.length === 0) {
      return res.status(404).json({ error: 'Comment not found or access denied' })
    }

    // Delete comment (cascade will handle child comments)
    await pool.execute('DELETE FROM report_comments WHERE id = ?', [id])

    // Log audit
    await logAudit(userId, 'DELETE', 'report_comments', id, { content: comments[0].content }, null, ipAddress)

    res.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Delete comment error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  addComment,
  getComments,
  updateComment,
  deleteComment
} 