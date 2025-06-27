const {
  dbUser,
  dbName,
  dbPassword,
  dbPort,
  dbHost,
  maximumImageUploadSizeMB,
  skipImageProcessing,
  uploadPath
} = require('../settings')
const moment = require('moment')
const sharp = require('sharp');
const fs = require('fs')
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

function getRandomFilename() {
    var result           = ''
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    var charactersLength = characters.length
    for ( var i = 0; i < 24; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
   }
   return result + '.png'
}

// (GET) Returns all the reports from the specified bounding box.
// Example: http://localhost:3000/reports?latmin=46.278977050642126&lonmin=25.19668223803358&latmax=51.515386508021386&lonmax=41.30651925297246&img=THUMBNAIL&time=1646312461
// Parameters:
//   - latmin, lonmin, latmax, lonmax: Latitude-Longitude definition of the bounding box from which we're getting the reports. Accepts float numbers. (required)
//   - time: Point in time that we're looking at in UNIX timestamp format = number of seconds that have elapsed since January 1, 1970 midnight (required)
//   - img: Size of the image to return with the reports. Accepts 'THUMB', 'FULL' or undefined. If not defined, no image is returned. (optional)
//   - status: Filter by report status (pending, verified, rejected, expired) (optional)
//   - type_id: Filter by report type ID (optional)
const getReportsInBoundingBox = async (request, response) => {
  try {
    let columns = `
      r.id, ST_Y(r.coordinates) AS lat, ST_X(r.coordinates) as lon, 
      r.title, r.description, r.valid_from, r.valid_until, r.status, r.confidence_level,
      r.media_url, r.source_url,
      rt.name as type_name, rt.color as type_color,
      u.username as reporter_username,
      COUNT(DISTINCT rv.id) as vote_count,
      COUNT(DISTINCT rc.id) as comment_count
    `
    
    if (!request.query.latmin || request.query.latmin.toString() !== parseFloat(request.query.latmin).toString()) throw new Error('Incorrect input: latmin (supported: float)')
    if (!request.query.latmax || request.query.latmax.toString() !== parseFloat(request.query.latmax).toString()) throw new Error('Incorrect input: latmax (supported: float)')
    if (!request.query.lonmin || request.query.lonmin.toString() !== parseFloat(request.query.lonmin).toString()) throw new Error('Incorrect input: lonmin (supported: float)')
    if (!request.query.lonmax || request.query.lonmax.toString() !== parseFloat(request.query.lonmax).toString()) throw new Error('Incorrect input: lonmax (supported: float)')
    // Only require 'time' if show_all is not set to '1'
    if (request.query.show_all !== '1') {
      if (!request.query.time || request.query.time.toString() !== parseInt(request.query.time).toString()) throw new Error('Incorrect input: time (supported: integer)')
    }

    let whereClause = '';
    if (request.query.show_all === '1') {
      whereClause = `
        WHERE ST_Contains(ST_GeomFromText('POLYGON((${request.query.lonmin} ${request.query.latmin}, ${request.query.lonmax} ${request.query.latmin}, ${request.query.lonmax} ${request.query.latmax}, ${request.query.lonmin} ${request.query.latmax}, ${request.query.lonmin} ${request.query.latmin}))', 4326), r.coordinates)
      `;
    } else {
      whereClause = `
        WHERE ST_Contains(ST_GeomFromText('POLYGON((${request.query.lonmin} ${request.query.latmin}, ${request.query.lonmax} ${request.query.latmin}, ${request.query.lonmax} ${request.query.latmax}, ${request.query.lonmin} ${request.query.latmax}, ${request.query.lonmin} ${request.query.latmin}))', 4326), r.coordinates)
        AND r.valid_from <= FROM_UNIXTIME(${request.query.time})
        AND r.valid_until >= FROM_UNIXTIME(${request.query.time})
      `;
    }

    // Add status filter if provided
    if (request.query.status) {
      whereClause += ` AND r.status = ?`
    }

    // Add type filter if provided
    if (request.query.type_id) {
      whereClause += ` AND r.type_id = ?`
    }

    const params = []
    if (request.query.status) {
      params.push(request.query.status)
    }
    if (request.query.type_id) {
      params.push(parseInt(request.query.type_id))
    }

    const query = `
      SELECT ${columns}
      FROM reports r
      LEFT JOIN report_types rt ON r.type_id = rt.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN report_votes rv ON r.id = rv.report_id
      LEFT JOIN report_comments rc ON r.id = rc.report_id
      ${whereClause}
      GROUP BY r.id, rt.name, rt.color, u.username
      ORDER BY r.created_at DESC
    `

    const [results] = await pool.execute(query, params)
    response.status(200).json(results)
  } catch (error) {
    console.error('Database error:', error)
    response.status(500).json({ error: 'Database error' })
  }
}

