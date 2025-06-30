# Dhaka Alert - Frontend Code Explanation

## Architecture Overview

The frontend is built using **vanilla JavaScript** with a **modular architecture** that separates concerns into different files. The application follows a **component-based approach** without using any framework, making it lightweight and fast.

## Core Architecture Pattern

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HTML Pages    │    │  JavaScript     │    │   CSS Styles    │
│                 │    │   Modules       │    │                 │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • index.html    │    │ • script.js     │    │ • style.css     │
│ • homepage.html │    │ • homepage.js   │    │ • homepage-     │
│ • redirect.html │    │ • comments.js   │    │   style.css     │
│ • test-*.html   │    │ • my-reports.js │    │ • map-styles.js │
└─────────────────┘    │ • settings.js   │    └─────────────────┘
                       │ • map-styles.js │
                       └─────────────────┘
```

## 1. Main Application Logic (`script.js`)

### Global State Management

```javascript
// Core application state
let markers = {}                    // Map markers storage
let currentUser = null              // Current authenticated user
let authToken = localStorage.getItem('authToken')  // JWT token
let map = null                      // Google Maps instance
let displayedTime = parseInt(moment().format('X')) // Current timestamp

// Control bar state
let reportTypeFilter = 'all'        // Report type filtering
let verificationFilter = 'all'      // Verification status filtering
let sortOrder = 'newest'            // Sort order preference
let timeFilterEnabled = false       // Time filter toggle

// Routing state
let routingStart = null             // Route start point
let routingEnd = null               // Route end point
let routingMode = false             // Routing mode toggle
```

### Initialization Flow

```javascript
// 1. Load project metadata
requestAPIGet('/metadata', null, (response) => {
  projectMetadata = JSON.parse(response)
  renderStatistics()
})

// 2. Load Google Maps API
var script = document.createElement('script')
script.src = 'https://maps.googleapis.com/maps/api/js?key=' + 
             settings.googleMapsAPIKey + '&callback=init&libraries=marker,places'

// 3. Initialize map when API loads
function init() {
  // Create map instance
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: settings.mapDefaultZoom || 9,
    center: settings.mapDefaultLocation,
    mapTypeId: 'roadmap',
    styles: stylesNightMode
  })
  
  // Initialize search functionality
  initializeSearch()
  
  // Set up event listeners
  setupMapEventListeners()
  
  // Load initial data
  setDisplayedTime(parseInt(moment().format('X')))
}
```

### Authentication System

```javascript
// Login function with JWT token handling
function login(event) {
  event.preventDefault()
  const username = document.getElementById('login-username').value
  const password = document.getElementById('login-password').value

  requestAPIPost('/auth/login', JSON.stringify({
    username: username,
    password: password
  }), (response) => {
    const data = JSON.parse(response)
    if (data.token) {
      authToken = data.token
      currentUser = data.user
      localStorage.setItem('authToken', authToken)
      localStorage.setItem('user', JSON.stringify(currentUser))
      updateAuthUI()
      closeAuthModal()
    }
  })
}

