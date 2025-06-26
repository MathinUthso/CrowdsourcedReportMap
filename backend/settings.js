module.exports = {
                                   // Database Configuration - Update these with your actual MySQL credentials
<<<<<<< HEAD
  dbUser     : 'root'  ,            // Change to your MySQL username
  dbName     : 'crowdsourced_map',  // Fixed to match schema
  dbPassword : '' ,                  // Change to your MySQL password
  dbPort     : 3306,
=======
  dbUser     : 'root',              // Change to your MySQL username
  dbName     : 'crowdsourced_map',  // Fixed to match schema
  dbPassword : '',                  // Change to your MySQL password
  dbPort                  : 3306,
>>>>>>> f84c41be0576ed2ae16b72cbdaf9d9436bdec3be
  dbHost                  : '127.0.0.1',
  listenPort              : 3000,
  supportedTypes          : ['Anodolon', 'Construction', 'Blockade'],
  maximumImageUploadSizeMB: 10,
  skipImageProcessing     : false,
  
  // JWT Configuration - Change this to a secure random string in production
  jwtSecret: 'crowdsourced-geotracker-jwt-secret-key-2024',
  jwtExpiresIn: '24h',
  
  // Rate Limiting
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // limit each IP to 100 requests per windowMs
  
  // File Upload
  uploadPath: './file_uploads',
  
  // Security
  bcryptRounds: 12
}