// (POST) Adds a new report to DB.
// Example: http://localhost:3000/reports   ---   lat: 49.71422916693619, lon: 26.66829512680357, type_id: 1, validfrom: 1646312461, validuntil: 1646316061
const createReport = async (request, response) => {
  try {
    const userId = request.user ? request.user.id : null
    const requestIP = request.ip
    // Accept mediaurl from either body or files (for form-data)
    const { lat, lon, type_id, location_id, title, description, validfrom, validuntil, confidence_level, source_url } = request.body
    let mediaurl = request.body.mediaurl || null

    // check the user input
    if (!lon || lon.toString() !== parseFloat(lon).toString()) throw new Error('Incorrect input: lon (supported: float)')
    if (!lat || lat.toString() !== parseFloat(lat).toString()) throw new Error('Incorrect input: lat (supported: float)')
    if (!type_id || type_id.toString() !== parseInt(type_id).toString()) throw new Error('Incorrect input: type_id (supported: integer)')
    if (validfrom && validfrom.toString() !== parseInt(validfrom).toString()) throw new Error('Incorrect input: validfrom (supported: int)')
    if (validuntil && validuntil.toString() !== parseInt(validuntil).toString()) throw new Error('Incorrect input: validuntil (supported: int)')

    // Verify type_id exists
    const [types] = await pool.execute('SELECT id FROM report_types WHERE id = ? AND is_active = TRUE', [type_id])
    if (types.length === 0) {
      return response.status(400).json({ error: 'Invalid report type' })
    }

    // compute the validity times
    const currentTimeStamp = parseInt(moment().format('X'))
    const validFromSQL = parseInt(validfrom) || currentTimeStamp
    const validUntilSQL = parseInt(validuntil) || (
        validFromSQL !== currentTimeStamp
          ? validFromSQL + (3600 * 3) // default validity, if not specified, is 3 hours
          : currentTimeStamp + (3600 * 3) // default validity, if not specified, is 3 hours
      )

    // process the uploaded image if it exists
    let mediaUrlSQL = null
    if (request.files && request.files.mediafile && request.files.mediafile.size && request.files.mediafile.size <= (1024000 * maximumImageUploadSizeMB)) {
      const randomFileNameBeforeProcessing = '___' + getRandomFilename()
      const randomFileNameFinal = getRandomFilename()

      if (skipImageProcessing) {
        await request.files.mediafile.mv(uploadPath + '/' + randomFileNameFinal)
        mediaUrlSQL = uploadPath + '/' + randomFileNameFinal
      } else {
        await request.files.mediafile.mv(uploadPath + '/' + randomFileNameBeforeProcessing)
        let fileIsValid = true

        // process the image using 'sharp' library
        const f = await sharp(uploadPath + '/' + randomFileNameBeforeProcessing)

        // check format, resize, convert to PNG, save using 'sharp' library
        try {
          const meta = await f.metadata()
          if (!['jpeg', 'png', 'webp'].includes(meta.format)) fileIsValid = false
        } catch (e) {
          fileIsValid = false
        }
        if (fileIsValid) {
          await f.resize(1000, 1000, { fit: sharp.fit.inside, withoutEnlargement: true })
            .toFormat('png')
            .toFile(uploadPath + '/' + randomFileNameFinal)

          // save its filename to DB
          mediaUrlSQL = uploadPath + '/' + randomFileNameFinal
        }

        // delete temporary file
        fs.unlink(uploadPath + '/' + randomFileNameBeforeProcessing, () => {})
      }
    }

    // If no file uploaded, but mediaurl is provided, store it in source_url
    let sourceUrlSQL = source_url || null
    if (!mediaUrlSQL && mediaurl) {
      sourceUrlSQL = mediaurl
    }

    // prepare the INSERT query
    const query = `
      INSERT INTO reports (user_id, type_id, location_id, coordinates, title, description, valid_from, valid_until, confidence_level, status, media_url, source_url, ip_address)
      VALUES (
        ?,
        ?,
        ?,
        ST_GeomFromText('POINT(${parseFloat(lon)} ${parseFloat(lat)})', 4326),
        ?,
        ?,
        FROM_UNIXTIME(?),
        FROM_UNIXTIME(?),
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `

    // execute the INSERT query
    const [result] = await pool.execute(query, [
      userId, 
      type_id, 
      location_id || null, 
      title || null, 
      description || null, 
      validFromSQL, 
      validUntilSQL, 
      confidence_level || 'medium',
      'pending',
      mediaUrlSQL,
      sourceUrlSQL,
      requestIP
    ])

    const reportId = result.insertId

    // Log audit
    if (userId) {
      await logAudit(userId, 'CREATE', 'reports', reportId, null, {
        type_id, location_id, lat, lon, title, description, confidence_level
      }, requestIP)
    }

    response.status(201).json({ 
      message: 'Report added successfully',
      report_id: reportId
    })
  } catch (error) {
    console.error('Database error:', error)
    response.status(500).json({ error: 'Database error' })
  }
}

