# Dhaka Alert - Frontend Documentation

## Overview

Dhaka Alert is a real-time crowdsourced reporting platform that allows users to share and view community alerts, traffic updates, protests, road blockades, and other events in Dhaka, Bangladesh. The frontend is built with vanilla JavaScript, HTML, and CSS, featuring an interactive Google Maps interface.

## Project Structure

```
frontend-web/
├── index.html              # Main map interface
├── homepage.html           # Landing page
├── redirect.html           # Redirect page
├── test-comments.html      # Comments testing page
├── script.js               # Main application logic
├── homepage.js             # Homepage functionality
├── comments.js             # Comments system
├── my-reports.js           # User reports management
├── my-reports-dropdown.js  # Reports dropdown UI
├── my-reports-modal.js     # Reports modal interface
├── settings.js             # Configuration settings
├── map-styles.js           # Google Maps styling
├── style.css               # Main stylesheet
├── homepage-style.css      # Homepage styles
├── res/                    # Static resources
│   ├── favicon.png
│   ├── bluecircle.png
│   ├── redcircle.png
│   ├── alert.svg
│   ├── info.svg
│   ├── location-pin.svg
│   ├── pulse-marker.svg
│   ├── route.svg
│   └── user.svg
└── Icons/                  # Report type icons
    ├── blockade.svg
    ├── fire.svg
    ├── Genjam.svg
    ├── political_movement.svg
    ├── protest.svg
    ├── traffic_jam.svg
    ├── vip.svg
    └── ...
```

## Core Features

### 1. Interactive Map Interface (`index.html`, `script.js`)

**Key Components:**
- Google Maps integration with custom styling
- Real-time report markers with type-specific icons
- Search functionality with autocomplete
- Time-based filtering
- Report creation interface
- Voting system for report verification

**Map Features:**
- **Search**: Location search with Google Places autocomplete
- **Time Filter**: Toggle between current time and historical data
- **Report Types**: Visual markers for different event types
- **Voting**: Upvote/downvote system for report verification
- **Comments**: Community discussion on reports
- **Routing**: Conflict-aware route planning

### 2. Authentication System

**Features:**
- User registration and login
- JWT token-based authentication
- Persistent login sessions
- User profile management

**Implementation:**
```javascript
// Login function
function login(event) {
  // Handles user authentication
  // Stores JWT token in localStorage
  // Updates UI based on auth status
}
```

### 3. Report Management

**Report Types Supported:**
- Political Movement
- Road Blockade
- Protest
- Traffic Jam
- VIP Movement
- Fire
- Genjam (General Jam)

**Report Features:**
- **Creation**: Click on map to add reports
- **Media**: Support for images and external links
- **Verification**: Community voting system
- **Comments**: Discussion threads
- **Status**: Verified, Pending, Unverified

### 4. Search Functionality

**Search Capabilities:**
- **Location Search**: Google Places autocomplete
- **Coordinate Search**: Direct lat,lng input
- **Address Geocoding**: Convert addresses to coordinates
- **Visual Feedback**: Temporary markers for searched locations

**Implementation:**
```javascript
function handleSearch(query) {
  // Handles coordinate format (lat,lng)
  // Geocodes addresses
  // Centers map on results
  // Shows temporary markers
}
```

### 5. Routing System

**Features:**
- Start/end point selection
- Conflict detection (500m radius)
- Multiple detour attempts
- Visual route display
- Conflict markers

**Routing Logic:**
```javascript
async function fetchAndDisplayRoute() {
  // Finds optimal route avoiding conflicts
  // Generates multiple detour options
  // Displays route with conflict warnings
}
```

### 6. Comments System (`comments.js`)

**Features:**
- Threaded discussions on reports
- Real-time comment loading
- Edit/delete functionality
- Character limits and validation
- User attribution

**Comment Operations:**
- Add new comments
- Edit existing comments
- Delete comments (author only)
- Load comments for reports
- Toggle comment visibility

### 7. User Reports Management (`my-reports.js`, `my-reports-dropdown.js`)

**Features:**
- View user's own reports
- Edit report details
- Delete reports
- Track report status
- Highlight reports on map

**UI Components:**
- Dropdown menu for quick access
- Modal interface for detailed view
- Map integration for location highlighting

## Configuration (`settings.js`)

```javascript
const settings = {
  backendUrl: 'http://127.0.0.1:3000',
  googleMapsAPIKey: 'YOUR_API_KEY',
  mapDefaultLocation: {
    lat: 23.8103,  // Dhaka coordinates
    lng: 90.4125
  },
  mapDefaultZoom: 12,
  mapCenterOnUsersLocationInBounds: {
    latmin: 40.0,
    lngmin: 15.0,
    latmax: 60.0,
    lngmax: 45.0
  }
}
```

## Styling System

### Main Stylesheet (`style.css`)
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Night mode map styling
- **Component Styles**: Buttons, modals, forms
- **Map Controls**: Custom control styling
- **Search Interface**: Enhanced search box design

### Homepage Styles (`homepage-style.css`)
- **Modern UI**: Clean, professional design
- **Hero Section**: Attractive landing page
- **Feature Cards**: Grid layout for features
- **Leaderboard**: User ranking display
- **Authentication**: Modal styling

### Map Styling (`map-styles.js`)
- **Night Mode**: Dark theme for map
- **Custom Colors**: Brand-specific styling
- **Feature Styling**: Roads, water, buildings
- **Label Styling**: Text and icon customization

