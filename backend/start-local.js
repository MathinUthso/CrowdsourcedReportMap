const mysql = require('mysql2/promise')
const { dbUser, dbName, dbPassword, dbPort, dbHost } = require('./settings')

async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...')
  
  // Check Node.js version
  const nodeVersion = process.version
  console.log(`✅ Node.js version: ${nodeVersion}`)
  
  // Check required files exist
  const requiredFiles = [
    './api/reports.js',
    './api/metadata.js', 
    './api/users.js',
    './api/comments.js',
    './api/votes.js',
    './middleware/auth.js'
  ]
  
  for (const file of requiredFiles) {
    try {
      require.resolve(file)
      console.log(`✅ ${file} found`)
    } catch (error) {
      console.error(`❌ Missing required file: ${file}`)
      process.exit(1)
    }
  }
  
  // Check MySQL connection
  try {
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    })
    
    console.log('✅ MySQL connection successful')
    
    // Check if database exists
    try {
      await connection.execute(`USE ${dbName}`)
      console.log(`✅ Database '${dbName}' exists and is accessible`)
    } catch (error) {
      if (error.message.includes('Unknown database')) {
        console.log(`⚠️  Database '${dbName}' not found. Run 'npm run setup' first.`)
      } else {
        console.log(`⚠️  Database '${dbName}' connection issue: ${error.message}`)
        console.log(`   This might be a MariaDB compatibility issue, but the server will try to start anyway.`)
      }
    }
    
    await connection.end()
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message)
    console.log('\n💡 Troubleshooting tips:')
    console.log('1. Make sure MySQL is running')
    console.log('2. Check your credentials in settings.js')
    console.log('3. If using XAMPP, make sure MySQL service is started')
    process.exit(1)
  }
  
  console.log('✅ All prerequisites met!\n')
}

async function startServer() {
  try {
    await checkPrerequisites()
    
    console.log('🚀 Starting Crowdsourced GeoTracker...')
    console.log(`📊 Backend: http://localhost:3000`)
    console.log(`🌐 Frontend: http://localhost:3000 (served by backend)`)
    console.log(`💾 Database: ${dbName}`)
    console.log('\nPress Ctrl+C to stop the server\n')
    
    // Start the main server
    require('./index.js')
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message)
    process.exit(1)
  }
}

// Run if this file is executed directly
if (require.main === module) {
  startServer()
}

module.exports = { checkPrerequisites, startServer } 