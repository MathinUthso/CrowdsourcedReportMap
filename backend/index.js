const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser')
const path = require('path')

// Import API modules
const reports = require('./api/reports')
const metadata = require('./api/metadata')
const users = require('./api/users')
const comments = require('./api/comments')
const votes = require('./api/votes')
const stats = require('./api/stats')

// Import middleware
const { authenticateToken, requireRole, optionalAuth } = require('./middleware/auth')

// Import settings
const { listenPort, rateLimitWindowMs, rateLimitMax, uploadPath } = require('./settings')

// Serve static files FIRST
const app = express()
app.use(express.static(path.join(__dirname, '../frontend-web')))

// Redirect root to homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend-web/redirect.html'))
})

// Security middleware
app.use(helmet())

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}))

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }))

// File upload middleware
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'temp_uploads') // Use local temp directory
}))

// Create upload directory if it doesn't exist
const fs = require('fs')
try {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true })
    console.log(`✅ Created upload directory: ${uploadPath}`)
  }
} catch (error) {
  console.error(`❌ Failed to create upload directory: ${error.message}`)
  console.log('💡 Make sure you have write permissions in the backend directory')
}

// API Routes

// Authentication routes (no auth required)
app.post('/auth/register', users.register)
app.post('/auth/login', users.login)

// Stats routes (no auth required for homepage stats)
app.get('/stats/homepage', stats.getHomepageStats)
app.get('/users/leaderboard', users.getLeaderboard)

// Dashboard stats (auth required)
app.use('/stats/dashboard', authenticateToken)
app.get('/stats/dashboard', stats.getDashboardStats)

// Metadata routes (no auth required)
app.get('/metadata', metadata.getMetadata)
app.get('/metadata/report-types', metadata.getReportTypes)
app.get('/metadata/locations', metadata.getLocations)

// Reports routes (optional auth for viewing, auth required for creating)
app.get('/reports', optionalAuth, reports.getReportsInBoundingBox)
app.post('/reports', authenticateToken, reports.createReport)
app.get('/reports/:id', optionalAuth, reports.getReport)

// Protected routes (authentication required)
app.use('/auth/profile', authenticateToken)
app.get('/auth/profile', users.getProfile)
app.put('/auth/profile', users.updateProfile)

// Comments routes (auth required)
app.use('/reports/:id/comments', authenticateToken)
app.post('/reports/:id/comments', comments.addComment)
app.get('/reports/:id/comments', comments.getComments)

app.use('/comments/:id', authenticateToken)
app.put('/comments/:id', comments.updateComment)
app.delete('/comments/:id', comments.deleteComment)

// Votes routes (auth required)
app.use('/reports/:id/vote', authenticateToken)
app.post('/reports/:id/vote', votes.voteOnReport)
app.get('/reports/:id/votes', votes.getVotes)

app.use('/votes/:id', authenticateToken)
app.delete('/votes/:id', votes.removeVote)

app.get('/votes/summary', votes.getVotingSummary)

// Admin routes (admin/moderator role required)
app.use('/users', authenticateToken, requireRole(['admin']))
app.get('/users', users.getAllUsers)
app.put('/users/:id/status', users.updateUserStatus)

// Moderator routes (moderator/admin role required)
app.use('/reports/:id/status', authenticateToken, requireRole(['admin', 'moderator']))
app.put('/reports/:id/status', reports.updateReportStatus)

// User's own reports management (auth required)
app.use('/my-reports', authenticateToken)
app.get('/my-reports', reports.getMyReports)
app.use('/reports/:id', authenticateToken)
app.delete('/reports/:id', reports.deleteReport)
app.put('/reports/:id', reports.editReport)

// Serve static files
app.use('/uploads', express.static(uploadPath))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Set CORP header for all resources
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

// Create server with error handling
const server = app.listen(listenPort, () => {
  console.log(`Enhanced Crowdsourced GeoTracker running on port ${listenPort}`)
  console.log(`- Database: MySQL with enhanced schema`)
  console.log(`- Authentication: JWT-based`)
  console.log(`- Rate limiting: ${rateLimitMax} requests per ${rateLimitWindowMs/1000/60} minutes`)
  console.log(`- File uploads: ${uploadPath}`)
  console.log(`- Health check: http://localhost:${listenPort}/health`)
})

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${listenPort} is already in use!`)
    console.log('💡 Try these solutions:')
    console.log(`   1. Stop any other application using port ${listenPort}`)
    console.log(`   2. Change the port in settings.js`)
    console.log(`   3. Kill the process: netstat -ano | findstr :${listenPort}`)
  } else {
    console.error('❌ Server error:', error.message)
  }
  process.exit(1)
})

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...')
  server.close(() => {
    console.log('✅ Server stopped')
    process.exit(0)
  })
})
