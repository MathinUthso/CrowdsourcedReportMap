"// comments.js - Handle comment functionality for reports" 

let currentReportId = null;
let comments = {};

// Load comments for a specific report
function loadComments(reportId) {
  if (!reportId) return;
  
  requestAPIGet(`/reports/${reportId}/comments`, {}, (response) => {
    const data = JSON.parse(response);
    comments[reportId] = data.comments || [];
    renderComments(reportId);
  });
}

// Render comments in the comments container
function renderComments(reportId) {
  const container = document.getElementById(`comments-container-${reportId}`);
  if (!container) return;
  
  const reportComments = comments[reportId] || [];
  
  let html = '<div class="comments-section">';
  
  // Comments list
  html += '<div class="comments-list">';
  if (reportComments.length === 0) {
    html += '<div class="no-comments">No comments yet. Be the first to comment!</div>';
  } else {
    reportComments.forEach(comment => {
      html += renderCommentItem(comment);
    });
  }
  html += '</div>';
  
  // Add comment form (only for logged in users)
  if (currentUser) {
    html += `
      <div class="add-comment-form">
        <textarea id="comment-input-${reportId}" placeholder="Add a comment..." maxlength="1000" rows="3"></textarea>
        <div class="comment-form-actions">
          <span class="char-count" id="char-count-${reportId}">0/1000</span>
          <button onclick="submitComment(${reportId})" class="submit-comment-btn">Post Comment</button>
        </div>
      </div>
    `;
  } else {
    html += '<div class="login-to-comment">Please <a href="#" onclick="showLoginModal()">login</a> to comment.</div>';
  }
  
  html += '</div>';
  
  container.innerHTML = html;
  
  // Add event listeners
  if (currentUser) {
    const textarea = document.getElementById(`comment-input-${reportId}`);
    const charCount = document.getElementById(`char-count-${reportId}`);
    
    if (textarea && charCount) {
      textarea.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = `${length}/1000`;
        charCount.style.color = length > 900 ? '#e74c3c' : '#666';
      });
    }
  }
}