// API request wrapper with authentication
function requestAPIPost(uri, data, callback) {
  var oReq = new XMLHttpRequest()
  oReq.open('POST', settings.backendUrl + uri)
  oReq.setRequestHeader('Content-Type', 'application/json')
  if (authToken) {
    oReq.setRequestHeader('Authorization', 'Bearer ' + authToken)
  }
  oReq.send(data)
}
```

### Map Data Loading

```javascript
function loadReportsFromAPI() {
  var bounds = map.getBounds()
  var ne = bounds.getNorthEast()
  var sw = bounds.getSouthWest()

  const params = {
    latmin: sw.lat(),
    lonmin: sw.lng(),
    latmax: ne.lat(),
    lonmax: ne.lng(),
    ...(!timeFilterEnabled ? { show_all: 1 } : {})
  }
  
  if (timeFilterEnabled && Number.isInteger(displayedTime)) {
    params.time = displayedTime
  }

  requestAPIGet('/reports', params, (response) => {
    const locations = JSON.parse(response)
    
    // Apply filters
    let filtered = applyFilters(locations)
    
    // Clear existing markers
    clearMarkers()
    
    // Create new markers
    filtered.forEach(loc => {
      createReportMarker(loc)
    })
  })
}
```

### Report Creation System

```javascript
function addNewReport() {
  const form = document.querySelector('.report-add-form')
  const formData = new FormData(form)
  
  // Convert type name to type_id
  const typeName = form.querySelector('select[name="type"]').value
  const typeId = getTypeIdFromName(typeName)
  formData.delete('type')
  formData.append('type_id', typeId)

  const xhr = new XMLHttpRequest()
  xhr.open('POST', settings.backendUrl + '/reports')
  if (authToken) {
    xhr.setRequestHeader('Authorization', 'Bearer ' + authToken)
  }
  
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200 || xhr.status === 201) {
        // Success - add marker immediately
        const resp = JSON.parse(xhr.responseText)
        addImmediateMarker(resp.report_id, form)
        loadReportsFromAPI() // Refresh data
      }
    }
  }
  xhr.send(formData)
}
```

## 2. Search System Implementation

### Search Initialization

```javascript
function initializeSearch() {
  const searchBox = document.getElementById('map-search-box')
  const searchForm = document.getElementById('map-search-form')
  
  // Handle form submission
  searchForm.addEventListener('submit', function(e) {
    e.preventDefault()
    handleSearch(searchBox.value)
  })

  // Handle Enter key
  searchBox.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch(searchBox.value)
    }
  })

  // Google Places Autocomplete
  if (window.google && google.maps && google.maps.places) {
    const autocomplete = new google.maps.places.Autocomplete(searchBox, {
      types: ['geocode', 'establishment'],
      componentRestrictions: { country: 'bd' }
    })

    autocomplete.addListener('place_changed', function() {
      const place = autocomplete.getPlace()
      if (place && place.geometry && place.geometry.location) {
        centerMapOnLocation(place.geometry.location, place.name)
      }
    })
  }
}
```

### Search Handler

```javascript
function handleSearch(query) {
  if (!query.trim()) return

  // Check for coordinate format (lat,lng)
  const coordMatch = query.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/)
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1])
    const lng = parseFloat(coordMatch[2])
    centerMapOnLocation({ lat, lng }, 'Searched Location')
    return
  }

  // Geocode address
  if (window.google && google.maps && google.maps.Geocoder) {
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ address: query }, function(results, status) {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location
        centerMapOnLocation(location, results[0].formatted_address)
      } else {
        alert('Location not found. Try coordinates (lat,lng format).')
      }
    })
  }
}
```

## 3. Voting System

### Vote Box HTML Generation

```javascript
function getVoteBoxHtml(reportId, userVote, status, netVotes) {
  // Status icons based on verification level
  let statusIcon = '';
  if (status === 'verified') {
    statusIcon = '<div style="color:#22c55e;">✔</div>';
  } else if (status === 'pending') {
    statusIcon = '<div style="color:#888;">⏳</div>';
  } else if (status === 'unverified') {
    statusIcon = '<div style="color:#e11d48;">❌</div>';
  }

  // SVG arrows with user vote highlighting
  const upArrow = userVote === 'upvote'
    ? `<svg fill='#2563eb' stroke='#2563eb'>...</svg>`
    : `<svg fill='none' stroke='#2563eb'>...</svg>`;
    
  const downArrow = userVote === 'downvote'
    ? `<svg fill='#e11d48' stroke='#e11d48'>...</svg>`
    : `<svg fill='none' stroke='#e11d48'>...</svg>`;

  return `
    <div class="vote-box">
      <button onclick="voteOnReport(${reportId}, 'upvote')">${upArrow}</button>
      <div class="vote-count">${netVotes > 0 ? '+' + netVotes : netVotes}</div>
      <button onclick="voteOnReport(${reportId}, 'downvote')">${downArrow}</button>
      ${statusIcon}
    </div>
  `;
}
```

### Vote Processing

```javascript
function voteOnReport(reportId, voteType) {
  if (!currentUser) {
    alert('Please login to vote')
    return
  }

  requestAPIPost('/reports/' + reportId + '/vote', JSON.stringify({
    vote_type: voteType
  }), (response) => {
    const data = JSON.parse(response)
    if (data.message) {
      loadReportVotes(reportId) // Refresh vote display
    }
  })
}

