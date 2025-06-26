const   isMobileDevice   = (screen.width <= 768)
const   isDarkMode       = (isMobileDevice && (moment().format('HH') >= 18 || moment().format('HH') <= 7))
let     markers          = {}
let     addReportMarker  = null
let     addReportTooltip = null
let     dbRequestTimeout = null
let     projectMetadata  = {}
let     map              = null
let     displayedTime    = parseInt(moment().format('X'))
let     currentUser      = null
let     authToken        = localStorage.getItem('authToken')

  // Authentication Functions
  function showLoginModal() {
    document.getElementById('auth-modal').classList.remove('hidden')
    showLoginForm()
  }

  function showSignupModal() {
    document.getElementById('auth-modal').classList.remove('hidden')
    showSignupForm()
  }

  function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden')
  }

  function showLoginForm() {
    document.getElementById('login-form').classList.remove('hidden')
    document.getElementById('signup-form').classList.add('hidden')
  }

  function showSignupForm() {
    document.getElementById('signup-form').classList.remove('hidden')
    document.getElementById('login-form').classList.add('hidden')
  }

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
        document.getElementById('login-username').value = ''
        document.getElementById('login-password').value = ''
      } else {
        alert('Login failed: ' + (data.error || 'Unknown error'))
      }
    })
  }

  function signup(event) {
    event.preventDefault()
    const username = document.getElementById('signup-username').value
    const email = document.getElementById('signup-email').value
    const password = document.getElementById('signup-password').value

    requestAPIPost('/auth/register', JSON.stringify({
      username: username,
      email: email,
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
        document.getElementById('signup-username').value = ''
        document.getElementById('signup-email').value = ''
        document.getElementById('signup-password').value = ''
      } else {
        alert('Signup failed: ' + (data.error || 'Unknown error'))
      }
    })
  }

  function logout() {
    authToken = null
    currentUser = null
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    updateAuthUI()
  }

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

  // Initialize auth state
  if (authToken && localStorage.getItem('user')) {
    currentUser = JSON.parse(localStorage.getItem('user'))
    updateAuthUI()
  }

  // Enhanced API request functions with authentication
  function requestAPIGet (uri, params, callback) {
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
    oReq.open('GET', settings.backendUrl + uri + ((params && Object.keys(params) && Object.keys(params).length) ? '?' + Object.keys(params).map(k => k + '=' + params[k]).join('&') : ''))
    if (authToken) {
      oReq.setRequestHeader('Authorization', 'Bearer ' + authToken)
    }
    oReq.send()
  }

  function requestAPIPost (uri, data, callback) {
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
    oReq.open('POST', settings.backendUrl + uri)
    oReq.setRequestHeader('Content-Type', 'application/json')
    if (authToken) {
      oReq.setRequestHeader('Authorization', 'Bearer ' + authToken)
    }
    oReq.send(data)
  }

  // Voting functions
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
        // Refresh the report data to show updated votes
        loadReportVotes(reportId)
      } else {
        alert('Vote failed: ' + (data.error || 'Unknown error'))
      }
    })
  }

  function loadReportVotes(reportId) {
    requestAPIGet('/reports/' + reportId + '/votes', null, (response) => {
      const data = JSON.parse(response)
      updateReportVoteDisplay(reportId, data)
    })
  }

  function updateReportVoteDisplay(reportId, voteData) {
    const voteContainer = document.getElementById('vote-container-' + reportId)
    if (voteContainer) {
      let voteHtml = '<div class="vote-section">'
      
      // Vote buttons
      voteHtml += '<div class="vote-buttons">'
      voteHtml += '<button onclick="voteOnReport(' + reportId + ', \'upvote\')" class="vote-btn upvote">👍 Upvote</button>'
      voteHtml += '<button onclick="voteOnReport(' + reportId + ', \'downvote\')" class="vote-btn downvote">👎 Downvote</button>'
      voteHtml += '<button onclick="voteOnReport(' + reportId + ', \'verify\')" class="vote-btn verify">✅ Verify</button>'
      voteHtml += '<button onclick="voteOnReport(' + reportId + ', \'dispute\')" class="vote-btn dispute">❌ Dispute</button>'
      voteHtml += '</div>'

      // Vote summary
      if (voteData.summary) {
        voteHtml += '<div class="vote-summary">'
        voteData.summary.forEach(vote => {
          voteHtml += '<span class="vote-count">' + vote.vote_type + ': ' + vote.count + '</span>'
        })
        voteHtml += '</div>'
      }

      // Verification status
      const upvotes = voteData.summary?.find(v => v.vote_type === 'upvote')?.count || 0
      const verifications = voteData.summary?.find(v => v.vote_type === 'verify')?.count || 0
      const totalVotes = voteData.votes?.length || 0

      if (upvotes >= 5 || verifications >= 3) {
        voteHtml += '<div class="verification-status verified">✅ Verified</div>'
      } else if (totalVotes > 0) {
        voteHtml += '<div class="verification-status pending">⏳ Pending Verification</div>'
      } else {
        voteHtml += '<div class="verification-status unverified">❓ Unverified</div>'
      }

      voteHtml += '</div>'
      voteContainer.innerHTML = voteHtml
    }
  }

  // Displays the numbers of valid reports for each hour in last 14 days in the timeline at the top
  function renderStatistics () {
    const statsEl = document.querySelector('#stats')
    if (statsEl && projectMetadata && projectMetadata.validReportsInTime) {
      const maxHeightPx = isMobileDevice ? 150 : 50
      let maxInHour = 0
      const validReports = isMobileDevice
        ? projectMetadata.validReportsInTime.slice(-48)
        : projectMetadata.validReportsInTime
      validReports.forEach(h => {
        if (parseInt(h.valid_reports) > maxInHour) maxInHour = parseInt(h.valid_reports)
      })
      let content = ''
      let previousDate = ''
      validReports.forEach(h => {
        const currentDate = moment(h.hour).format('D. MMM.')
        if (currentDate !== previousDate) {
          if (previousDate !== '') content += '<div class="stats-date-divider" style="height: ' + maxHeightPx + 'px;" >&nbsp;' + currentDate + '</div>'
          previousDate = currentDate
        }
        content += '<div class="stats-col' + ((moment(h.hour).isSame(moment(displayedTime, 'X'), 'hour')) ? ' is-displayed-time' : '') + '" style="height: ' + Math.round((h.valid_reports / maxInHour) * maxHeightPx) + 'px;" onclick="setDisplayedTime(' + moment(h.hour).format('X') + ')" title="' + moment(h.hour).format('D. MMM. YYYY HH:mm') + '"></div>'
      })

      content += '<div class="stats-title">Reports over time</div>'

      statsEl.innerHTML = content
    }
  }

  // Assigns a marker color based on report type
  function getMarkerColorFromType (type) {
    if (type === 'VEHICLES') return 'blue'
    if (type === 'AIRCRAFT') return 'teal'
    return 'red'
  }

  function setDisplayedTime (newTime) {
    if (parseInt(displayedTime) === parseInt(newTime)) return
    Object.keys(markers).forEach(locId => {
      markers[locId].markerObject.setMap(null)
      markers[locId].markerObject = null
    })
    markers = {}
    displayedTime = parseInt(newTime)
    loadReportsFromAPI()

    const ctrlDateEl = document.querySelector('#controls-date')
    const ctrlHourEl = document.querySelector('#controls-hour')
    const ctrlMinuteEl = document.querySelector('#controls-minute')
    ctrlDateEl.innerHTML = moment(parseInt(newTime), 'X').format('D. MMM.')
    ctrlHourEl.innerHTML = moment(parseInt(newTime), 'X').format('HH:mm')
    ctrlMinuteEl.innerHTML = moment(parseInt(newTime), 'X').format('HH:mm')

    renderStatistics()
  }

  function decrementHour (n = 1) {
    setDisplayedTime(displayedTime - (n * 3600))
  }

  function incrementHour (n = 1) {
    if (displayedTime + (n * 3600) <= moment().format('X')) {
      setDisplayedTime(displayedTime + (n * 3600))
    }
  }

  function getTweetIdFromUrl (url) {
    let urlAdjusted = url
    if (url.includes('?')) urlAdjusted = url.split('?')[0]
    const parts = urlAdjusted.split('/')
    return parts[parts.length - 1]
  }

  // Closes the tooltip for adding new reports
  function closeAddReportInterface () {
    if (addReportTooltip) addReportTooltip.close()
    if (addReportMarker) { addReportMarker.setMap(null); addReportMarker = null }
  }

  // Adds a new report using the API's POST /reports endpoint
  function addNewReport() {
    const form = document.querySelector('.report-add-form');
    const errorDiv = document.getElementById('report-error');
    const loadingDiv = document.getElementById('report-loading');
    const sendBtn = document.getElementById('send-report-btn');
    errorDiv.style.display = 'none';
    loadingDiv.style.display = 'block';
    sendBtn.disabled = true;

    const formData = new FormData(form);
    // Convert type name to type_id and update FormData
    const typeName = form.querySelector('select[name="type"]').value;
    const typeId = getTypeIdFromName(typeName);
    formData.delete('type');
    formData.append('type_id', typeId);

    // If mediaurl is provided, append it
    const mediaurl = form.querySelector('input[name="mediaurl"]').value;
    if (mediaurl) formData.append('mediaurl', mediaurl);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', settings.backendUrl + '/reports');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        loadingDiv.style.display = 'none';
        sendBtn.disabled = false;
        if (xhr.status === 200) {
          if (addReportTooltip) {
            addReportTooltip.setContent('<h2>Thank you!</h2><div>Your report has been added.</div>');
          }
          loadReportsFromAPI();
        } else {
          let data = {};
          try { data = JSON.parse(xhr.responseText); } catch {}
          errorDiv.textContent = data.error || 'Failed to add report.';
          errorDiv.style.display = 'block';
        }
      }
    };
    xhr.send(formData);
  }

  function getTypeIdFromName(typeName) {
    if (projectMetadata.reportTypes) {
      const type = projectMetadata.reportTypes.find(t => t.name === typeName)
      return type ? type.id : 1 // Default to first type
    }
    return 1
  }

  function validateFileSize(input) {
    const file = input.files[0]
    if (file) {
      const maxSize = 10 * 1024 * 1024 // 10MB in bytes
      if (file.size > maxSize) {
        alert('File is too large. Maximum size is 10MB.')
        input.value = '' // Clear the file input
        return false
      }
      
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPG, PNG, or WebP).')
        input.value = ''
        return false
      }
    }
    return true
  }

  // load reports from API, using current map's bounds
  function loadReportsFromAPI () {
    var bounds = map.getBounds()
    var ne = bounds.getNorthEast()
    var sw = bounds.getSouthWest()

    requestAPIGet ('/reports', {
      latmin: sw.lat(),
      lonmin: sw.lng(),
      latmax: ne.lat(),
      lonmax: ne.lng(),
      time: displayedTime
    }, (response) => {
      const locations = JSON.parse(response)
      console.log('Loaded reports:', locations) // Debug log
      if (locations && locations.length) {
        locations.forEach(loc => {
          console.log('Report:', loc.id, 'Media URL:', loc.media_url) // Debug log
          if (!markers[loc.id]) {
            const reportAgeMinutes = moment(displayedTime, 'X').diff(loc.valid_from, 'minutes')
            markers[loc.id] = loc
            markers[loc.id].markerObject = new google.maps.Marker({
              position: new google.maps.LatLng(loc.lat, loc.lon),
              label: {
                text: loc.type_name ? loc.type_name.toUpperCase()[0] : 'R',
                color: 'white'
              },
              title: loc.type_name || 'REPORT',
              map: map,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                strokeColor: loc.type_color || getMarkerColorFromType(loc.type_name),
                fillColor: loc.type_color || getMarkerColorFromType(loc.type_name),
                strokeWeight: 2,
                fillOpacity: (reportAgeMinutes <= 60) ? 1 : 0.35,
                strokeOpacity: (reportAgeMinutes <= 60) ? 1 : 0.45,
                scale: isMobileDevice ? 30 : 9
              }
            })
            markers[loc.id].markerObject.addListener('click', function (p) {
              // Modern, minimal info window content
              let content = '<div style="min-width:220px;max-width:320px;padding:1rem 1.2rem 1rem 1.2rem;border-radius:12px;box-shadow:0 2px 16px #0002;background:#fff;font-family:sans-serif;">';
              if (loc.title) content += '<div style="font-size:1.15rem;font-weight:600;margin-bottom:0.3rem;line-height:1.2;">' + loc.title + '</div>';
              if (loc.media_url && loc.media_url.includes('file_uploads/')) {
                const filename = loc.media_url.split('file_uploads/').pop();
                const imageUrl = settings.backendUrl + '/uploads/' + filename;
                console.log('[INFO WINDOW] media_url:', loc.media_url, 'imageUrl:', imageUrl);
                content += '<img src="' + imageUrl + '" alt="Report image" style="width:100%;max-height:160px;object-fit:cover;border-radius:8px;margin-bottom:0.7rem;box-shadow:0 1px 6px #0001;" onerror="console.error(\'Failed to load image:\', this.src);this.style.display=\'none\';">';
              }
              content += '<div style="display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;">';
              if (loc.type_name) content += '<span style="font-size:0.98rem;background:#f3f6fa;padding:0.18em 0.7em;border-radius:1em;font-weight:500;">' + loc.type_name + '</span>';
              if (loc.confidence_level) content += '<span style="font-size:0.98rem;color:#888;">' + loc.confidence_level.charAt(0).toUpperCase() + loc.confidence_level.slice(1) + '</span>';
              content += '</div>';
              if (loc.valid_from) content += '<div style="font-size:0.92rem;color:#888;margin-bottom:0.2rem;">' + moment(loc.valid_from).format('D MMM YYYY, HH:mm') + '</div>';
              if (loc.description) content += '<div style="font-size:0.97rem;color:#444;margin-bottom:0.2rem;">' + loc.description + '</div>';
              content += '</div>';
              // close other tooltips before opening this one
              if (addReportTooltip) addReportTooltip.close();
              Object.values(markers).forEach(m => { if (m.markerTooltip) m.markerTooltip.close(); });
              markers[loc.id].markerTooltip = new google.maps.InfoWindow({ content });
              markers[loc.id].markerTooltip.open({ anchor: markers[loc.id].markerObject, map, shouldFocus: false });
              loadReportVotes(loc.id);
            })
          }
        })
      }
    })
  }

  function init () {
    // create the map
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 5,
      center: settings.mapDefaultLocation,
      mapTypeId: 'roadmap',
      controlSize: isMobileDevice ? 80 : undefined,
      styles: isDarkMode ? stylesNightMode : undefined,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_TOP
      },
      fullscreenControl: false,
      streetViewControl: false
    })

    // try to center the map on current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        var latitude = position.coords.latitude
        var longitude = position.coords.longitude
        // only center on users location if it's within the bounding box
        // defined in settings.mapCenterOnUsersLocationInBounds. otherwise,
        // remain in the default map location
        if (latitude >= settings.mapCenterOnUsersLocationInBounds.latmin && latitude <= settings.mapCenterOnUsersLocationInBounds.latmax && longitude >= settings.mapCenterOnUsersLocationInBounds.lngmin && longitude <= settings.mapCenterOnUsersLocationInBounds.lngmax) {
          var coords = new google.maps.LatLng(latitude, longitude)
          map.setCenter(coords)
          new google.maps.Marker({
            position: coords,
            map: map,
            icon: './res/bluecircle.png',
            title: 'My Location'
          })
        } else {
          console.log('Current location(' + latitude + ',' + longitude +') is outside the bounding box where auto-centering is enabled. Keeping map at a default coordinates.')
        }
      })
    }

    // listen for map bounds change and reload the data (at most once per 1000ms)
    google.maps.event.addListener(map, 'bounds_changed', function () {
      if (dbRequestTimeout) {
        window.clearTimeout(dbRequestTimeout)
      }
      dbRequestTimeout = window.setTimeout(loadReportsFromAPI, 1000)
    })

    // listen for map click and create marker + open tooltip
    google.maps.event.addListener(map, 'click', (e) => {
      closeAddReportInterface()

      const someMarkerOpen = Object.values(markers).find(m => !!m.markerTooltip)
      if (someMarkerOpen) {
        someMarkerOpen.markerTooltip.close()
        someMarkerOpen.markerTooltip = null
        return false
      }

      if (!currentUser) {
        alert('Please login to add reports')
        return
      }

      addReportMarker = new google.maps.Marker({
        position: e.latLng,
        map: map,
        icon: './res/redcircle.png'
      })

      // prepare the tooltip content
      let content = '<h2>Adding a report:</h2>'
      content += '<form class="report-add-form" onsubmit="event.preventDefault(); addNewReport();">'
      content += '<input type="hidden" name="lat" value="' + e.latLng.lat() + '" />'
      content += '<input type="hidden" name="lon" value="' + e.latLng.lng() + '" />'
      content += '<label>Title:<br>'
      content += '<input type="text" name="title" placeholder="Brief title" required style="width:100%;margin-bottom:8px;"></input>'
      content += '</label>'
      content += '<label>What you see:<br>'
      content += '<select name="type" class="report-add-type" style="width:100%;margin-bottom:8px;">'
      if (projectMetadata.reportTypes) projectMetadata.reportTypes.forEach(t => {
        content += '<option value="' + t.name + '">' + t.name + '</option>'
      })
      content += '</select>'
      content += '</label>'
      content += '<label>Description (optional):<br>'
      content += '<input type="text" name="description" placeholder="Additional details" style="width:100%;margin-bottom:8px;"></input>'
      content += '</label>'
      content += '<label>Photo (optional):<br>'
      content += '<input type="file" name="mediafile" accept="image/*" style="margin-top: 5px; margin-bottom: 8px; width:100%;" onchange="previewImage(this)"></input>'
      content += '<div id="image-preview" style="margin-bottom:8px;"></div>'
      content += '<small style="color: #666; font-size: 0.8rem;">Max 10MB (JPG, PNG, WebP)</small>'
      content += '</label>'
      content += '<label>External Media Link (optional):<br>'
      content += '<input type="url" name="mediaurl" placeholder="Paste Twitter, Telegram, or YouTube link" style="width:100%;margin-bottom:8px;"></input>'
      content += '</label>'
      content += '<div id="report-error" style="color:red; font-size:0.9rem; margin-bottom:8px; display:none;"></div>'
      content += '<button type="submit" id="send-report-btn" style="width:100%;">Send Report</button>'
      content += '<div id="report-loading" style="display:none; text-align:center; margin-top:8px;">Sending...</div>'
      content += '</form>'

      // close other tooltips before opening this one
      Object.values(markers).forEach(m => {
        if (m.markerTooltip) {
          m.markerTooltip.close()
          m.markerTooltip = null
        }
      })

      addReportTooltip = new google.maps.InfoWindow({
        content
      })
      addReportTooltip.open({
        anchor: addReportMarker,
        map,
        shouldFocus: true
      })
      google.maps.event.addListener(addReportTooltip, 'closeclick', (e) => { closeAddReportInterface() })
    })

    setTimeout(() => {
      setDisplayedTime(parseInt(moment().format('X')))
    }, 1000)

    if (window.L && map) {
      addPulseMarker(23.8103, 90.4125); // Example: Dhaka
    }
  }

  // load project's metadata
  requestAPIGet ('/metadata', null, (response) => {
    if (response) {
      projectMetadata = JSON.parse(response)
      renderStatistics()
    }
  })

  // load Google Maps
  var script = document.createElement('script')
  script.src = 'https://maps.googleapis.com/maps/api/js?key=' + settings.googleMapsAPIKey + '&callback=init'
  script.async = true
  script.defer = true
  document.head.appendChild(script)

  // set the title according to settings
  if (settings.title && settings.title !== '') document.title = settings.title

  // set the about text according to settings
  const aboutEl = document.querySelector('#about')
  if (settings.aboutText && settings.aboutText !== '') {
    if (aboutEl) aboutEl.innerHTML = settings.aboutText
  } else {
    if (aboutEl) aboutEl.remove()
  }

  // Add these helper functions in the <script> section:
  function previewImage(input) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
        preview.innerHTML = '<img src="' + e.target.result + '" style="max-width:100%;max-height:120px;border-radius:6px;box-shadow:0 1px 4px #aaa;" />';
      }
      reader.readAsDataURL(input.files[0]);
    }
  }

  // Add a pulsing marker using the new SVG
  function addPulseMarker(lat, lng) {
    if (!window.L) return; // Only if using Leaflet
    const icon = L.icon({
      iconUrl: './res/pulse-marker.svg',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      className: 'pulse-marker-icon'
    });
    const marker = L.marker([lat, lng], { icon }).addTo(map);
    marker.bindPopup('Interactive Pulse Marker!');
    return marker;
  }

document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('current-location-btn');
  if (btn) {
    btn.addEventListener('click', function() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          if (window.google && window.google.maps && map) {
            map.setCenter({ lat, lng });
            if (!window._userLocationMarker) {
              window._userLocationMarker = new google.maps.Marker({
                position: { lat, lng },
                map: map,
                icon: './res/bluecircle.png',
                title: 'My Location',
                animation: google.maps.Animation.DROP
              });
            } else {
              window._userLocationMarker.setPosition({ lat, lng });
              window._userLocationMarker.setAnimation(google.maps.Animation.BOUNCE);
              setTimeout(() => window._userLocationMarker.setAnimation(null), 1200);
            }
          }
        }, function(error) {
          alert('Could not get your location. Please allow location access.');
        });
      } else {
        alert('Geolocation is not supported by your browser.');
      }
    });
  }
});
  
  