const {
  dbUser,
  dbName,
  dbPassword,
  dbPort,
  dbHost,
} = require('../settings')
const mysql = require('mysql2/promise')

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

// (GET) Returns all the meta data / settings that might be required by frontends.
// Example: http://localhost:3000/metadata
const getMetadata = async (request, response) => {
  try {
    const returnedData = {}

    // Get report types from database
    const [reportTypes] = await pool.execute(
      'SELECT id, name, description, color, icon FROM report_types WHERE is_active = TRUE ORDER BY name'
    )
    returnedData.reportTypes = reportTypes

    // Get locations from database
    const [locations] = await pool.execute(
      'SELECT id, name, description, country, region FROM locations WHERE is_active = TRUE ORDER BY name'
    )
    returnedData.locations = locations

    // Get time-series data for reports
    const query = `
      WITH RECURSIVE timestamps AS (
        SELECT DATE_SUB(NOW(), INTERVAL 14 DAY) as hour
        UNION ALL
        SELECT DATE_ADD(hour, INTERVAL 1 HOUR)
        FROM timestamps
        WHERE hour < NOW()
      )
      SELECT
        hour,
        COUNT(*) AS valid_reports
      FROM reports r, timestamps
      WHERE
        r.valid_from <= hour AND r.valid_until >= hour
        AND r.status = 'verified'
      GROUP BY hour
      ORDER BY hour ASC
    `
    
    const [timeSeriesResults] = await pool.execute(query)
    returnedData.validReportsInTime = timeSeriesResults

    // Get statistics
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified_reports,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reports,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_reports,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as reports_last_24h
      FROM reports
    `)
    returnedData.statistics = stats[0]

    // Get report counts by type
    const [typeStats] = await pool.execute(`
      SELECT 
        rt.name as type_name,
        rt.color,
        COUNT(r.id) as count,
        COUNT(CASE WHEN r.status = 'verified' THEN 1 END) as verified_count
      FROM report_types rt
      LEFT JOIN reports r ON rt.id = r.type_id
      WHERE rt.is_active = TRUE
      GROUP BY rt.id, rt.name, rt.color
      ORDER BY count DESC
    `)
    returnedData.typeStatistics = typeStats

    response.status(200).json(returnedData)
  } catch (error) {
    console.error('Database error:', error)
    response.status(500).json({ error: 'Database error' })
  }
}

// GET /metadata/report-types - Get all report types
const getReportTypes = async (request, response) => {
  try {
    const [reportTypes] = await pool.execute(
      'SELECT id, name, description, color, icon, is_active FROM report_types ORDER BY name'
    )
    response.status(200).json({ reportTypes })
  } catch (error) {
    console.error('Database error:', error)
    response.status(500).json({ error: 'Database error' })
  }
}

// GET /metadata/locations - Get all locations
const getLocations = async (request, response) => {
  try {
    const [locations] = await pool.execute(
      'SELECT id, name, description, country, region, is_active FROM locations ORDER BY name'
    )
    response.status(200).json({ locations })
  } catch (error) {
    console.error('Database error:', error)
    response.status(500).json({ error: 'Database error' })
  }
}

module.exports = {
  getMetadata,
  getReportTypes,
  getLocations
}
