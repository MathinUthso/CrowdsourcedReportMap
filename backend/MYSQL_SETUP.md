# MySQL Setup Guide for Crowdsourced GeoTracker

## Prerequisites

1. **MySQL Server** (8.0 or higher recommended)
2. **Node.js** (14 or higher)
3. **npm** or **yarn**

## Installation Steps

### 1. Install MySQL Server

**Windows:**
- Download MySQL Installer from https://dev.mysql.com/downloads/installer/
- Run the installer and follow the setup wizard
- Remember the root password you set

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

**macOS:**
```bash
brew install mysql
brew services start mysql
```

### 2. Create Database and User

Connect to MySQL as root:
```bash
mysql -u root -p
```

Run the following SQL commands:
```sql
-- Create database
CREATE DATABASE crowdsourced_geotracker;

-- Create user (replace 'your_username' and 'your_password' with your choice)
CREATE USER 'your_username'@'localhost' IDENTIFIED BY 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON crowdsourced_geotracker.* TO 'your_username'@'localhost';
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

### 3. Import Database Schema

```bash
mysql -u your_username -p crowdsourced_geotracker < mysql_schema.sql
```

### 4. Install Node.js Dependencies

```bash
cd backend
npm install
```

### 5. Configure Settings

Edit `backend/settings.js`:
```javascript
module.exports = {
  dbUser: 'your_username',
  dbName: 'crowdsourced_geotracker',
  dbPassword: 'your_password',
  dbPort: 3306,
  dbHost: '127.0.0.1',
  listenPort: 3000,
  supportedTypes: ['INFANTRY', 'VEHICLES', 'AIRCRAFT'],
  maximumImageUploadSizeMB: 10,
  skipImageProcessing: false
}
```

### 6. Create File Upload Directory

```bash
mkdir -p backend/file_uploads
```

### 7. Start the Application

```bash
cd backend
npm run listen
```

The application will be available at `http://localhost:3000`

## Key Differences from PostgreSQL Version

### Spatial Functions
- **PostgreSQL/PostGIS**: `ST_Point(lon, lat)`, `ST_MakeEnvelope()`, `ST_Y(location::geometry)`
- **MySQL**: `ST_GeomFromText('POINT(lon lat)', 4326)`, `ST_Contains()`, `ST_Y(location)`

### Timestamp Functions
- **PostgreSQL**: `to_timestamp(unix_timestamp)`
- **MySQL**: `FROM_UNIXTIME(unix_timestamp)`

### Recursive Queries
- **PostgreSQL**: `WITH timestamps AS (SELECT hour FROM generate_series(...))`
- **MySQL**: `WITH RECURSIVE timestamps AS (SELECT ... UNION ALL ...)`

### Connection Pooling
- **PostgreSQL**: Uses `pg` library with `Pool`
- **MySQL**: Uses `mysql2` library with `createPool`

## Troubleshooting

### Common Issues

1. **Spatial functions not working**
   - Ensure MySQL version 8.0+ is installed
   - Check that spatial indexes are created properly

2. **Connection refused**
   - Verify MySQL service is running
   - Check port 3306 is not blocked
   - Confirm credentials in settings.js

3. **Permission denied**
   - Ensure the MySQL user has proper privileges
   - Check file permissions for uploads directory

### Performance Optimization

1. **Spatial Index**: Already included in schema
2. **Regular Indexes**: Added for type, timestamps, and combinations
3. **Connection Pool**: Configured with 10 connections

## Migration from PostgreSQL

If you have existing PostgreSQL data:

1. Export data from PostgreSQL:
```sql
COPY reports TO '/tmp/reports.csv' WITH CSV HEADER;
```

2. Import to MySQL (after schema creation):
```sql
LOAD DATA INFILE '/tmp/reports.csv' 
INTO TABLE reports 
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"' 
LINES TERMINATED BY '\n' 
IGNORE 1 ROWS;
```

Note: You may need to adjust the data format for spatial columns during migration. 