## API Integration

### Backend Communication
- **RESTful API**: HTTP requests to backend
- **Authentication**: Bearer token headers
- **Error Handling**: Comprehensive error management
- **Real-time Updates**: Polling for new data

### Key Endpoints:
- `GET /reports` - Fetch reports in map bounds
- `POST /reports` - Create new reports
- `POST /auth/login` - User authentication
- `POST /auth/register` - User registration
- `GET /metadata` - Project configuration
- `POST /reports/:id/vote` - Vote on reports
- `GET /reports/:id/votes` - Get report votes
- `GET /comments` - Fetch report comments
- `POST /comments` - Add new comments

## User Interface Components

### Navigation Bar
- **Brand**: Dhaka Alert logo and title
- **Search**: Centralized search functionality
- **Authentication**: Login/signup buttons
- **User Menu**: Profile and logout options

### Map Controls
- **Time Filter**: Toggle historical data
- **Location Button**: Go to user's location
- **Directions**: Route planning interface
- **Filter Bar**: Report type and verification filters

### Report Interface
- **Info Windows**: Detailed report information
- **Voting System**: Upvote/downvote buttons
- **Comments**: Discussion threads
- **Media Display**: Images and external links

## Mobile Responsiveness

### Responsive Features:
- **Touch-friendly**: Large touch targets
- **Mobile Navigation**: Hamburger menu
- **Adaptive Layout**: Flexible grid systems
- **Optimized Controls**: Mobile-appropriate sizing
- **Gesture Support**: Touch interactions

### Mobile-specific Adjustments:
- Larger buttons and controls
- Simplified navigation
- Optimized map interactions
- Touch-friendly form inputs

## Performance Optimizations

### Loading Strategy:
- **Lazy Loading**: Load data as needed
- **Debounced Requests**: Prevent API spam
- **Caching**: Local storage for user data
- **Minimal Dependencies**: Lightweight libraries

### Map Performance:
- **Marker Clustering**: Group nearby markers
- **Bounds-based Loading**: Load only visible data
- **Efficient Rendering**: Optimized marker creation
- **Memory Management**: Clean up unused markers

## Security Features

### Authentication Security:
- **JWT Tokens**: Secure session management
- **Token Storage**: Secure localStorage usage
- **Input Validation**: Client-side validation
- **XSS Prevention**: Sanitized content rendering

### Data Security:
- **HTTPS**: Secure API communication
- **Input Sanitization**: Prevent injection attacks
- **Content Security**: Safe HTML rendering
- **Error Handling**: Secure error messages

## Browser Compatibility

### Supported Browsers:
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile Browsers**: iOS Safari, Chrome Mobile

### Required Features:
- **ES6+ Support**: Modern JavaScript features
- **Geolocation API**: Location services
- **Local Storage**: Data persistence
- **Fetch API**: HTTP requests
- **Google Maps API**: Map functionality

## Development Setup

### Prerequisites:
- Modern web browser
- Local web server
- Google Maps API key
- Backend server running

### Quick Start:
1. Clone the repository
2. Configure `settings.js` with your API key
3. Start a local web server
4. Open `index.html` in browser

### Development Tools:
- **Code Editor**: VS Code recommended
- **Live Server**: For development
- **Browser DevTools**: For debugging
- **Network Tab**: API monitoring

## Testing

### Test Files:
- `test-comments.html`: Comments functionality testing
- Browser console: JavaScript debugging
- Network monitoring: API request testing

### Testing Features:
- **Unit Tests**: Individual function testing
- **Integration Tests**: API integration testing
- **UI Tests**: User interface testing
- **Mobile Tests**: Responsive design testing

## Deployment

### Production Considerations:
- **API Keys**: Secure key management
- **HTTPS**: Secure communication
- **CDN**: Static asset optimization
- **Caching**: Browser caching strategies
- **Compression**: Asset minification

### Build Process:
- **Minification**: CSS and JS compression
- **Optimization**: Image optimization
- **Bundling**: Asset bundling
- **Versioning**: Cache busting

## Troubleshooting

### Common Issues:
1. **Map Not Loading**: Check API key configuration
2. **Search Not Working**: Verify Places API access
3. **Authentication Errors**: Check backend connectivity
4. **Mobile Issues**: Test responsive design
5. **Performance Issues**: Monitor network requests

### Debug Tools:
- Browser developer tools
- Network request monitoring
- Console error logging
- Performance profiling

## Future Enhancements

### Planned Features:
- **Real-time Updates**: WebSocket integration
- **Push Notifications**: Browser notifications
- **Offline Support**: Service worker implementation
- **Advanced Filtering**: More filter options
- **Social Features**: User following system

### Technical Improvements:
- **Progressive Web App**: PWA capabilities
- **Performance**: Further optimization
- **Accessibility**: WCAG compliance
- **Internationalization**: Multi-language support

## Contributing

### Development Guidelines:
- Follow existing code style
- Test thoroughly before submitting
- Document new features
- Maintain backward compatibility
- Consider mobile experience

### Code Standards:
- **JavaScript**: ES6+ syntax
- **CSS**: BEM methodology
- **HTML**: Semantic markup
- **Comments**: Clear documentation
- **Error Handling**: Comprehensive error management

---

This documentation provides a comprehensive overview of the Dhaka Alert frontend system. For specific implementation details, refer to the individual source files and their inline comments. 