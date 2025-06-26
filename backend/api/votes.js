const mysql                                          = require('mysql2/promise')
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

// POST /reports/:id/vote - Vote on a report
const voteOnReport = async (req, res) => {
  try {
    const { id } = req.params
    const { vote_type, comment } = req.body
    const userId = req.user.id
    const ipAddress = req.ip

    // Validation
    const validVoteTypes = ['upvote', 'downvote', 'verify', 'dispute']
    if (!validVoteTypes.includes(vote_type)) {
      return res.status(400).json({ error: 'Invalid vote type' })
    }

    if (comment && comment.length > 500) {
      return res.status(400).json({ error: 'Comment too long (max 500 characters)' })
    }

    // Check if report exists
    const [reports] = await pool.execute('SELECT id FROM reports WHERE id = ?', [id])
    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' })
    }

    // Check if user already voted on this report
    const [existingVotes] = await pool.execute(
      'SELECT id, vote_type FROM report_votes WHERE report_id = ? AND user_id = ?',
      [id, userId]
    )

    if (existingVotes.length > 0) {
      // Update existing vote
      const oldValues = { vote_type: existingVotes[0].vote_type }
      
      await pool.execute(
        'UPDATE report_votes SET vote_type = ?, comment = ?, created_at = NOW() WHERE id = ?',
        [vote_type, comment || null, existingVotes[0].id]
      )

      // Log audit
      await logAudit(userId, 'UPDATE_VOTE', 'report_votes', existingVotes[0].id, oldValues, { vote_type, comment }, ipAddress)
    } else {
      // Create new vote
      const [result] = await pool.execute(
        'INSERT INTO report_votes (report_id, user_id, vote_type, comment) VALUES (?, ?, ?, ?)',
        [id, userId, vote_type, comment || null]
      )

      const voteId = result.insertId

      // Log audit
      await logAudit(userId, 'CREATE_VOTE', 'report_votes', voteId, null, {
        report_id: id,
        vote_type,
        comment
      }, ipAddress)
    }

    res.json({ message: 'Vote recorded successfully' })
  } catch (error) {
    console.error('Vote error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /reports/:id/votes - Get votes for a report
const getVotes = async (req, res) => {
  try {
    const { id } = req.params

    // Check if report exists
    const [reports] = await pool.execute('SELECT id FROM reports WHERE id = ?', [id])
    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' })
    }

    // Get votes with user information
    const [votes] = await pool.execute(`
      SELECT 
        rv.*,
        u.username
      FROM report_votes rv
      LEFT JOIN users u ON rv.user_id = u.id
      WHERE rv.report_id = ?
      ORDER BY rv.created_at DESC
    `, [id])

    // Get vote summary
    const [voteSummary] = await pool.execute(`
      SELECT 
        vote_type,
        COUNT(*) as count
      FROM report_votes
      WHERE report_id = ?
      GROUP BY vote_type
    `, [id])

    res.json({ 
      votes,
      summary: voteSummary
    })
  } catch (error) {
    console.error('Get votes error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// DELETE /votes/:id - Remove a vote (user can only remove their own vote)
const removeVote = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const ipAddress = req.ip

    // Get current vote
    const [votes] = await pool.execute(
      'SELECT * FROM report_votes WHERE id = ? AND user_id = ?',
      [id, userId]
    )

    if (votes.length === 0) {
      return res.status(404).json({ error: 'Vote not found or access denied' })
    }

    const oldValues = { vote_type: votes[0].vote_type, comment: votes[0].comment }

    // Delete vote
    await pool.execute('DELETE FROM report_votes WHERE id = ?', [id])

    // Log audit
    await logAudit(userId, 'DELETE_VOTE', 'report_votes', id, oldValues, null, ipAddress)

    res.json({ message: 'Vote removed successfully' })
  } catch (error) {
    console.error('Remove vote error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /votes/summary - Get voting summary for all reports
const getVotingSummary = async (req, res) => {
  try {
    const [summary] = await pool.execute(`
      SELECT 
        r.id,
        r.title,
        rt.name as type_name,
        COUNT(rv.id) as total_votes,
        COUNT(CASE WHEN rv.vote_type = 'upvote' THEN 1 END) as upvotes,
        COUNT(CASE WHEN rv.vote_type = 'downvote' THEN 1 END) as downvotes,
        COUNT(CASE WHEN rv.vote_type = 'verify' THEN 1 END) as verifications,
        COUNT(CASE WHEN rv.vote_type = 'dispute' THEN 1 END) as disputes
      FROM reports r
      LEFT JOIN report_types rt ON r.type_id = rt.id
      LEFT JOIN report_votes rv ON r.id = rv.report_id
      GROUP BY r.id, r.title, rt.name
      ORDER BY total_votes DESC
      LIMIT 50
    `)

    res.json({ summary })
  } catch (error) {
    console.error('Get voting summary error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  voteOnReport,
  getVotes,
  removeVote,
  getVotingSummary
} 