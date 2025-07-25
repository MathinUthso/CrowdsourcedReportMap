// my-reports-modal.js
(function() {
  // Utility to fetch report types if not loaded
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

  // Modal HTML structure
  function ensureMyReportsModal() {
    let modal = document.getElementById('my-reports-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'my-reports-modal';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div id="my-reports-modal-overlay" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.35);z-index:1000;">
        <div id="my-reports-modal-content" style="min-width:220px;max-width:700px;padding:1.2rem 1.5rem 1.2rem 1.5rem;border-radius:12px;box-shadow:0 2px 16px #0002;background:#fff;font-family:sans-serif;position:relative;margin:60px auto;">
          <button id="my-reports-modal-close" style="position:absolute;top:0.7em;right:1em;background:none;border:none;font-size:1.5em;cursor:pointer;line-height:1;">&times;</button>
          <h2 style="margin-top:0;margin-bottom:1em;">My Reports</h2>
          <div id="my-reports-modal-message" style="margin-bottom:1em;color:#c00;font-size:1.05em;"></div>
          <div id="my-reports-modal-list"></div>
        </div>
      </div>
    `;
    // Close on overlay or close button
    modal.querySelector('#my-reports-modal-close').onclick = closeMyReportsModal;
    modal.querySelector('#my-reports-modal-overlay').onclick = function(e) {
      if (e.target === this) closeMyReportsModal();
    };
  }

  function openMyReportsModal() {
    ensureMyReportsModal();
    document.getElementById('my-reports-modal').style.display = 'block';
    loadMyReportsModal();
  }
  function closeMyReportsModal() {
    document.getElementById('my-reports-modal').style.display = 'none';
  }

  function showModalMessage(msg, color = '#c00') {
    const el = document.getElementById('my-reports-modal-message');
    if (el) {
      el.textContent = msg;
      el.style.color = color;
    }
  }
  function clearModalMessage() { showModalMessage('', '#222'); }

  function loadMyReportsModal() {
    clearModalMessage();
    const listEl = document.getElementById('my-reports-modal-list');
    listEl.innerHTML = '<div style="text-align:center;padding:2em;">Loading...</div>';
    fetch(settings.backendUrl + '/my-reports', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          if (data.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;color:#888;">You have not added any reports yet.</div>';
            return;
          }
          let html = '<table style="width:100%;border-collapse:collapse;font-size:1em;">';
          html += '<tr style="background:#f5f6fa;"><th style="text-align:left;padding:0.5em 0.7em;">Title</th><th>Type</th><th>Status</th><th>Created</th><th>Actions</th></tr>';
          data.forEach(r => {
            html += `<tr style="border-bottom:1px solid #eee;" data-report-id="${r.id}">
              <td style="padding:0.5em 0.7em;">${r.title ? r.title : '<em>(No title)</em>'}</td>
              <td>${r.type_name || ''}</td>
              <td>${r.status || ''}</td>
              <td>${r.created_at ? new Date(r.created_at).toLocaleString() : ''}</td>
              <td>
                <button class="edit-btn" data-id="${r.id}" style="margin-right:0.5em;">Edit</button>
                <button class="delete-btn" data-id="${r.id}" style="background:#c00;color:#fff;">Delete</button>
              </td>
            </tr>`;
          });
          html += '</table>';
          listEl.innerHTML = html;
          // Event delegation for edit/delete
          listEl.onclick = function(e) {
            if (e.target.classList.contains('edit-btn')) {
              const btn = e.target;
              const id = btn.getAttribute('data-id');
              const rowEl = btn.closest('tr');
              const report = data.find(r => String(r.id) === String(id));
              if (report && rowEl) renderEditFormModal(report);
            }
            if (e.target.classList.contains('delete-btn')) {
              const btn = e.target;
              const id = btn.getAttribute('data-id');
              if (confirm('Are you sure you want to delete this report? This cannot be undone.')) {
                deleteReportModal(id);
              }
            }
          };
        } else {
          showModalMessage(data.error || 'Failed to load reports.');
          listEl.innerHTML = '';
        }
      })
      .catch(e => {
        showModalMessage('Network error.');
        listEl.innerHTML = '';
      });
  }

  function deleteReportModal(id) {
    clearModalMessage();
    fetch(settings.backendUrl + '/reports/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
    })
      .then(r => r.json())
      .then(data => {
        if (data && data.message) {
          showModalMessage('Report deleted.', '#2563eb');
          loadMyReportsModal();
        } else {
          showModalMessage(data.error || 'Failed to delete report.');
        }
      })
      .catch(e => {
        showModalMessage('Network error.');
      });
  }

  function renderEditFormModal(report) {
    // Use the same code as renderEditForm, but render inside a modal
    fetchReportTypesIfNeeded(() => {
      let currentImageHtml = '';
      if (report.media_url && report.media_url.includes('file_uploads/')) {
        const filename = report.media_url.split('file_uploads/').pop();
        const imageUrl = settings.backendUrl + '/uploads/' + filename;
        currentImageHtml = `<div style="margin-bottom:0.5em;"><img src="${imageUrl}" alt="Current image" style="width:100%;max-height:120px;border-radius:6px;box-shadow:0 1px 4px #aaa;" /></div>`;
      }
      const formHtml = `
        <form id="edit-report-form" style="margin:0;" enctype="multipart/form-data">
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
        </form>
      `;
      document.getElementById('my-reports-modal-list').innerHTML = formHtml;
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
      // Cancel handler
      document.getElementById('cancel-edit-btn').onclick = loadMyReportsModal;
      // Submit handler
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
              showModalMessage('Report updated.', '#2563eb');
              loadMyReportsModal();
            } else {
              showModalMessage(data.error || 'Failed to update report.');
            }
          })
          .catch(() => showModalMessage('Network error.'));
      };
    });
  }

  // Attach open handler
  document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('my-reports-btn');
    if (btn) {
      btn.onclick = openMyReportsModal;
    }
  });
})(); 