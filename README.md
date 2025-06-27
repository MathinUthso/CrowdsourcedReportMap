<!-- Project Icon -->
<p align="center">
  <img src="frontend-web/res/alert.svg" alt="Dhaka Alert Logo" width="100"/>
</p>

# Dhaka Alert

**Empowering Communities with Real-Time, Crowd-Driven Alerts for Dhaka**

Dhaka Alert is a real-time, crowdsourced mapping platform for tracking ongoing events, hazards, and activities across Dhaka. Built for reliability, scalability, and community engagement, it enables users to report, verify, and discuss incidents as they happen.

---

## 🚀 Features

- **Live Mapping:** Interactive Google Maps interface with real-time updates
- **User Authentication:** Secure JWT-based registration and login
- **Crowdsourced Reports:** Add, verify, and discuss incidents with location, type, description, and media
- **Voting & Moderation:** Upvote/downvote, verify/dispute, and moderate reports
- **Commenting:** Engage in discussions on each report
- **Time Filters:** View incidents by time period
- **Mobile Responsive:** Optimized for all devices
- **Robust Database:** Enhanced MySQL schema for scalability

---

## 🛠️ Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white"/>
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white"/>
  <img src="https://img.shields.io/badge/Google%20Maps%20API-4285F4?style=for-the-badge&logo=googlemaps&logoColor=white"/>
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white"/>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white"/>
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"/>
</p>

---

## 📦 Quick Start

### Prerequisites
- Node.js (v14+)
- MySQL (v8.0+)
- Google Maps API Key

### Installation
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Dhaka-Alert
   ```
2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```
3. **Configure settings**
   - Edit `backend/settings.js` and `frontend-web/settings.js` with your credentials and API keys.
4. **Set up the database**
   ```bash
   npm run setup
   ```
5. **Start the server**
   ```bash
   npm start
   ```
6. **Access the app**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3000/api`

---

## 🗄️ Database Schema

- **users**: User accounts
- **report_types**: Categories of reports
- **locations**: Geographic regions
- **reports**: Main report data
- **report_media**: Media attachments
- **report_votes**: User votes
- **report_comments**: Comments
- **audit_log**: System audit
- **api_requests**: API usage

---

## 📚 API Endpoints

### Authentication
- `POST /auth/register` — Register
- `POST /auth/login` — Login
- `GET /auth/profile` — User profile

### Reports
- `GET /reports` — List reports
- `POST /reports` — Create report
- `GET /reports/:id` — Get report
- `PUT /reports/:id/status` — Update status

### Comments
- `GET /reports/:id/comments` — List comments
- `POST /reports/:id/comments` — Add comment
- `PUT /comments/:id` — Update comment
- `DELETE /comments/:id` — Delete comment

### Votes
- `POST /reports/:id/vote` — Vote
- `GET /reports/:id/votes` — Get votes
- `DELETE /votes/:id` — Remove vote

### Metadata
- `GET /metadata` — All metadata
- `GET /metadata/report-types` — Report types
- `GET /metadata/locations` — Locations

---

## ⚙️ Configuration

You can override settings with environment variables:
```bash
export DB_USER=your_username
export DB_PASSWORD=your_password
export JWT_SECRET=your_jwt_secret
export GOOGLE_MAPS_API_KEY=your_api_key
```

---

## 🧑‍💻 Development

### Structure
```
Dhaka-Alert/
├── backend/
│   ├── api/
│   ├── middleware/
│   ├── data_import_scripts/
│   ├── index.js
│   ├── settings.js
│   └── setup.js
├── frontend-web/
│   ├── index.html
│   ├── style.css
│   ├── settings.js
│   └── res/
└── README.md
```

### Running Locally
- Start backend: `cd backend && npm start`
- Serve frontend: `cd frontend-web && npx serve .` or `python -m http.server 8000`
- Ensure `frontend-web/settings.js` points to your backend

---

## 🚀 Deployment
- Set `NODE_ENV=production`
- Update secrets and credentials
- Set up HTTPS and CORS
- Use production MySQL and backups
- Monitor logs and health

---

## 🤝 Contributing
1. Fork the repo
2. Create a feature branch
3. Make changes and add tests
4. Submit a pull request

---

## 📄 License

This project is licensed under the GNU GPLv3 License.

---

## 🙏 Acknowledgments
- Google Maps API
- MySQL
- Express.js
- The open-source community
