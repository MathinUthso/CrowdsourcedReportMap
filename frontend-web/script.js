window.projectMetadata = {};
let projectMetadata = window.projectMetadata;

const   isMobileDevice   = (screen.width <= 768)
const   isDarkMode       = (isMobileDevice && (moment().format('HH') >= 18 || moment().format('HH') <= 7))
let     markers          = {}
let     addReportMarker  = null
let     addReportTooltip = null
let     dbRequestTimeout = null
let     map              = null
let     displayedTime    = parseInt(moment().format('X'))
let     currentUser      = null
let     authToken        = localStorage.getItem('authToken')

// --- Control Bar State ---
let reportTypeFilter = 'all';
let verificationFilter = 'all';
let sortOrder = 'newest';
let timeFilterEnabled = true;

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
  function renderStatistics() {
    const statsEl = document.querySelector('#stats')
    if (!statsEl) return

    // Build report type options
    let typeOptions = '<option value="all">All Types</option>';
    if (projectMetadata && projectMetadata.reportTypes) {
      projectMetadata.reportTypes.forEach(t => {
        typeOptions += `<option value="${t.name}">${t.name}</option>`;
      });
    }

    // Build control bar HTML
    let content = `
      <div class="control-bar">
        <label style="margin-right:1em;">
          Type:
          <select id="report-type-filter">${typeOptions}</select>
        </label>
        <label style="margin-right:1em;">
          Verification:
          <select id="verification-filter">
            <option value="all">All</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="unverified">Unverified</option>
          </select>
        </label>
        <label style="margin-right:1em;">
          Sort:
          <select id="sort-order">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="upvotes">Most Upvoted</option>
          </select>
        </label>
        <button id="apply-filter-btn" style="margin-left:1em;">Apply Filter</button>
      </div>
    `;
    statsEl.innerHTML = content;

    // Set current values
    document.getElementById('report-type-filter').value = reportTypeFilter;
    document.getElementById('verification-filter').value = verificationFilter;
    document.getElementById('sort-order').value = sortOrder;

    // Remove onchange handlers from dropdowns, add click handler to button
    document.getElementById('apply-filter-btn').onclick = function() {
      reportTypeFilter = document.getElementById('report-type-filter').value;
      verificationFilter = document.getElementById('verification-filter').value;
      sortOrder = document.getElementById('sort-order').value;
      loadReportsFromAPI();
      // Hide the stats bar after applying filter
      const statsContainer = document.getElementById('stats-container');
      if (statsContainer) statsContainer.style.display = 'none';
    };
  }

  // Assigns a marker color based on report type
  function getMarkerColorFromType (type) {
    if (type === 'VEHICLES') return 'blue'
    if (type === 'AIRCRAFT') return 'teal'
    return 'red'
  }

  function getMarkerIconFromType (type) {
    const baseColor = getMarkerColorFromType(type);
    const scale = isMobileDevice ? 5:2;
    
    switch(type?.toUpperCase()) {
      case 'POLITICAL MOVEMENT':
        return {
          url: './Icons/political_movement.svg',
          scaledSize: new google.maps.Size(40, 40)
        };
      
      case 'ROAD BLOCKADE':
        return {
          url: './Icons/blockade.svg',
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20)
        };
      
      case 'PROTEST':
        return {
          url: './Icons/protest.svg',
          scaledSize: new google.maps.Size(40, 40)
        };
      
      case 'GENJAM':
        return {
          url: './Icons/Genjam.svg',
          scaledSize: new google.maps.Size(38, 38)
        };
      
      case 'VIP MOVEMENT':
        return {
          url: './Icons/vip.svg',
          scaledSize: new google.maps.Size(40, 40)
        };
      
      case 'FIRE':
        return {
          url: './Icons/fire.svg',
          scaledSize: new google.maps.Size(40, 40)
        };
      
      case 'TRAFFIC JAM':
        return {
          url       : './Icons/traffic_jam.svg',
          scaledSize: new google.maps.Size(40, 40)
        };
      
      default:
        return {
          path        : google.maps.SymbolPath.CIRCLE,
          fillColor   : baseColor,
          fillOpacity : 1,
          strokeColor : '#fff',
          strokeWeight: 2,
          scale       : scale
        };
    }
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
    if (authToken) {
      xhr.setRequestHeader('Authorization', 'Bearer ' + authToken);
    }
    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        loadingDiv.style.display = 'none';
        sendBtn.disabled = false;
        if (xhr.status === 200 || xhr.status === 201) {
          let reportId = null;
          try {
            const resp = JSON.parse(xhr.responseText);
            reportId = resp.report_id;
          } catch {}
          if (addReportTooltip) {
            addReportTooltip.setContent('<h2>Thank you!</h2><div>Your report has been added.</div>');
          }
          // Immediately add the marker for the new report
          if (reportId && map) {
            const lat = parseFloat(form.querySelector('input[name="lat"]').value);
            const lon = parseFloat(form.querySelector('input[name="lon"]').value);
            const typeName = form.querySelector('select[name="type"]').value;
            const title = form.querySelector('input[name="title"]').value;
            const description = form.querySelector('input[name="description"]').value;
            const marker = new google.maps.Marker({
              position: { lat, lng: lon },
              title: typeName || 'REPORT',
              map: map,
              icon: getMarkerIconFromType(typeName)
            });
            marker.addListener('click', function () {
              let content = '<div style="min-width:220px;max-width:320px;padding:1rem 1.2rem 1rem 1.2rem;border-radius:12px;box-shadow:0 2px 16px #0002;background:#fff;font-family:sans-serif;">';
              if (title) content += '<div style="font-size:1.15rem;font-weight:600;margin-bottom:0.3rem;line-height:1.2;">' + title + '</div>';
              content += '<div style="display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;">';
              if (typeName) content += '<span style="font-size:0.98rem;background:#f3f6fa;padding:0.18em 0.7em;border-radius:1em;font-weight:500;">' + typeName + '</span>';
              content += '</div>';
              if (description) content += '<div style="font-size:0.97rem;color:#444;margin-bottom:0.2rem;">' + description + '</div>';
              content += '</div>';
              if (addReportTooltip) addReportTooltip.close();
              const infoWindow = new google.maps.InfoWindow({ content });
              infoWindow.open({ anchor: marker, map, shouldFocus: false });
            });
            marker.addListener('click', function () { marker.infoWindow && marker.infoWindow.close(); });
            // Optionally, open the info window immediately
            google.maps.event.trigger(marker, 'click');
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
      time: displayedTime,
      ...(!timeFilterEnabled ? { show_all: 1 } : {})
    }, (response) => {
      const locations = JSON.parse(response)
      // --- Apply control bar filters ---
      let filtered = locations;
      // Type filter
      if (reportTypeFilter !== 'all') {
        filtered = filtered.filter(loc => loc.type_name === reportTypeFilter);
      }
      // Verification filter
      if (verificationFilter !== 'all') {
        filtered = filtered.filter(loc => {
          const upvotes = loc.summary?.find(v => v.vote_type === 'upvote')?.count || 0;
          const verifications = loc.summary?.find(v => v.vote_type === 'verify')?.count || 0;
          const totalVotes = loc.votes?.length || 0;
          if (verificationFilter === 'verified') return (upvotes >= 5 || verifications >= 3);
          if (verificationFilter === 'pending') return (totalVotes > 0 && upvotes < 5 && verifications < 3);
          if (verificationFilter === 'unverified') return (totalVotes === 0);
          return true;
        });
      }
      // Sort order
      if (sortOrder === 'newest') {
        filtered = filtered.sort((a, b) => (b.valid_from || 0) - (a.valid_from || 0));
      } else if (sortOrder === 'oldest') {
        filtered = filtered.sort((a, b) => (a.valid_from || 0) - (b.valid_from || 0));
      } else if (sortOrder === 'upvotes') {
        filtered = filtered.sort((a, b) => {
          const aUp = a.summary?.find(v => v.vote_type === 'upvote')?.count || 0;
          const bUp = b.summary?.find(v => v.vote_type === 'upvote')?.count || 0;
          return bUp - aUp;
        });
      }
      // --- Remove all existing markers from the map ---
      Object.keys(markers).forEach(locId => {
        if (markers[locId].markerObject) {
          markers[locId].markerObject.setMap(null);
        }
      });
      markers = {};
      // Use filtered instead of locations for display
      if (filtered && filtered.length) {
        filtered.forEach(loc => {
          console.log('Report:', loc.id, 'Media URL:', loc.media_url) // Debug log
          if (!markers[loc.id]) {
            const reportAgeMinutes = moment(displayedTime, 'X').diff(loc.valid_from, 'minutes')
            markers[loc.id] = loc
            markers[loc.id].markerObject = new google.maps.Marker({
              position: new google.maps.LatLng(loc.lat, loc.lon),
              title: loc.type_name || 'REPORT',
              map: map,
              icon: getMarkerIconFromType(loc.type_name)
            });
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
      zoom: settings.mapDefaultZoom || 9,
      center: settings.mapDefaultLocation,
      mapTypeId: 'roadmap',
      controlSize: isMobileDevice ? 80 : undefined,
      styles: stylesNightMode,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_TOP
      },
      fullscreenControl: false,
      streetViewControl: false,
      mapId: '55fdbe5b069cc36d75c6e2d6'
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
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 3
            },
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
      content += '<label>Confidence Level:<br>'
      content += '<select name="confidence_level" style="width:100%;margin-bottom:8px;">'
      content += '<option value="high">High - I am certain about this</option>'
      content += '<option value="medium" selected>Medium - I am fairly sure</option>'
      content += '<option value="low">Low - I am not very sure</option>'
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
      content += '<input type="url" name="mediaurl" placeholder="Paste Facebook, Twitter, or YouTube link" style="width:100%;margin-bottom:8px;"></input>'
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
  script.src = 'https://maps.googleapis.com/maps/api/js?key=' + settings.googleMapsAPIKey + '&callback=init&libraries=marker'
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

  // Helper for animated heart-pulse marker
  function createHeartPulseMarker() {
    const div = document.createElement('div');
    div.className = 'heart-pulse-marker';
    div.innerHTML = `
      <div class="pulse"></div>
      <svg class="icon" viewBox="0 0 32 32" fill="#ff0046" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 29s-13-8.14-13-17A7 7 0 0 1 16 5a7 7 0 0 1 13 7c0 8.86-13 17-13 17z"/>
      </svg>
    `;
    return div;
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

  const statsContainer = document.getElementById('stats-container');
  const toggleStatsBtn = document.getElementById('toggle-stats-btn');
  if (toggleStatsBtn && statsContainer) {
    toggleStatsBtn.onclick = function() {
      if (statsContainer.style.display === 'none' || statsContainer.style.display === '') {
        statsContainer.style.display = 'block';
        if (typeof renderStatistics === 'function') renderStatistics();
      } else {
        statsContainer.style.display = 'none';
      }
    };
  }

  // Time filter toggle
  const timeFilterBtn = document.getElementById('time-filter-btn');
  const controlsDiv = document.getElementById('controls');
  if (timeFilterBtn && controlsDiv) {
    // Set initial state
    updateTimeFilterButtonState();
    
    timeFilterBtn.onclick = function() {
      timeFilterEnabled = !timeFilterEnabled;
      updateTimeFilterButtonState();
      
      if (timeFilterEnabled) {
        controlsDiv.style.display = 'block';
      } else {
        controlsDiv.style.display = 'none';
      }
      // Reload reports with new filter
      if (typeof loadReportsFromAPI === 'function') loadReportsFromAPI();
    };
  }

  function updateTimeFilterButtonState() {
    if (!timeFilterBtn) return;
    
    const svg = timeFilterBtn.querySelector('svg');
    if (timeFilterEnabled) {
      // Enabled state - blue colors
      timeFilterBtn.style.background = '#3b82f6';
      timeFilterBtn.style.borderColor = '#2563eb';
      svg.querySelector('circle').setAttribute('stroke', '#ffffff');
      svg.querySelector('polyline').setAttribute('stroke', '#ffffff');
      timeFilterBtn.title = 'Time Filter: Enabled (Click to disable)';
    } else {
      // Disabled state - gray colors
      timeFilterBtn.style.background = '#ffffff';
      timeFilterBtn.style.borderColor = '#e5e7eb';
      svg.querySelector('circle').setAttribute('stroke', '#6b7280');
      svg.querySelector('polyline').setAttribute('stroke', '#6b7280');
      timeFilterBtn.title = 'Time Filter: Disabled (Click to enable)';
    }
  }
});
  
  