// GET /reports/:id - Get a specific report with details
const getReport = async (request, response) => {
  try {
    const { id } = request.params

    const [reports] = await pool.execute(`
      SELECT 
        r.*,
        rt.name as type_name, rt.color as type_color,
        u.username as reporter_username,
        l.name as location_name,
        ST_Y(r.coordinates) AS lat, ST_X(r.coordinates) as lon
      FROM reports r
      LEFT JOIN report_types rt ON r.type_id = rt.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN locations l ON r.location_id = l.id
      WHERE r.id = ?
    `, [id])

    if (reports.length === 0) {
      return response.status(404).json({ error: 'Report not found' })
    }

    // Get votes for this report
    const [votes] = await pool.execute(`
      SELECT 
        rv.*,
        u.username
      FROM report_votes rv
      LEFT JOIN users u ON rv.user_id = u.id
      WHERE rv.report_id = ?
      ORDER BY rv.created_at DESC
    `, [id])

    // Get comments for this report
    const [comments] = await pool.execute(`
      SELECT 
        rc.*,
        u.username
      FROM report_comments rc
      LEFT JOIN users u ON rc.user_id = u.id
      WHERE rc.report_id = ?
      ORDER BY rc.created_at ASC
    `, [id])

    const report = reports[0]
    report.votes = votes
    report.comments = comments

    response.status(200).json({ report })
  } catch (error) {
    console.error('Database error:', error)
    response.status(500).json({ error: 'Database error' })
  }
}

// PUT /reports/:id/status - Update report status (moderator/admin only)
const updateReportStatus = async (request, response) => {
  try {
    const { id } = request.params
    const { status } = request.body
    const userId = request.user.id
    const ipAddress = request.ip

    // Validate status
    const validStatuses = ['pending', 'verified', 'rejected', 'expired']
    if (!validStatuses.includes(status)) {
      return response.status(400).json({ error: 'Invalid status' })
    }

    // Get current report data
    const [currentReports] = await pool.execute(
      'SELECT status FROM reports WHERE id = ?',
      [id]
    )

    if (currentReports.length === 0) {
      return response.status(404).json({ error: 'Report not found' })
    }

    const oldValues = { status: currentReports[0].status }

    // Update status
    await pool.execute(
      'UPDATE reports SET status = ? WHERE id = ?',
      [status, id]
    )

    // Log audit
    await logAudit(userId, 'UPDATE_STATUS', 'reports', id, oldValues, { status }, ipAddress)

    response.json({ message: 'Report status updated successfully' })
  } catch (error) {
    console.error('Database error:', error)
    response.status(500).json({ error: 'Database error' })
  }
}

// GET /my-reports - Get all reports created by the current user
const getMyReports = async (request, response) => {
  try {
    const userId = request.user && request.user.id;
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });
    const query = `
      SELECT 
        r.id, ST_Y(r.coordinates) AS lat, ST_X(r.coordinates) as lon, 
        r.title, r.description, r.valid_from, r.valid_until, r.status, r.confidence_level,
        r.media_url, r.source_url,
        rt.name as type_name, rt.color as type_color,
        r.created_at, r.updated_at
      FROM reports r
      LEFT JOIN report_types rt ON r.type_id = rt.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `;
    const [results] = await pool.execute(query, [userId]);
    response.status(200).json(results);
  } catch (error) {
    console.error('Database error:', error);
    response.status(500).json({ error: 'Database error' });
  }
};

