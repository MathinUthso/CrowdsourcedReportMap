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
let timeFilterEnabled = false;

// --- Routing UI State ---
let routingStart = null;
let routingEnd = null;
let routingPicking = null; // 'start' or 'end'
let routingPolyline = null;
let routingAMarker = null;
let routingBMarker = null;
let routingConflictMarkers = [];
let routingMode = false;

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
    // Only include params with non-empty, non-null, non-undefined values
    let filteredParams = params ? Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '').reduce((acc, k) => { acc[k] = params[k]; return acc; }, {}) : {};
    oReq.open('GET', settings.backendUrl + uri + (Object.keys(filteredParams).length ? '?' + Object.keys(filteredParams).map(k => k + '=' + encodeURIComponent(filteredParams[k])).join('&') : ''))
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

  // --- Modern Upvote/Downvote UI for report info window ---
  function getVoteBoxHtml(reportId, userVote, status, netVotes) {
    // status: 'verified', 'pending', 'unverified'
    // userVote: 'upvote', 'downvote', or null
    let statusIcon = '';
    if (status === 'verified') {
      statusIcon = '<div style="margin-top:1.3em;font-size:2em;color:#22c55e;">✔</div>';
    } else if (status === 'pending') {
      statusIcon = '<div style="margin-top:1.3em;font-size:2em;color:#888;">⏳</div>';
    } else if (status === 'unverified') {
      statusIcon = '<div style="margin-top:1.3em;font-size:2em;color:#e11d48;">❌</div>';
    }
    // SVGs for arrows
    const upArrow = userVote === 'upvote'
      ? `<svg width='18' height='18' viewBox='0 0 24 24' style='display:block;' fill='#2563eb' stroke='#2563eb' stroke-width='2'><polygon points='12,5 5,17 19,17'/></svg>`
      : `<svg width='18' height='18' viewBox='0 0 24 24' style='display:block;' fill='none' stroke='#2563eb' stroke-width='2'><polygon points='12,5 5,17 19,17'/></svg>`;
    const downArrow = userVote === 'downvote'
      ? `<svg width='18' height='18' viewBox='0 0 24 24' style='display:block;' fill='#e11d48' stroke='#e11d48' stroke-width='2'><polygon points='12,19 5,7 19,7'/></svg>`
      : `<svg width='18' height='18' viewBox='0 0 24 24' style='display:block;' fill='none' stroke='#e11d48' stroke-width='2'><polygon points='12,19 5,7 19,7'/></svg>`;
    // Net votes: show +N for positive, -N for negative, 0 for zero
    let netVotesDisplay = netVotes > 0 ? '+' + netVotes : netVotes;
    return `
      <div class=\"vote-box\" style=\"display:flex;flex-direction:column;align-items:center;gap:0.08em;margin-left:0.7em;user-select:none;width:1.7em;min-width:1.7em;\">
        <button onclick=\"voteOnReport(${reportId}, 'upvote')\" class=\"vote-arrow upvote\" style=\"background:none;border:none;cursor:pointer;padding:0;margin:0;line-height:1;\">${upArrow}</button>
        <div class=\"vote-count\" style=\"font-size:0.85em;font-weight:600;color:#222;min-width:1.2em;text-align:center;\">${netVotesDisplay}</div>
        <button onclick=\"voteOnReport(${reportId}, 'downvote')\" class=\"vote-arrow downvote\" style=\"background:none;border:none;cursor:pointer;padding:0;margin:0;line-height:1;\">${downArrow}</button>
        ${statusIcon}
      </div>
    `;
  }

  // Patch: updateReportVoteDisplay for new UI
  function updateReportVoteDisplay(reportId, voteData) {
    const voteContainer = document.getElementById('vote-container-' + reportId)
    if (voteContainer) {
      const upvotes = voteData.summary?.find(v => v.vote_type === 'upvote')?.count || 0;
      const downvotes = voteData.summary?.find(v => v.vote_type === 'downvote')?.count || 0;
      const verifications = voteData.summary?.find(v => v.vote_type === 'verify')?.count || 0;
      const totalVotes = voteData.votes?.length || 0;
      let status = 'unverified';
      if (upvotes >= 5) status = 'verified';
      else if (totalVotes > 0) status = 'pending';
      // Find the user's vote (if any)
      let userVote = null;
      if (voteData.votes && Array.isArray(voteData.votes) && currentUser) {
        const myVote = voteData.votes.find(v => v.username === currentUser.username);
        if (myVote) userVote = myVote.vote_type;
      }
      const netVotes = upvotes - downvotes;
      voteContainer.innerHTML = getVoteBoxHtml(reportId, userVote, status, netVotes);
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

    const params = {
      latmin: sw.lat(),
      lonmin: sw.lng(),
      latmax: ne.lat(),
      lonmax: ne.lng(),
      ...(!timeFilterEnabled ? { show_all: 1 } : {})
    };
    if (timeFilterEnabled && Number.isInteger(displayedTime)) {
      params.time = displayedTime;
    }
    requestAPIGet ('/reports', params, (response) => {
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
              content += '<div style="display:flex;flex-direction:row;align-items:center;gap:0.7rem;margin-bottom:0.5rem;">';
              content += '<div style="flex:1;">';
              if (loc.type_name) content += '<span style="font-size:0.98rem;background:#f3f6fa;padding:0.18em 0.7em;border-radius:1em;font-weight:500;">' + loc.type_name + '</span>';
              if (loc.confidence_level) content += '<span style="font-size:0.98rem;color:#888;">' + loc.confidence_level.charAt(0).toUpperCase() + loc.confidence_level.slice(1) + '</span>';
              content += '</div>';
              // Vote box placeholder on the right
              content += `<div id="vote-container-${loc.id}" style="min-width:1.7em;"></div>`;
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

    // Routing UI event listeners
    const startInput = document.getElementById('route-start');
    const endInput = document.getElementById('route-end');
    const pickStartBtn = document.getElementById('pick-start-btn');
    const pickEndBtn = document.getElementById('pick-end-btn');
    const routeBtn = document.getElementById('route-btn');

    if (pickStartBtn) {
      pickStartBtn.onclick = function() {
        routingPicking = 'start';
        pickStartBtn.style.background = '#2563eb';
        pickStartBtn.style.color = '#fff';
        pickEndBtn.style.background = '';
        pickEndBtn.style.color = '';
        map.setOptions({ draggableCursor: 'crosshair' });
      };
    }
    if (pickEndBtn) {
      pickEndBtn.onclick = function() {
        routingPicking = 'end';
        pickEndBtn.style.background = '#2563eb';
        pickEndBtn.style.color = '#fff';
        pickStartBtn.style.background = '';
        pickStartBtn.style.color = '';
        map.setOptions({ draggableCursor: 'crosshair' });
      };
    }
    if (routeBtn) {
      routeBtn.onclick = function() {
        fetchAndDisplayRoute();
      };
    }

    // Allow manual entry of coordinates
    if (startInput) {
      startInput.addEventListener('change', function() {
        const val = startInput.value.trim();
        if (/^-?\d+\.\d+,-?\d+\.\d+$/.test(val)) {
          const [lat, lng] = val.split(',').map(Number);
          routingStart = { lat, lng };
          setRoutingMarker('A', { lat, lng });
        }
      });
    }
    if (endInput) {
      endInput.addEventListener('change', function() {
        const val = endInput.value.trim();
        if (/^-?\d+\.\d+,-?\d+\.\d+$/.test(val)) {
          const [lat, lng] = val.split(',').map(Number);
          routingEnd = { lat, lng };
          setRoutingMarker('B', { lat, lng });
        }
      });
    }

    // Add Google Maps Places Autocomplete to A and B inputs
    if (window.google && google.maps.places) {
      if (startInput) {
        const autocompleteA = new google.maps.places.Autocomplete(startInput);
        autocompleteA.addListener('place_changed', function() {
          const place = autocompleteA.getPlace();
          if (place && place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            routingStart = { lat, lng };
            setRoutingMarker('A', { lat, lng });
            startInput.value = place.formatted_address || (lat + ',' + lng);
          }
        });
      }
      if (endInput) {
        const autocompleteB = new google.maps.places.Autocomplete(endInput);
        autocompleteB.addListener('place_changed', function() {
          const place = autocompleteB.getPlace();
          if (place && place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            routingEnd = { lat, lng };
            setRoutingMarker('B', { lat, lng });
            endInput.value = place.formatted_address || (lat + ',' + lng);
          }
        });
      }
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

// Map click handler for picking A/B
function handleRoutingMapClick(e) {
  if (!routingPicking) return;
  const lat = e.latLng.lat();
  const lng = e.latLng.lng();
  if (routingPicking === 'start') {
    routingStart = { lat, lng };
    document.getElementById('route-start').value = lat.toFixed(6) + ',' + lng.toFixed(6);
    setRoutingMarker('A', { lat, lng });
  } else if (routingPicking === 'end') {
    routingEnd = { lat, lng };
    document.getElementById('route-end').value = lat.toFixed(6) + ',' + lng.toFixed(6);
    setRoutingMarker('B', { lat, lng });
  }
  routingPicking = null;
  document.getElementById('pick-start-btn').style.background = '';
  document.getElementById('pick-start-btn').style.color = '';
  document.getElementById('pick-end-btn').style.background = '';
  document.getElementById('pick-end-btn').style.color = '';
  map.setOptions({ draggableCursor: '' });
}

// Clean map click handler: only routing or only report logic
const _origInit = init;
init = function() {
  _origInit.apply(this, arguments);
  if (map) {
    // Remove all previous click listeners
    google.maps.event.clearListeners(map, 'click');
    // Attach a single, robust click handler
    map.addListener('click', function(e) {
      if (routingMode) {
        if (routingPicking) {
          handleRoutingMapClick(e);
        }
        // Never show report popup in routing mode
        return;
      }
      // --- Normal report-adding logic below ---
      closeAddReportInterface();
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
    });
  }
};

// Helper: Generate multiple detour waypoints in a circle around a conflict
function generateDetourWaypoints(conflict, radiusMeters = 500, numPoints = 8) {
  const R = 6371000; // Earth radius in meters
  const detours = [];
  const lat = conflict.lat * Math.PI / 180;
  const lon = conflict.lon * Math.PI / 180;
  for (let i = 0; i < numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    const dLat = (radiusMeters / R) * Math.cos(angle);
    const dLon = (radiusMeters / R) * Math.sin(angle) / Math.cos(lat);
    const detourLat = (lat + dLat) * 180 / Math.PI;
    const detourLon = (lon + dLon) * 180 / Math.PI;
    detours.push({ lat: detourLat, lng: detourLon });
  }
  return detours;
}

// --- Routing logic: fetch and display route with multi-detour ---
async function fetchAndDisplayRoute() {
  console.log('fetchAndDisplayRoute called');
  if (!routingStart || !routingEnd) {
    alert('Start or end point missing.');
    return;
  }
  if (!window.google || !google.maps || !google.maps.DirectionsService) {
    alert('Google DirectionsService is not available. Check if the Maps API is loaded and the API key is valid.');
    console.error('Google DirectionsService missing:', window.google, google.maps);
    return;
  }
  const directionsService = new google.maps.DirectionsService();
  let bestRoute = null;
  let minConflicts = Infinity;
  let bestConflicts = null;
  let bestWaypoints = [];
  let attempts = 0;
  let triedWaypoints = new Set();
  let queue = [[]]; // Each item is an array of waypoints
  const MAX_ATTEMPTS = 20;
  while (queue.length > 0 && attempts < MAX_ATTEMPTS) {
    const waypoints = queue.shift();
    const request = {
      origin: routingStart,
      destination: routingEnd,
      travelMode: google.maps.TravelMode.DRIVING,
      waypoints: waypoints.length ? waypoints : undefined
    };
    attempts++;
    console.log(`[ROUTING] Attempt ${attempts}, Request:`, request);
    // eslint-disable-next-line no-await-in-loop
    const result = await new Promise(resolve => {
      directionsService.route(request, (res, status) => {
        resolve({res, status});
      });
    });
    if (result.status === 'OK' && result.res.routes && result.res.routes.length > 0) {
      const route = result.res.routes[0].overview_path;
      if (!route || !Array.isArray(route) || route.length === 0) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const conflicts = await checkRouteForConflicts(route, true); // true = return conflicts
      if (conflicts.length < minConflicts) {
        minConflicts = conflicts.length;
        bestRoute = route;
        bestConflicts = conflicts;
        bestWaypoints = waypoints;
      }
      if (conflicts.length === 0) {
        drawRoutingPolyline(route);
        map.fitBounds(new google.maps.LatLngBounds(routingStart, routingEnd));
        clearRoutingConflictMarkers();
        return;
      } else {
        // For each conflict, try multiple detours in a circle
        for (const conflict of conflicts) {
          const detours = generateDetourWaypoints(conflict, 500, 8);
          for (const detour of detours) {
            const key = detour.lat.toFixed(6) + ',' + detour.lng.toFixed(6);
            if (!triedWaypoints.has(key)) {
              triedWaypoints.add(key);
              queue.push([...(waypoints || []), { location: detour, stopover: false }]);
            }
          }
        }
      }
    } else {
      // No route found for this set of waypoints, try next
      continue;
    }
  }
  // If here, no conflict-free route found after all attempts
  if (bestRoute) {
    drawRoutingPolyline(bestRoute);
    map.fitBounds(new google.maps.LatLngBounds(routingStart, routingEnd));
    await checkRouteForConflicts(bestRoute, false); // show markers and alert
    alert('Warning: Could not find a conflict-free route. Showing best attempt.');
  } else {
    alert('No route found.');
  }
}

// Refactored: checkRouteForConflicts returns conflicts if returnList=true, else shows markers/alerts
async function checkRouteForConflicts(route, returnList) {
  clearRoutingConflictMarkers();
  const bounds = map.getBounds();
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const params = new URLSearchParams({
    latmin: sw.lat(),
    lonmin: sw.lng(),
    latmax: ne.lat(),
    lonmax: ne.lng(),
    show_all: 1
  });
  const url = settings.backendUrl + '/reports?' + params.toString();
  let conflicts = [];
  try {
    const resp = await fetch(url);
    conflicts = await resp.json();
  } catch (e) {
    if (!returnList) alert('Failed to fetch conflicts for route check.');
    return returnList ? [] : undefined;
  }
  // Only consider types that are conflicts
  const conflictTypes = ['BLOCKADE', 'PROTEST', 'FIRE', 'TRAFFIC JAM', 'VIP MOVEMENT', 'POLITICAL MOVEMENT'];
  const conflictPoints = conflicts.filter(r => conflictTypes.includes((r.type_name || '').toUpperCase()));
  let foundConflict = false;
  let foundLocations = [];
  for (const pt of route) {
    for (const c of conflictPoints) {
      const dist = haversineDistance(pt.lat(), pt.lng(), c.lat, c.lon);
      if (dist <= 500) {
        foundConflict = true;
        foundLocations.push(c);
        if (!returnList) {
          // Highlight conflict marker
          const marker = new google.maps.Marker({
            position: { lat: c.lat, lng: c.lon },
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#f59e42',
              fillOpacity: 1,
              strokeColor: '#c12525',
              strokeWeight: 3
            },
            title: (c.type_name || 'Conflict') + ' near route'
          });
          routingConflictMarkers.push(marker);
        }
      }
    }
  }
  if (!returnList && foundConflict) {
    alert('Warning: Route passes within 500 meters of a conflict!');
  }
  return foundLocations;
}

window.addEventListener('DOMContentLoaded', function() {
  const directionsBtn = document.getElementById('directions-btn');
  const routingUI = document.getElementById('routing-ui');
  if (directionsBtn && routingUI) {
    directionsBtn.onclick = function() {
      routingMode = true;
      routingUI.style.display = 'flex';
      directionsBtn.style.display = 'none';
      // Clear previous routing state
      routingStart = null;
      routingEnd = null;
      if (routingAMarker) { routingAMarker.setMap(null); routingAMarker = null; }
      if (routingBMarker) { routingBMarker.setMap(null); routingBMarker = null; }
      if (routingPolyline) { routingPolyline.setMap(null); routingPolyline = null; }
      clearRoutingConflictMarkers();
      document.getElementById('route-start').value = '';
      document.getElementById('route-end').value = '';
    };
  }
    // Add Cancel button to routing UI (only add once)
  if (!document.getElementById('cancel-routing-btn')) {
    let cancelBtn = document.createElement('button');
    cancelBtn.id = 'cancel-routing-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.marginLeft = '0.5em';
    cancelBtn.onclick = function() {
      routingMode = false;
      routingUI.style.display = 'none';
      directionsBtn.style.display = 'flex';
      routingPicking = null;
      document.getElementById('pick-start-btn').style.background = '';
      document.getElementById('pick-start-btn').style.color = '';
      document.getElementById('pick-end-btn').style.background = '';
      document.getElementById('pick-end-btn').style.color = '';
      map.setOptions({ draggableCursor: '' });
      if (routingPolyline) { routingPolyline.setMap(null); routingPolyline = null; }
      clearRoutingConflictMarkers();
    };
    routingUI.appendChild(cancelBtn);
  }
});

// After all assignments/wrapping of init, expose it globally:
window.init = init;

function setRoutingMarker(type, position) {
  if (type === 'A') {
    if (routingAMarker) routingAMarker.setMap(null);
    routingAMarker = new google.maps.Marker({
      position,
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#22c55e', // green
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3
      },
      title: 'Start (A)'
    });
  } else if (type === 'B') {
    if (routingBMarker) routingBMarker.setMap(null);
    routingBMarker = new google.maps.Marker({
      position,
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#ef4444', // red
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3
      },
      title: 'End (B)'
    });
  }
}

function clearRoutingConflictMarkers() {
  if (window.routingConflictMarkers && Array.isArray(window.routingConflictMarkers)) {
    window.routingConflictMarkers.forEach(m => m.setMap(null));
    window.routingConflictMarkers = [];
  } else {
    window.routingConflictMarkers = [];
  }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function drawRoutingPolyline(path) {
  if (window.routingPolyline) window.routingPolyline.setMap(null);
  window.routingPolyline = new google.maps.Polyline({
    path         : path,
    geodesic     : true,
    strokeColor  : '#2563eb',
    strokeOpacity: 0.85,
    strokeWeight : 6,
    map          : map
  });
  if (!window.routingPolyline) {
    alert('Failed to create polyline.');
  }
}
  
  