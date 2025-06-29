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

// GET /stats/homepage - Get homepage statistics
const getHomepageStats = async (req, res) => {
  try {
    // Get reports today
    const [reportsToday] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM reports
      WHERE DATE(created_at) = CURDATE()
    `)

    // Get active users (users who have logged in or created reports in last 7 days)
    const [activeUsers] = await pool.execute(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      WHERE u.is_active = TRUE
      AND (
        EXISTS (
          SELECT 1 FROM reports r 
          WHERE r.user_id = u.id 
          AND r.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        )
        OR EXISTS (
          SELECT 1 FROM audit_log al 
          WHERE al.user_id = u.id 
          AND al.action = 'LOGIN'
          AND al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        )
      )
    `)

    // Get cities covered (distinct cities from reports)
    const [citiesCovered] = await pool.execute(`
      SELECT COUNT(DISTINCT 
        CASE 
          WHEN r.title LIKE '%Dhaka%' OR r.description LIKE '%Dhaka%' THEN 'Dhaka'
          WHEN r.title LIKE '%Chittagong%' OR r.description LIKE '%Chittagong%' THEN 'Chittagong'
          WHEN r.title LIKE '%Sylhet%' OR r.description LIKE '%Sylhet%' THEN 'Sylhet'
          WHEN r.title LIKE '%Rajshahi%' OR r.description LIKE '%Rajshahi%' THEN 'Rajshahi'
          WHEN r.title LIKE '%Khulna%' OR r.description LIKE '%Khulna%' THEN 'Khulna'
          WHEN r.title LIKE '%Barisal%' OR r.description LIKE '%Barisal%' THEN 'Barisal'
          WHEN r.title LIKE '%Rangpur%' OR r.description LIKE '%Rangpur%' THEN 'Rangpur'
          WHEN r.title LIKE '%Mymensingh%' OR r.description LIKE '%Mymensingh%' THEN 'Mymensingh'
          ELSE 'Other'
        END
      ) as count
      FROM reports r
      WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `)

    // Get total reports
    const [totalReports] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM reports
    `)

    // Get total users
    const [totalUsers] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM users
      WHERE is_active = TRUE
    `)

    res.json({
      success: true,
      stats: {
        reports_today: reportsToday[0].count,
        active_users: activeUsers[0].count,
        cities_covered: citiesCovered[0].count,
        total_reports: totalReports[0].count,
        total_users: totalUsers[0].count
      }
    })
  } catch (error) {
    console.error('Get homepage stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /stats/dashboard - Get dashboard statistics (for authenticated users)
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id

    // Get user's reports
    const [userReports] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM reports
      WHERE user_id = ?
    `, [userId])

    // Get user's total points
    const [userPoints] = await pool.execute(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN rv.vote_type = 'upvote' THEN 10
          WHEN rv.vote_type = 'verify' THEN 15
          WHEN rv.vote_type = 'downvote' THEN -5
          WHEN rv.vote_type = 'dispute' THEN -3
          ELSE 0
        END
      ), 0) as total_points
      FROM reports r
      LEFT JOIN report_votes rv ON r.id = rv.report_id
      WHERE r.user_id = ?
    `, [userId])

    // Get user's comments
    const [userComments] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM report_comments
      WHERE user_id = ?
    `, [userId])

    // Get user's rank
    const [userRank] = await pool.execute(`
      SELECT rank_position
      FROM (
        SELECT 
          u.id,
          RANK() OVER (ORDER BY COALESCE(SUM(
            CASE 
              WHEN rv.vote_type = 'upvote' THEN 10
              WHEN rv.vote_type = 'verify' THEN 15
              WHEN rv.vote_type = 'downvote' THEN -5
              WHEN rv.vote_type = 'dispute' THEN -3
              ELSE 0
            END
          ), 0) DESC) as rank_position
        FROM users u
        LEFT JOIN reports r ON u.id = r.user_id
        LEFT JOIN report_votes rv ON r.id = rv.report_id
        WHERE u.is_active = TRUE
        GROUP BY u.id
      ) ranked_users
      WHERE id = ?
    `, [userId])

    res.json({
      success: true,
      stats: {
        total_reports: userReports[0].count,
        total_points: userPoints[0].total_points,
        total_comments: userComments[0].count,
        rank: userRank[0] ? userRank[0].rank_position : null
      }
    })
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  getHomepageStats,
  getDashboardStats
} 