function updateReportVoteDisplay(reportId, voteData) {
  const voteContainer = document.getElementById('vote-container-' + reportId)
  if (voteContainer) {
    const upvotes = voteData.summary?.find(v => v.vote_type === 'upvote')?.count || 0
    const downvotes = voteData.summary?.find(v => v.vote_type === 'downvote')?.count || 0
    const verifications = voteData.summary?.find(v => v.vote_type === 'verify')?.count || 0
    const totalVotes = voteData.votes?.length || 0
    
    // Determine status
    let status = 'unverified'
    if (upvotes >= 5) status = 'verified'
    else if (totalVotes > 0) status = 'pending'
    
    // Find user's vote
    let userVote = null
    if (voteData.votes && currentUser) {
      const myVote = voteData.votes.find(v => v.username === currentUser.username)
      if (myVote) userVote = myVote.vote_type
    }
    
    const netVotes = upvotes - downvotes
    voteContainer.innerHTML = getVoteBoxHtml(reportId, userVote, status, netVotes)
  }
}
```

## 4. Routing System

### Route Planning Algorithm

```javascript
async function fetchAndDisplayRoute() {
  if (!routingStart || !routingEnd) {
    alert('Start or end point missing.')
    return
  }

  const directionsService = new google.maps.DirectionsService()
  let bestRoute = null
  let minConflicts = Infinity
  let attempts = 0
  const MAX_ATTEMPTS = 20

  while (attempts < MAX_ATTEMPTS) {
    const request = {
      origin: routingStart,
      destination: routingEnd,
      travelMode: google.maps.TravelMode.DRIVING,
      waypoints: generateWaypoints(attempts)
    }

    const result = await new Promise(resolve => {
      directionsService.route(request, (res, status) => {
        resolve({res, status})
      })
    })

    if (result.status === 'OK' && result.res.routes[0]) {
      const route = result.res.routes[0].overview_path
      const conflicts = await checkRouteForConflicts(route, true)
      
      if (conflicts.length < minConflicts) {
        minConflicts = conflicts.length
        bestRoute = route
      }
      
      if (conflicts.length === 0) {
        // Found conflict-free route
        drawRoutingPolyline(route)
        return
      }
    }
    attempts++
  }

  // Show best available route
  if (bestRoute) {
    drawRoutingPolyline(bestRoute)
    await checkRouteForConflicts(bestRoute, false)
    alert('Warning: Could not find a conflict-free route.')
  }
}
```

### Conflict Detection

```javascript
async function checkRouteForConflicts(route, returnList) {
  const bounds = map.getBounds()
  const params = new URLSearchParams({
    latmin: bounds.getSouthWest().lat(),
    lonmin: bounds.getSouthWest().lng(),
    latmax: bounds.getNorthEast().lat(),
    lonmax: bounds.getNorthEast().lng(),
    show_all: 1
  })

  const url = settings.backendUrl + '/reports?' + params.toString()
  const conflicts = await fetch(url).then(res => res.json())
  
  // Filter for conflict types
  const conflictTypes = ['BLOCKADE', 'PROTEST', 'FIRE', 'TRAFFIC JAM', 'VIP MOVEMENT']
  const conflictPoints = conflicts.filter(r => 
    conflictTypes.includes((r.type_name || '').toUpperCase())
  )

  let foundLocations = []
  for (const pt of route) {
    for (const c of conflictPoints) {
      const dist = haversineDistance(pt.lat(), pt.lng(), c.lat, c.lon)
      if (dist <= 500) { // 500m conflict radius
        foundLocations.push(c)
        if (!returnList) {
          createConflictMarker(c)
        }
      }
    }
  }

  return foundLocations
}
```

## 5. Comments System (`comments.js`)

### Comments Data Structure

```javascript
// Global comments storage
let comments = {}  // { reportId: [comment1, comment2, ...] }
let commentVisibility = {}  // { reportId: true/false }