// DELETE /reports/:id - Delete a report by ID (only if owner)
const deleteReport = async (request, response) => {
  try {
    const userId = request.user && request.user.id;
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });
    const { id } = request.params;
    // Check ownership
    const [reports] = await pool.execute('SELECT * FROM reports WHERE id = ?', [id]);
    if (reports.length === 0) return response.status(404).json({ error: 'Report not found' });
    if (reports[0].user_id !== userId) return response.status(403).json({ error: 'Forbidden: Not your report' });
    // Delete report
    await pool.execute('DELETE FROM reports WHERE id = ?', [id]);
    await logAudit(userId, 'DELETE', 'reports', id, reports[0], null, request.ip);
    response.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    response.status(500).json({ error: 'Database error' });
  }
};

// PUT /reports/:id - Edit a report (only if owner)
const editReport = async (request, response) => {
  try {
    const userId = request.user && request.user.id;
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });
    const { id } = request.params;
    const { title, description, type_id, confidence_level } = request.body;
    // Check ownership
    const [reports] = await pool.execute('SELECT * FROM reports WHERE id = ?', [id]);
    if (reports.length === 0) return response.status(404).json({ error: 'Report not found' });
    if (reports[0].user_id !== userId) return response.status(403).json({ error: 'Forbidden: Not your report' });
    let newMediaUrl = reports[0].media_url;
    // If a new image is uploaded, process it
    if (request.files && request.files.mediafile && request.files.mediafile.size && request.files.mediafile.size <= (1024000 * maximumImageUploadSizeMB)) {
      const randomFileNameBeforeProcessing = '___' + getRandomFilename();
      const randomFileNameFinal = getRandomFilename();
      if (skipImageProcessing) {
        await request.files.mediafile.mv(uploadPath + '/' + randomFileNameFinal);
        newMediaUrl = uploadPath + '/' + randomFileNameFinal;
      } else {
        await request.files.mediafile.mv(uploadPath + '/' + randomFileNameBeforeProcessing);
        let fileIsValid = true;
        // process the image using 'sharp' library
        const f = await sharp(uploadPath + '/' + randomFileNameBeforeProcessing);
        // check format, resize, convert to PNG, save using 'sharp' library
        try {
          const meta = await f.metadata();
          if (!['jpeg', 'png', 'webp'].includes(meta.format)) fileIsValid = false;
        } catch (e) {
          fileIsValid = false;
        }
        if (fileIsValid) {
          await f.resize(1000, 1000, { fit: sharp.fit.inside, withoutEnlargement: true })
            .toFormat('png')
            .toFile(uploadPath + '/' + randomFileNameFinal);
          newMediaUrl = uploadPath + '/' + randomFileNameFinal;
        }
        // delete temporary file
        fs.unlink(uploadPath + '/' + randomFileNameBeforeProcessing, () => {});
      }
      // Optionally, delete the old image file if it exists and is not null
      if (reports[0].media_url && fs.existsSync(reports[0].media_url)) {
        fs.unlink(reports[0].media_url, () => {});
      }
    }
    // Update report
    const oldValues = { ...reports[0] };
    await pool.execute(
      'UPDATE reports SET title = ?, description = ?, type_id = ?, confidence_level = ?, media_url = ?, updated_at = NOW() WHERE id = ?',
      [title || null, description || null, type_id || reports[0].type_id, confidence_level || reports[0].confidence_level, newMediaUrl, id]
    );
    await logAudit(userId, 'UPDATE', 'reports', id, oldValues, { title, description, type_id, confidence_level, media_url: newMediaUrl }, request.ip);
    response.json({ message: 'Report updated successfully' });
  } catch (error) {
    console.error('Edit report error:', error);
    response.status(500).json({ error: 'Database error' });
  }
};

module.exports = {
  getReportsInBoundingBox,
  createReport,
  getReport,
  updateReportStatus,
  getMyReports,
  deleteReport,
  editReport
}