// Render individual comment item
function renderCommentItem(comment) {
  const isOwner = currentUser && currentUser.id === comment.user_id;
  const isEdited = comment.is_edited ? ' (edited)' : '';
  
  let html = `
    <div class="comment-item" id="comment-${comment.id}">
      <div class="comment-header">
        <span class="comment-author">${comment.username || 'Anonymous'}</span>
        <span class="comment-time">${moment(comment.created_at).fromNow()}${isEdited}</span>
      </div>
      <div class="comment-content" id="comment-content-${comment.id}">
        ${escapeHtml(comment.content)}
      </div>
  `;
  
  // Edit/Delete buttons for comment owner
  if (isOwner) {
    html += `
      <div class="comment-actions">
        <button onclick="editComment(${comment.id})" class="edit-comment-btn">Edit</button>
        <button onclick="deleteComment(${comment.id})" class="delete-comment-btn">Delete</button>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
}

// Submit a new comment
function submitComment(reportId) {
  if (!currentUser) {
    alert('Please login to comment');
    return;
  }
  
  const textarea = document.getElementById(`comment-input-${reportId}`);
  const content = textarea.value.trim();
  
  if (!content) {
    alert('Please enter a comment');
    return;
  }
  
  if (content.length > 1000) {
    alert('Comment too long (max 1000 characters)');
    return;
  }
  
  requestAPIPost(`/reports/${reportId}/comments`, JSON.stringify({
    content: content
  }), (response) => {
    const data = JSON.parse(response);
    if (data.comment_id) {
      // Clear input
      textarea.value = '';
      document.getElementById(`char-count-${reportId}`).textContent = '0/1000';
      
      // Reload comments
      loadComments(reportId);
    } else {
      alert('Failed to post comment: ' + (data.error || 'Unknown error'));
    }
  });
}

// Edit a comment
function editComment(commentId) {
  const contentDiv = document.getElementById(`comment-content-${commentId}`);
  const currentContent = contentDiv.textContent;
  
  // Replace content with textarea
  contentDiv.innerHTML = `
    <textarea id="edit-comment-${commentId}" rows="3" maxlength="1000">${currentContent}</textarea>
    <div class="edit-actions">
      <button onclick="saveCommentEdit(${commentId})" class="save-edit-btn">Save</button>
      <button onclick="cancelCommentEdit(${commentId})" class="cancel-edit-btn">Cancel</button>
    </div>
  `;
  
  // Focus on textarea
  const textarea = document.getElementById(`edit-comment-${commentId}`);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

// Save comment edit
function saveCommentEdit(commentId) {
  const textarea = document.getElementById(`edit-comment-${commentId}`);
  const content = textarea.value.trim();
  
  if (!content) {
    alert('Comment cannot be empty');
    return;
  }
  
  if (content.length > 1000) {
    alert('Comment too long (max 1000 characters)');
    return;
  }
  
  // Create a custom PUT request function
  const putRequest = (uri, data, callback) => {
    const oReq = new XMLHttpRequest();
    oReq.addEventListener('load', function reqListener() {
      if (callback && this.response) {
        if (this.status >= 200 && this.status < 300) {
          callback(this.response);
        } else {
          console.error('API Error:', this.status, this.response);
          try {
            const errorData = JSON.parse(this.response);
            alert('Error: ' + (errorData.error || 'Unknown error'));
          } catch (e) {
            alert('Error: Server returned status ' + this.status);
          }
        }
      }
    });
    oReq.addEventListener('error', function() {
      console.error('Network error occurred');
      alert('Network error: Unable to connect to server');
    });
    oReq.open('PUT', settings.backendUrl + uri);
    oReq.setRequestHeader('Content-Type', 'application/json');
    if (authToken) {
      oReq.setRequestHeader('Authorization', 'Bearer ' + authToken);
    }
    oReq.send(data);
  };
  
  putRequest(`/comments/${commentId}`, JSON.stringify({
    content: content
  }), (response) => {
    const data = JSON.parse(response);
    if (data.message) {
      // Find the report ID for this comment
      const reportId = findReportIdForComment(commentId);
      if (reportId) {
        loadComments(reportId);
      }
    } else {
      alert('Failed to update comment: ' + (data.error || 'Unknown error'));
    }
  });
}

// Cancel comment edit
function cancelCommentEdit(commentId) {
  const contentDiv = document.getElementById(`comment-content-${commentId}`);
  const textarea = document.getElementById(`edit-comment-${commentId}`);
  const originalContent = textarea.defaultValue;
  
  contentDiv.innerHTML = escapeHtml(originalContent);
}

// Delete a comment
function deleteComment(commentId) {
  if (!confirm('Are you sure you want to delete this comment?')) {
    return;
  }
  
  // Create a custom DELETE request function
  const deleteRequest = (uri, callback) => {
    const oReq = new XMLHttpRequest();
    oReq.addEventListener('load', function reqListener() {
      if (callback && this.response) {
        if (this.status >= 200 && this.status < 300) {
          callback(this.response);
        } else {
          console.error('API Error:', this.status, this.response);
          try {
            const errorData = JSON.parse(this.response);
            alert('Error: ' + (errorData.error || 'Unknown error'));
          } catch (e) {
            alert('Error: Server returned status ' + this.status);
          }
        }
      }
    });
    oReq.addEventListener('error', function() {
      console.error('Network error occurred');
      alert('Network error: Unable to connect to server');
    });
    oReq.open('DELETE', settings.backendUrl + uri);
    oReq.setRequestHeader('Content-Type', 'application/json');
    if (authToken) {
      oReq.setRequestHeader('Authorization', 'Bearer ' + authToken);
    }
    oReq.send();
  };
  
  deleteRequest(`/comments/${commentId}`, (response) => {
    const data = JSON.parse(response);
    if (data.message) {
      // Find the report ID for this comment
      const reportId = findReportIdForComment(commentId);
      if (reportId) {
        loadComments(reportId);
      }
    } else {
      alert('Failed to delete comment: ' + (data.error || 'Unknown error'));
    }
  });
}

// Helper function to find report ID for a comment
function findReportIdForComment(commentId) {
  for (const reportId in comments) {
    const reportComments = comments[reportId];
    if (reportComments.find(c => c.id === commentId)) {
      return reportId;
    }
  }
  return null;
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Add comments section to report popup
function addCommentsToReportPopup(reportId, popupContent) {
  // Add comments section to the popup content
  popupContent += `
    <div class="comments-section-container">
      <div class="comments-header">
        <h4>Comments</h4>
        <button onclick="toggleComments(${reportId})" class="toggle-comments-btn" id="toggle-comments-${reportId}">
          Show Comments
        </button>
      </div>
      <div id="comments-container-${reportId}" class="comments-container" style="display: none;"></div>
    </div>
  `;
  
  return popupContent;
}

// Toggle comments visibility
function toggleComments(reportId) {
  const container = document.getElementById(`comments-container-${reportId}`);
  const toggleBtn = document.getElementById(`toggle-comments-${reportId}`);
  
  if (container.style.display === 'none') {
    container.style.display = 'block';
    toggleBtn.textContent = 'Hide Comments';
    loadComments(reportId);
  } else {
    container.style.display = 'none';
    toggleBtn.textContent = 'Show Comments';
  }
} 