// Comment object structure
{
  id: 123,
  report_id: 456,
  user_id: 789,
  username: "john_doe",
  content: "This is a comment",
  created_at: "2024-01-15T10:30:00Z",
  updated_at: "2024-01-15T10:30:00Z"
}
```

### Comments Loading

```javascript
function loadComments(reportId) {
  if (!currentUser) return

  requestAPIGet('/comments', { report_id: reportId }, (response) => {
    const data = JSON.parse(response)
    comments[reportId] = data.comments || []
    renderComments(reportId)
  })
}

function renderComments(reportId) {
  const container = document.getElementById(`comments-container-${reportId}`)
  if (!container) return

  const reportComments = comments[reportId] || []
  
  if (reportComments.length === 0) {
    container.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>'
    return
  }

  let commentsHtml = '<div class="comments-list">'
  reportComments.forEach(comment => {
    commentsHtml += generateCommentHtml(comment, reportId)
  })
  commentsHtml += '</div>'
  
  // Add comment form
  commentsHtml += generateCommentForm(reportId)
  
  container.innerHTML = commentsHtml
}
```

### Comment Submission

```javascript
function submitComment(reportId) {
  const textarea = document.getElementById(`comment-input-${reportId}`)
  const content = textarea.value.trim()
  
  if (!content) return
  if (!currentUser) {
    alert('Please login to comment')
    return
  }

  requestAPIPost('/comments', JSON.stringify({
    report_id: reportId,
    content: content
  }), (response) => {
    const data = JSON.parse(response)
    if (data.comment_id) {
      textarea.value = ''
      loadComments(reportId) // Refresh comments
    }
  })
}
```

## 6. User Reports Management (`my-reports.js`)

### Reports Data Loading

```javascript
function loadMyReports() {
  if (!currentUser) return

  requestAPIGet('/reports/my', null, (response) => {
    const data = JSON.parse(response)
    renderMyReports(data.reports || [])
  })
}

function renderMyReports(reports) {
  const container = document.getElementById('my-reports-list')
  if (!container) return

  if (reports.length === 0) {
    container.innerHTML = '<p>You haven\'t created any reports yet.</p>'
    return
  }

  let html = '<div class="reports-grid">'
  reports.forEach(report => {
    html += generateReportCard(report)
  })
  html += '</div>'
  
  container.innerHTML = html
}
```

### Report Card Generation

```javascript
function generateReportCard(report) {
  const status = getReportStatus(report)
  const statusClass = `status-${status.toLowerCase()}`
  
  return `
    <div class="report-card ${statusClass}" data-report-id="${report.id}">
      <div class="report-header">
        <h3>${report.title || 'Untitled Report'}</h3>
        <span class="report-type">${report.type_name}</span>
      </div>
      <div class="report-content">
        <p>${report.description || 'No description'}</p>
        <div class="report-meta">
          <span class="report-date">${formatDate(report.created_at)}</span>
          <span class="report-location">${report.lat.toFixed(4)}, ${report.lon.toFixed(4)}</span>
        </div>
      </div>
      <div class="report-actions">
        <button onclick="editReport(${report.id})">Edit</button>
        <button onclick="deleteReport(${report.id})">Delete</button>
        <button onclick="highlightOnMap(${report.id})">Show on Map</button>
      </div>
    </div>
  `
}
```

## 7. Styling Architecture (`style.css`)

### CSS Organization

```css
/* 1. Reset and Base Styles */
* { margin: 0; padding: 0; box-sizing: border-box; }

