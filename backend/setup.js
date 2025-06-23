const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

// Import settings
const { dbUser, dbName, dbPassword, dbPort, dbHost } = require('./settings')

async function setupDatabase() {
  console.log('Setting up Crowdsourced GeoTracker database...')
  
  try {
    // Connect to MySQL server (without specifying database)
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    })

    console.log('Connected to MySQL server')

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`)
    console.log(`Database '${dbName}' created or already exists`)

    // Use the database
    await connection.execute(`USE ${dbName}`)

    // Read and execute the enhanced schema
    const schemaPath = path.join(__dirname, 'mysql_schema_enhanced.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    // Split the schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0)
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement)
        } catch (error) {
          // Ignore errors for statements that might already exist
          if (!error.message.includes('already exists')) {
            console.warn('Warning:', error.message)
          }
        }
      }
    }

    console.log('Database schema created successfully')
    
    // Insert default data
    await insertDefaultData(connection)
    
    await connection.end()
    console.log('Database setup completed successfully!')
    
  } catch (error) {
    console.error('Database setup failed:', error.message)
    console.log('\nPlease check your MySQL configuration in settings.js:')
    console.log('- Make sure MySQL is running')
    console.log('- Verify dbUser, dbPassword, dbHost, and dbPort in settings.js')
    console.log('- Ensure the MySQL user has CREATE DATABASE privileges')
    process.exit(1)
  }
}

async function insertDefaultData(connection) {
  console.log('Inserting default data...')
  
  // Insert default report types
  const reportTypes = [
    { name: 'INFANTRY', description: 'Infantry units and personnel', color: '#ff0000', icon: '👥' },
    { name: 'VEHICLES', description: 'Military vehicles and equipment', color: '#0000ff', icon: '🚗' },
    { name: 'AIRCRAFT', description: 'Military aircraft and helicopters', color: '#00ff00', icon: '✈️' },
    { name: 'ARTILLERY', description: 'Artillery and missile systems', color: '#ff6600', icon: '💥' },
    { name: 'SUPPLY', description: 'Supply convoys and logistics', color: '#6600ff', icon: '📦' }
  ]

  for (const type of reportTypes) {
    try {
      await connection.execute(
        'INSERT IGNORE INTO report_types (name, description, color, icon) VALUES (?, ?, ?, ?)',
        [type.name, type.description, type.color, type.icon]
      )
    } catch (error) {
      // Ignore duplicate key errors
    }
  }

  // Insert default locations
  const locations = [
    { name: 'Ukraine', description: 'Ukraine', country: 'Ukraine', region: 'Eastern Europe' },
    { name: 'Russia', description: 'Russia', country: 'Russia', region: 'Eastern Europe' },
    { name: 'Belarus', description: 'Belarus', country: 'Belarus', region: 'Eastern Europe' }
  ]

  for (const location of locations) {
    try {
      await connection.execute(
        'INSERT IGNORE INTO locations (name, description, country, region) VALUES (?, ?, ?, ?)',
        [location.name, location.description, location.country, location.region]
      )
    } catch (error) {
      // Ignore duplicate key errors
    }
  }

  console.log('Default data inserted successfully')
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n🎉 Setup completed! You can now start the server with:')
      console.log('   npm run listen')
      console.log('\nOr:')
      console.log('   node index.js')
    })
    .catch(error => {
      console.error('Setup failed:', error)
      process.exit(1)
    })
}

module.exports = { setupDatabase } 