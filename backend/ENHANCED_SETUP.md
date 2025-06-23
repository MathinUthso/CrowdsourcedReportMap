# Enhanced Crowdsourced GeoTracker Setup Guide

## Overview

This enhanced version includes:
- 🔐 **User Authentication** - JWT-based login/registration
- 👥 **User Management** - Roles (admin, moderator, user)
- ✅ **Verification System** - Community voting on reports
- 💬 **Comments & Discussion** - Threaded comments on reports
- 📊 **Enhanced Analytics** - Detailed statistics and reporting
- 🔍 **Audit Trail** - Complete change tracking
- 🛡️ **Security Features** - Rate limiting, CORS, Helmet
- 📁 **Media Management** - Multiple files per report

## Prerequisites

1. **MySQL Server** (8.0 or higher)
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

### 3. Import Enhanced Database Schema

```bash
mysql -u your_username -p crowdsourced_geotracker < mysql_schema_enhanced.sql
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
  skipImageProcessing: false,
  
  // JWT Configuration
  jwtSecret: 'your-super-secret-jwt-key-change-this-in-production',
  jwtExpiresIn: '24h',
  
  // Rate Limiting
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // limit each IP to 100 requests per windowMs
  
  // File Upload
  uploadPath: './file_uploads',
  
  // Security
  bcryptRounds: 12
}
```

### 6. Start the Application

```bash
cd backend
npm run listen
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile (authenticated)
- `PUT /auth/profile` - Update user profile (authenticated)

### Metadata
- `GET /metadata` - Get all metadata (report types, locations, statistics)
- `GET /metadata/report-types` - Get all report types
- `GET /metadata/locations` - Get all locations

### Reports
- `GET /reports` - Get reports in bounding box (optional auth)
- `POST /reports` - Create new report (optional auth)
- `GET /reports/:id` - Get specific report details (optional auth)
- `PUT /reports/:id/status` - Update report status (moderator/admin)

### Comments
- `POST /reports/:id/comments` - Add comment to report (authenticated)
- `GET /reports/:id/comments` - Get comments for report (authenticated)
- `PUT /comments/:id` - Update comment (authenticated)
- `DELETE /comments/:id` - Delete comment (authenticated)

### Votes
- `POST /reports/:id/vote` - Vote on report (authenticated)
- `GET /reports/:id/votes` - Get votes for report (authenticated)
- `DELETE /votes/:id` - Remove vote (authenticated)
- `GET /votes/summary` - Get voting summary (authenticated)

### Admin
- `GET /users` - Get all users (admin)
- `PUT /users/:id/status` - Update user status (admin)

### System
- `GET /health` - Health check
- `GET /uploads/*` - Serve uploaded files

## User Roles

### User (Default)
- Create reports
- Add comments
- Vote on reports
- Update own profile

### Moderator
- All user permissions
- Update report status
- Moderate comments

### Admin
- All moderator permissions
- Manage users
- View audit logs
- System administration

## Default Admin Account

The enhanced schema creates a default admin account:
- **Username:** `admin`
- **Email:** `admin@geotracker.com`
- **Password:** `admin123` (change this immediately!)

## Security Features

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable in settings

### JWT Authentication
- 24-hour token expiration
- Secure token verification

### Input Validation
- SQL injection prevention
- XSS protection
- File upload validation

### Audit Logging
- All user actions logged
- Complete change tracking
- IP address tracking

## File Structure

```
backend/
├── api/
│   ├── reports.js      # Report management
│   ├── metadata.js     # Metadata and statistics
│   ├── users.js        # User authentication
│   ├── comments.js     # Comment system
│   └── votes.js        # Voting system
├── middleware/
│   └── auth.js         # Authentication middleware
├── file_uploads/       # Uploaded media files
├── index.js           # Main server file
├── settings.js        # Configuration
├── mysql_schema_enhanced.sql  # Enhanced database schema
└── package.json       # Dependencies
```

## Database Schema

The enhanced schema includes 10 tables:
1. `users` - User accounts and authentication
2. `report_types` - Report categories
3. `locations` - Geographic areas
4. `reports` - Enhanced reports with relationships
5. `report_media` - Multiple media files per report
6. `report_votes` - User verification and voting
7. `report_comments` - Discussion threads
8. `audit_log` - Complete change tracking
9. `api_requests` - Usage monitoring

## Testing the API

### 1. Register a new user
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 3. Create a report (with authentication)
```bash
curl -X POST http://localhost:3000/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "lat": 50.41311166314775,
    "lon": 30.46506531920826,
    "type_id": 1,
    "title": "Test Report",
    "description": "This is a test report"
  }'
```

### 4. Get metadata
```bash
curl http://localhost:3000/metadata
```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Verify MySQL is running
   - Check credentials in settings.js
   - Ensure database exists

2. **JWT token errors**
   - Check jwtSecret in settings.js
   - Verify token format (Bearer TOKEN)
   - Check token expiration

3. **File upload issues**
   - Ensure uploadPath directory exists
   - Check file size limits
   - Verify file permissions

4. **Rate limiting**
   - Check rate limit settings
   - Monitor API usage
   - Adjust limits if needed

### Performance Optimization

1. **Database indexes** - Already included in schema
2. **Connection pooling** - Configured for 10 connections
3. **File caching** - Static file serving optimized
4. **Rate limiting** - Prevents abuse

## Production Deployment

### Security Checklist
- [ ] Change default admin password
- [ ] Update JWT secret
- [ ] Configure HTTPS
- [ ] Set up proper CORS origins
- [ ] Configure production database
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

### Environment Variables
Consider using environment variables for sensitive settings:
```bash
export DB_USER=your_db_user
export DB_PASSWORD=your_db_password
export JWT_SECRET=your_jwt_secret
```

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check server logs for errors
4. Verify database connectivity 