/* 2. Layout Components */
.navbar { /* Navigation styling */ }
.modal { /* Modal overlay styling */ }
.map-container { /* Map wrapper styling */ }

/* 3. Interactive Elements */
.btn { /* Button base styles */ }
.btn-primary { /* Primary button variant */ }
.icon-btn { /* Icon button styling */ }

/* 4. Form Elements */
input, select, textarea { /* Form control styling */ }
.form-group { /* Form group layout */ }

/* 5. Map-specific Styles */
.gm-style-iw { /* Info window customization */ }
.map-controls { /* Custom map controls */ }

/* 6. Responsive Design */
@media only screen and (max-width: 768px) {
  /* Mobile-specific adjustments */
}
```

### Responsive Design Patterns

```css
/* Mobile-first approach */
.navbar {
  padding: 1rem;
}

@media only screen and (min-width: 768px) {
  .navbar {
    padding: 1.5rem 2rem;
  }
}

/* Flexible layouts */
.reports-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media only screen and (min-width: 768px) {
  .reports-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}
```

## 8. Configuration Management (`settings.js`)

### Settings Structure

```javascript
const settings = {
  // Backend API configuration
  backendUrl: 'http://127.0.0.1:3000',
  
  // Google Maps configuration
  googleMapsAPIKey: 'YOUR_API_KEY',
  mapDefaultLocation: {
    lat: 23.8103,  // Dhaka coordinates
    lng: 90.4125
  },
  mapDefaultZoom: 12,
  
  // Geolocation bounds
  mapCenterOnUsersLocationInBounds: {
    latmin: 40.0,
    lngmin: 15.0,
    latmax: 60.0,
    lngmax: 45.0
  }
}
```

## 9. Event Handling Patterns

### Map Event Listeners

```javascript
// Bounds change with debouncing
google.maps.event.addListener(map, 'bounds_changed', function () {
  if (dbRequestTimeout) {
    window.clearTimeout(dbRequestTimeout)
  }
  dbRequestTimeout = window.setTimeout(loadReportsFromAPI, 1000)
})

// Map click for report creation
google.maps.event.addListener(map, 'click', (e) => {
  if (routingMode) {
    handleRoutingMapClick(e)
    return
  }
  
  if (!currentUser) {
    alert('Please login to add reports')
    return
  }
  
  createAddReportInterface(e.latLng)
})
```

### Form Event Handling

```javascript
// Form submission prevention
document.getElementById('map-search-form').addEventListener('submit', function(e) {
  e.preventDefault()
  handleSearch(document.getElementById('map-search-box').value)
})

// Input validation
document.querySelector('input[name="mediafile"]').addEventListener('change', function() {
  validateFileSize(this)
})
```

## 10. Performance Optimizations

### Debouncing API Calls

```javascript
let dbRequestTimeout = null

function debouncedLoadReports() {
  if (dbRequestTimeout) {
    window.clearTimeout(dbRequestTimeout)
  }
  dbRequestTimeout = window.setTimeout(loadReportsFromAPI, 1000)
}
```

### Marker Management

```javascript
function clearMarkers() {
  Object.keys(markers).forEach(locId => {
    if (markers[locId].markerObject) {
      markers[locId].markerObject.setMap(null)
    }
  })
  markers = {}
}

