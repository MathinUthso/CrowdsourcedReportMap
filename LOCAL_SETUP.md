# Local Development Setup

## Quick Start for Localhost

### Prerequisites
1. **XAMPP** (since you're using it) - Make sure MySQL is running
2. **Node.js** (v14 or higher)
3. **npm** (comes with Node.js)

### Setup Steps

1. **Start MySQL in XAMPP**
   - Open XAMPP Control Panel
   - Start MySQL service
   - Make sure it's running on port 3306

2. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Setup Database**
   ```bash
   npm run setup
   ```
   This will create the database and tables automatically.

4. **Start the Application**
   ```bash
   npm start
   ```
   This will check prerequisites and start the server.

5. **Access the Application**
   - Open your browser to: `http://localhost:3000`
   - The frontend and backend are both served from the same port

### Troubleshooting

**If you get "MySQL connection failed":**
- Make sure MySQL is running in XAMPP
- Check that the port is 3306
- If you have a MySQL password, update it in `backend/settings.js`

**If you get "Database not found":**
- Run `npm run setup` to create the database

**If the frontend doesn't load:**
- Check that the backend is running on port 3000
- Make sure `frontend-web/settings.js` has `backendUrl: 'http://127.0.0.1:3000'`

### Default Admin Account
After setup, you can create an admin account:
- Username: `admin`
- Email: `admin@geotracker.com`
- Password: `admin123`

**Important:** Change this password after first login!

### File Structure
```
Map/
├── backend/          # Node.js server
│   ├── api/         # API endpoints
│   ├── middleware/  # Authentication
│   └── file_uploads/ # Uploaded images
└── frontend-web/     # HTML/CSS/JS frontend
```

### Development Tips
- The server automatically serves the frontend from `../frontend-web`
- File uploads go to `backend/file_uploads/`
- Database is `crowdsourced_map` (lowercase)
- All API endpoints are prefixed with `/api` except for the main routes
- Users can upload photos (JPG, PNG, WebP) up to 10MB when creating reports

### Stopping the Server
Press `Ctrl+C` in the terminal where the server is running. 