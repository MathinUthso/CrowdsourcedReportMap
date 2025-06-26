# Dhaka Alert

A real-time, crowdsourced mapping application for tracking ongoing movements and activities around Dhaka. Built with Node.js, MySQL, and Google Maps API.

## Features

- **Real-time Mapping**: Interactive Google Maps interface with real-time data updates
- **User Authentication**: JWT-based authentication system with user registration and login
- **Report Creation**: Users can add reports with location, type, description, and media
- **Voting System**: Upvote/downvote and verify/dispute reports
- **Comments**: Users can comment on reports
- **Time-based Filtering**: View reports from different time periods
- **Mobile Responsive**: Works on desktop and mobile devices
- **Enhanced Schema**: Robust MySQL database with 10+ tables for scalability

## Tech Stack

- **Backend**: Node.js, Express.js, MySQL
- **Frontend**: HTML5, CSS3, JavaScript, Google Maps API
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Express-fileupload with image processing

## Quick Start

### Prerequisites

1. **Node.js** (v14 or higher)
2. **MySQL** (v8.0 or higher)
3. **Google Maps API Key**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crowdsourced-geotracker
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure the application**
   
   Edit `backend/settings.js`:
   ```javascript
   module.exports = {
     // Update with your MySQL credentials
     dbUser: 'your_mysql_username',
     dbPassword: 'your_mysql_password',
     
     // Update with your Google Maps API key
     // (Also update frontend-web/settings.js)
   }
   ```

   Edit `frontend-web/settings.js`:
   ```javascript
   const settings = {
     googleMapsAPIKey: 'your_google_maps_api_key',
     // ... other settings
   }
   ```

4. **Set up the database**
   ```bash
   npm run setup
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3000/api`

## Database Schema

The application uses an enhanced MySQL schema with the following tables:

- **users**: User accounts and authentication
- **report_types**: Categories of reports (INFANTRY, VEHICLES, etc.)
- **locations**: Geographic locations and regions
- **reports**: Main report data with spatial coordinates
- **report_media**: Media attachments for reports
- **report_votes**: User votes on reports
- **report_comments**: Comments on reports
- **audit_log**: System audit trail
- **api_requests**: API usage tracking

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile (authenticated)

### Reports
- `GET /reports` - Get reports in bounding box
- `POST /reports` - Create new report
- `GET /reports/:id` - Get specific report
- `PUT /reports/:id/status` - Update report status (moderator)

### Comments
- `GET /reports/:id/comments` - Get comments for report
- `POST /reports/:id/comments` - Add comment to report
- `PUT /comments/:id` - Update comment
- `DELETE /comments/:id` - Delete comment

### Votes
- `POST /reports/:id/vote` - Vote on report
- `GET /reports/:id/votes` - Get votes for report
- `DELETE /votes/:id` - Remove vote

### Metadata
- `GET /metadata` - Get all metadata (report types, locations, stats)
- `GET /metadata/report-types` - Get report types
- `GET /metadata/locations` - Get locations

## Configuration

### Environment Variables

You can override settings using environment variables:

```bash
export DB_USER=your_username
export DB_PASSWORD=your_password
export JWT_SECRET=your_jwt_secret
export GOOGLE_MAPS_API_KEY=your_api_key
```

### Security Settings

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **JWT Expiration**: 24 hours
- **File Upload Limit**: 10MB
- **Password Hashing**: bcrypt with 12 rounds

## Development

### Project Structure

```
crowdsourced-geotracker/
├── backend/
│   ├── api/                 # API endpoints
│   ├── middleware/          # Authentication middleware
│   ├── data_import_scripts/ # Data import utilities
│   ├── file_uploads/        # Uploaded files
│   ├── index.js            # Main server file
│   ├── settings.js         # Configuration
│   └── setup.js            # Database setup
├── frontend-web/
│   ├── index.html          # Main HTML file
│   ├── style.css           # Styles
│   ├── settings.js         # Frontend configuration
│   └── res/                # Static resources
└── README.md
```

### Running in Development

1. **Start the backend server**
   ```bash
   cd backend
   npm start
   ```

2. **Serve the frontend**
   You can use any static file server:
   ```bash
   cd frontend-web
   python -m http.server 8000
   # or
   npx serve .
   ```

3. **Update frontend settings**
   Make sure `frontend-web/settings.js` points to your backend:
   ```javascript
   backendUrl: 'http://localhost:3000'
   ```

## Deployment

### Production Checklist

1. **Update security settings**
   - Change JWT secret to a secure random string
   - Update database credentials
   - Set up HTTPS

2. **Configure environment**
   - Set `NODE_ENV=production`
   - Configure proper CORS origins
   - Set up proper file upload paths

3. **Database setup**
   - Use production MySQL instance
   - Set up proper backups
   - Configure connection pooling

4. **Monitoring**
   - Set up logging
   - Monitor API usage
   - Set up health checks

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the GNU GPLv3 License.

## Support

For issues and questions:
1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information

## Acknowledgments

- Google Maps API for mapping functionality
- MySQL for database management
- Express.js for the web framework
- The open-source community for various dependencies 