function createReportMarker(location) {
  const marker = new google.maps.Marker({
    position: new google.maps.LatLng(location.lat, location.lon),
    title: location.type_name || 'REPORT',
    map: map,
    icon: getMarkerIconFromType(location.type_name)
  })
  
  markers[location.id] = {
    ...location,
    markerObject: marker
  }
}
```

## 11. Error Handling Patterns

### API Error Handling

```javascript
function requestAPIGet(uri, params, callback) {
  var oReq = new XMLHttpRequest()
  
  oReq.addEventListener('load', function reqListener () {
    if (callback && this.response) {
      if (this.status >= 200 && this.status < 300) {
        callback(this.response)
      } else {
        console.error('API Error:', this.status, this.response)
        try {
          const errorData = JSON.parse(this.response)
          alert('Error: ' + (errorData.error || 'Unknown error'))
        } catch (e) {
          alert('Error: Server returned status ' + this.status)
        }
      }
    }
  })
  
  oReq.addEventListener('error', function() {
    console.error('Network error occurred')
    alert('Network error: Unable to connect to server')
  })
  
  oReq.open('GET', settings.backendUrl + uri + buildQueryString(params))
  if (authToken) {
    oReq.setRequestHeader('Authorization', 'Bearer ' + authToken)
  }
  oReq.send()
}
```

### User Input Validation

```javascript
function validateFileSize(input) {
  const file = input.files[0]
  if (file) {
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 10MB.')
      input.value = ''
      return false
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPG, PNG, or WebP).')
      input.value = ''
      return false
    }
  }
  return true
}
```

## 12. State Management Patterns

### Global State Updates

```javascript
function updateAuthUI() {
  const userInfo = document.getElementById('user-info')
  const authButtons = document.getElementById('auth-buttons')
  const usernameDisplay = document.getElementById('username-display')

  if (currentUser) {
    userInfo.classList.remove('hidden')
    authButtons.classList.add('hidden')
    usernameDisplay.textContent = currentUser.username
  } else {
    userInfo.classList.add('hidden')
    authButtons.classList.remove('hidden')
  }
}

function updateTimeFilterButtonState() {
  if (!timeFilterBtn) return
  
  const svg = timeFilterBtn.querySelector('svg')
  if (timeFilterEnabled) {
    // Enabled state styling
    timeFilterBtn.style.background = '#3b82f6'
    svg.querySelector('circle').setAttribute('stroke', '#ffffff')
  } else {
    // Disabled state styling
    timeFilterBtn.style.background = '#ffffff'
    svg.querySelector('circle').setAttribute('stroke', '#6b7280')
  }
}
```

## 13. Utility Functions

### Date Formatting

```javascript
function formatDate(timestamp) {
  return moment(timestamp).format('D MMM YYYY, HH:mm')
}

function setDisplayedTime(newTime) {
  if (parseInt(displayedTime) === parseInt(newTime)) return
  
  // Clear existing markers
  Object.keys(markers).forEach(locId => {
    markers[locId].markerObject.setMap(null)
    markers[locId].markerObject = null
  })
  markers = {}
  
  displayedTime = parseInt(newTime)
  loadReportsFromAPI()

  // Update UI elements
  const ctrlDateEl = document.querySelector('#controls-date')
  const ctrlHourEl = document.querySelector('#controls-hour')
  ctrlDateEl.innerHTML = moment(parseInt(newTime), 'X').format('D. MMM.')
  ctrlHourEl.innerHTML = moment(parseInt(newTime), 'X').format('HH:mm')
}
```

### Distance Calculations

```javascript
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Earth radius in meters
  const toRad = x => x * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
```

## 14. Code Organization Principles

### 1. **Separation of Concerns**
- HTML: Structure and content
- CSS: Presentation and styling
- JavaScript: Behavior and logic

### 2. **Modular Architecture**
- Each major feature in its own file
- Clear interfaces between modules
- Minimal dependencies between files

### 3. **Progressive Enhancement**
- Core functionality works without JavaScript
- Enhanced features added progressively
- Graceful degradation for older browsers

### 4. **Performance First**
- Minimal external dependencies
- Efficient DOM manipulation
- Optimized API calls with debouncing
- Lazy loading of non-critical features

### 5. **Mobile-First Design**
- Responsive design from the ground up
- Touch-friendly interface elements
- Optimized for mobile performance

This code explanation provides a comprehensive understanding of how the Dhaka Alert frontend is structured and implemented, covering all major components and architectural decisions. 