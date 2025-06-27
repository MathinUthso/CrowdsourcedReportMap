// my-reports-dropdown.js
(function() {
  let dropdownOpen = false;
  let highlightedMarkerId = null;
  let editInfoWindow = null;

  function fetchReportTypesIfNeeded(cb) {
    if (window.projectMetadata && window.projectMetadata.reportTypes) return cb();
    fetch(settings.backendUrl + '/metadata')
      .then(r => r.json())
      .then(data => {
        window.projectMetadata = data;
        cb();
      })
      .catch(() => cb());
  }

  function showDropdown() {
    const btn = document.getElementById('my-reports-btn');
    const dropdown = document.getElementById('my-reports-dropdown');
    if (!btn || !dropdown) return;
    // Position dropdown below and right-aligned to the button
    const rect = btn.getBoundingClientRect();
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    dropdown.style.display = 'block';
    dropdown.style.top = (rect.bottom + scrollTop) + 'px';
    // Try to align right edge of dropdown to right edge of button
    const dropdownWidth = dropdown.offsetWidth || 320;
    let left = rect.right + scrollLeft - dropdownWidth;
    if (left < 20) left = 20; // Don't go off left edge
    dropdown.style.left = left + 'px';
    dropdown.style.right = '';
    dropdownOpen = true;
    loadMyReportsDropdown();
  }
  function hideDropdown() {
    const dropdown = document.getElementById('my-reports-dropdown');
    if (dropdown) dropdown.style.display = 'none';
    dropdownOpen = false;
    unhighlightMarker();
    if (editInfoWindow) editInfoWindow.close();
  }

  function loadMyReportsDropdown() {
    const dropdown = document.getElementById('my-reports-dropdown');
    dropdown.innerHTML = '<div style="padding:1em;text-align:center;">Loading...</div>';
    fetch(settings.backendUrl + '/my-reports', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          if (data.length === 0) {
            dropdown.innerHTML = '<div style="padding:1em;text-align:center;color:#888;">You have not added any reports yet.</div>';
            return;
          }
          let html = '<div style="max-height:350px;overflow-y:auto;">';
          html += '<table style="width:100%;border-collapse:collapse;font-size:1em;background:#fff;">';
          html += '<tr style="background:#f5f6fa;"><th style="text-align:left;padding:0.5em 0.7em;">Title</th><th>Type</th><th>Status</th><th>Actions</th></tr>';
          data.forEach(r => {
            html += `<tr class="my-report-row" data-report-id="${r.id}" style="border-bottom:1px solid #eee;cursor:pointer;">
              <td style="padding:0.5em 0.7em;">${r.title ? r.title : '<em>(No title)</em>'}</td>
              <td>${r.type_name || ''}</td>
              <td>${r.status || ''}</td>
              <td>
                <button class="edit-btn" data-id="${r.id}" style="margin-right:0.5em;">Edit</button>
                <button class="delete-btn" data-id="${r.id}" style="background:#c00;color:#fff;">Delete</button>
              </td>
            </tr>`;
          });
          html += '</table></div>';
          dropdown.innerHTML = html;
          // Event delegation for hover, edit, delete
          dropdown.onclick = function(e) {
            if (e.target.classList.contains('edit-btn')) {
              e.stopPropagation();
              const id = e.target.getAttribute('data-id');
              const report = data.find(r => String(r.id) === String(id));
              if (report) openEditReportModal(report);
            }
            if (e.target.classList.contains('delete-btn')) {
              e.stopPropagation();
              const id = e.target.getAttribute('data-id');
              if (confirm('Are you sure you want to delete this report? This cannot be undone.')) {
                deleteReportDropdown(id);
              }
            }
          };
          // Highlight marker on hover
          dropdown.querySelectorAll('.my-report-row').forEach(row => {
            row.onmouseenter = function() {
              const id = row.getAttribute('data-report-id');
              highlightMarker(id);
            };
            row.onmouseleave = function() {
              unhighlightMarker();
            };
            // Add hover for edit button
            const editBtn = row.querySelector('.edit-btn');
            if (editBtn) {
              editBtn.onmouseenter = function(e) {
                e.stopPropagation();
                const id = row.getAttribute('data-report-id');
                highlightMarker(id);
              };
              editBtn.onmouseleave = function(e) {
                e.stopPropagation();
                unhighlightMarker();
              };
            }
          });
        } else {
          dropdown.innerHTML = '<div style="padding:1em;text-align:center;color:#c00;">' + (data.error || 'Failed to load reports.') + '</div>';
        }
      })
      .catch(e => {
        dropdown.innerHTML = '<div style="padding:1em;text-align:center;color:#c00;">Network error.</div>';
      });
  }

  function highlightMarker(reportId) {
    unhighlightMarker();
    if (markers && markers[reportId] && markers[reportId].markerObject) {
      const marker = markers[reportId].markerObject;
      highlightedMarkerId = reportId;
      // Remove zoom effect, just pop (bounce) the marker
      marker.setZIndex(9999);
      if (window.google && window.google.maps && google.maps.Animation) {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => marker.setAnimation(null), 700); // bounce for 700ms
      }
    }
  }
  function unhighlightMarker() {
    if (highlightedMarkerId && markers && markers[highlightedMarkerId] && markers[highlightedMarkerId].markerObject) {
      const loc = markers[highlightedMarkerId];
      const marker = loc.markerObject;
      marker.setZIndex(undefined);
      if (window.google && window.google.maps && google.maps.Animation) {
        marker.setAnimation(null);
      }
    }
    highlightedMarkerId = null;
  }

  function openEditReportModal(report) {
    fetchReportTypesIfNeeded(() => {
      let currentImageHtml = '';
      if (report.media_url && report.media_url.includes('file_uploads/')) {
        const filename = report.media_url.split('file_uploads/').pop();
        const imageUrl = settings.backendUrl + '/uploads/' + filename;
        currentImageHtml = `<div style="margin-bottom:0.5em;"><img src="${imageUrl}" alt="Current image" style="width:100%;max-height:120px;border-radius:6px;box-shadow:0 1px 4px #aaa;" /></div>`;
      }
      let content = `<h2 style='margin-top:0;margin-bottom:1em;'>Edit Report</h2>
        <form id="edit-report-form" enctype="multipart/form-data" style="margin:0;">
          <label style="display:block;margin-bottom:0.5em;font-size:1.05em;">Title:<br>
            <input type="text" name="title" value="${report.title ? String(report.title).replace(/"/g,'&quot;') : ''}" style="width:100%;margin-bottom:8px;padding:0.5em;font-size:1em;border-radius:6px;border:1px solid #ccc;">
          </label>
          <label style="display:block;margin-bottom:0.5em;font-size:1.05em;">Description:<br>
            <input type="text" name="description" value="${report.description ? String(report.description).replace(/"/g,'&quot;') : ''}" style="width:100%;margin-bottom:8px;padding:0.5em;font-size:1em;border-radius:6px;border:1px solid #ccc;">
          </label>
          <label style="display:block;margin-bottom:0.5em;font-size:1.05em;">Type:<br>
            <select name="type_id" style="width:100%;margin-bottom:8px;padding:0.5em;font-size:1em;border-radius:6px;border:1px solid #ccc;">
              ${(projectMetadata && projectMetadata.reportTypes ? projectMetadata.reportTypes : []).map(t => `<option value="${t.id}"${t.name===report.type_name?' selected':''}>${t.name}</option>`).join('')}
            </select>
          </label>
          <label style="display:block;margin-bottom:0.5em;font-size:1.05em;">Confidence Level:<br>
            <select name="confidence_level" style="width:100%;margin-bottom:8px;padding:0.5em;font-size:1em;border-radius:6px;border:1px solid #ccc;">
              <option value="low"${report.confidence_level==='low'?' selected':''}>Low</option>
              <option value="medium"${!report.confidence_level||report.confidence_level==='medium'?' selected':''}>Medium</option>
              <option value="high"${report.confidence_level==='high'?' selected':''}>High</option>
            </select>
          </label>
          <label style="display:block;margin-bottom:0.5em;font-size:1.05em;">Photo:<br>
            <input type="file" name="mediafile" accept="image/*" style="margin-top: 5px; margin-bottom: 8px; width:100%;" id="edit-image-input">
            <div id="edit-image-preview" style="margin-bottom:8px;">${currentImageHtml}</div>
            <small style="color: #666; font-size: 0.8rem;">Max 10MB (JPG, PNG, WebP)</small>
          </label>
          <button type="submit" style="width:100%;margin-top:1em;padding:0.75rem;background-color:#0b0b0b;color:white;border:none;border-radius:0.25rem;cursor:pointer;font-size:1rem;font-weight:bold;">Save</button>
          <button type="button" id="cancel-edit-btn" style="width:100%;margin-top:0.5em;background:none;border:none;color:#2563eb;font-size:1em;cursor:pointer;">Cancel</button>
        </form>`;
      const modal = document.getElementById('edit-report-modal');
      const modalContent = document.getElementById('edit-report-modal-content');
      modalContent.innerHTML = content;
      modal.classList.remove('hidden');
      // Image preview handler
      const imageInput = document.getElementById('edit-image-input');
      const imagePreview = document.getElementById('edit-image-preview');
      imageInput.onchange = function() {
        imagePreview.innerHTML = '';
        if (imageInput.files && imageInput.files[0]) {
          const reader = new FileReader();
          reader.onload = function(e) {
            imagePreview.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:120px;border-radius:6px;box-shadow:0 1px 4px #aaa;" />`;
          };
          reader.readAsDataURL(imageInput.files[0]);
        }
      };
      document.getElementById('cancel-edit-btn').onclick = closeEditReportModal;
      document.getElementById('edit-report-form').onsubmit = function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        const hasImage = imageInput.files && imageInput.files[0];
        let url = settings.backendUrl + '/reports/' + report.id;
        let options = {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') },
          body: fd
        };
        if (!hasImage) {
          const body = {
            title: fd.get('title'),
            description: fd.get('description'),
            type_id: fd.get('type_id'),
            confidence_level: fd.get('confidence_level')
          };
          options = {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          };
        }
        fetch(url, options)
          .then(r => r.json())
          .then(data => {
            if (data && data.message) {
              closeEditReportModal();
              hideDropdown();
              if (typeof loadReportsFromAPI === 'function') loadReportsFromAPI();
            } else {
              alert(data.error || 'Failed to update report.');
            }
          })
          .catch(() => alert('Network error.'));
      };
    });
  }
  function closeEditReportModal() {
    const modal = document.getElementById('edit-report-modal');
    if (modal) modal.classList.add('hidden');
    document.getElementById('edit-report-modal-content').innerHTML = '';
  }

  function deleteReportDropdown(id) {
    fetch(settings.backendUrl + '/reports/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
    })
      .then(r => r.json())
      .then(data => {
        if (data && data.message) {
          hideDropdown();
          if (typeof loadReportsFromAPI === 'function') loadReportsFromAPI();
        } else {
          alert(data.error || 'Failed to delete report.');
        }
      })
      .catch(e => alert('Network error.'));
  }

  document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('my-reports-btn');
    if (btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        if (dropdownOpen) {
          hideDropdown();
        } else {
          showDropdown();
        }
      };
    }
    document.body.addEventListener('click', function(e) {
      if (dropdownOpen && !document.getElementById('my-reports-dropdown').contains(e.target) && e.target.id !== 'my-reports-btn') {
        hideDropdown();
      }
    });
  });
})(); 