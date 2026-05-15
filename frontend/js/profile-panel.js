const profileBtn = document.getElementById('profileBtn');
const closePanel = document.getElementById('closePanel');
const profilePanel = document.getElementById('profilePanel');
const backdrop = document.getElementById('backdrop');
const saveProfile = document.getElementById('saveProfile');
const editLinks = document.querySelectorAll('.edit-link[data-section]');
const feed = document.getElementById('feed');
const listIds = { experience: 'experienceList', education: 'educationList', skills: 'skillsList' };
const suggestions = {
  education: ['B.Tech Computer Science', 'BBA', 'MBA', 'MCA', 'B.Sc IT', 'M.Tech'],
  skills: ['JavaScript', 'React', 'Node.js', 'SQL', 'UI/UX', 'Communication'],
};

// Post Modal Elements
const postModal = document.getElementById('postModal');
const postTriggerInput = document.getElementById('postTriggerInput');
const closePostModal = document.getElementById('closePostModal');
const postModalInput = document.getElementById('postModalInput');
const modalPhotoBtn = document.getElementById('modalPhotoBtn');
const modalVideoBtn = document.getElementById('modalVideoBtn');
const modalMediaInput = document.getElementById('modalMediaInput');
const mediaPreview = document.getElementById('mediaPreview');
const removeMediaBtn = document.getElementById('removeMediaBtn');
const publishPostBtn = document.getElementById('publishPostBtn');
const photoPostBtn = document.getElementById('photoPostBtn');
const videoPostBtn = document.getElementById('videoPostBtn');
const navPostBtn = document.getElementById('navPostBtn');

// Share Modal Elements
const shareModal = document.getElementById('shareModal');
const closeShareModal = document.getElementById('closeShareModal');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const userListForSharing = document.getElementById('userListForSharing');

let currentMedia = { url: null, type: null };
let currentSharingPostId = null;

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function imageFileToOptimizedDataUrl(file, { maxSide = 1600, quality = 0.82 } = {}) {
  if (!file?.type?.startsWith('image/')) return fileToDataUrl(file);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return blob ? blobToDataUrl(blob) : fileToDataUrl(file);
}

function estimateDataUrlBytes(dataUrl) {
  const payload = String(dataUrl || '').split(',')[1] || '';
  return Math.floor((payload.length * 3) / 4);
}

function ensurePayloadSize(dataUrl, label) {
  const maxBytes = 12 * 1024 * 1024;
  if (estimateDataUrlBytes(dataUrl) > maxBytes) {
    throw new Error(`${label} is too large. Please upload a smaller file.`);
  }
}

// Modal Handlers
function openPostModal(mediaType = null) {
  postModal.classList.add('show');
  backdrop.classList.add('show');
  if (mediaType) {
    modalMediaInput.accept = mediaType === 'video' ? 'video/*' : 'image/*';
    modalMediaInput.click();
  }
}

function closePostModalFn() {
  postModal.classList.remove('show');
  if (!isPanelOpen() && !shareModal.classList.contains('show')) {
    backdrop.classList.remove('show');
  }
  postModalInput.value = '';
  clearMediaPreview();
}

function clearMediaPreview() {
  currentMedia = { url: null, type: null };
  mediaPreview.innerHTML = '<button class="remove-media" id="removeMediaBtn">✕</button>';
  mediaPreview.style.display = 'none';
  document.getElementById('removeMediaBtn').onclick = clearMediaPreview;
}

postTriggerInput?.addEventListener('click', () => openPostModal());
photoPostBtn?.addEventListener('click', () => openPostModal('image'));
videoPostBtn?.addEventListener('click', () => openPostModal('video'));
navPostBtn?.addEventListener('click', () => openPostModal());
closePostModal?.addEventListener('click', closePostModalFn);

modalPhotoBtn?.addEventListener('click', () => {
  modalMediaInput.accept = 'image/*';
  modalMediaInput.click();
});
modalVideoBtn?.addEventListener('click', () => {
  modalMediaInput.accept = 'video/*';
  modalMediaInput.click();
});

modalMediaInput?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const url = file.type.startsWith('image') ? await imageFileToOptimizedDataUrl(file, { maxSide: 1920, quality: 0.8 }) : await fileToDataUrl(file);
    ensurePayloadSize(url, 'Selected media');
    const type = file.type.startsWith('video') ? 'video' : 'image';
  currentMedia = { url, type };

  mediaPreview.innerHTML = '<button class="remove-media" id="removeMediaBtn">✕</button>';
  if (type === 'image') {
    const img = document.createElement('img');
    img.src = url;
    mediaPreview.appendChild(img);
  } else {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    mediaPreview.appendChild(video);
  }
    mediaPreview.style.display = 'block';
    document.getElementById('removeMediaBtn').onclick = clearMediaPreview;
  } catch (err) {
    alert(err.message || 'Unable to process this file. Please try a smaller one.');
    e.target.value = '';
  }
});

publishPostBtn?.addEventListener('click', async () => {
  const content = postModalInput.value.trim();
  if (!content && !currentMedia.url) return;

  const token = localStorage.getItem('token');
  const res = await fetch('/api/user/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      content,
      mediaUrl: currentMedia.url,
      mediaType: currentMedia.type
    })
  });

  if (res.ok) {
    const newPost = await res.json();
    const currentUser = window.hireHubState.user;
    // Add user info to the post for immediate rendering
    newPost.fullName = currentUser.fullName;
    newPost.avatarUrl = currentUser.avatarUrl;
    newPost.headline = currentUser.headline;

    window.hireHubState.user.posts = [newPost, ...(window.hireHubState.user.posts || [])];
    renderPosts(window.hireHubState.user.posts);
    closePostModalFn();
  } else {
    const err = await res.json().catch(() => ({}));
    alert(`Failed to publish post${err.message ? `: ${err.message}` : ''}`);
  }
});

// Profile Panel Functions
function setOpen(open) {
  if (!profilePanel || !backdrop) return;
  profilePanel.classList.toggle('open', open);
  backdrop.classList.toggle('show', open);
  profilePanel.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('profile-panel-open', open);
}
function isPanelOpen() { return Boolean(profilePanel?.classList.contains('open')); }
profileBtn?.addEventListener('click', (e) => { e.preventDefault(); setOpen(!isPanelOpen()); });
closePanel?.addEventListener('click', () => setOpen(false));
backdrop?.addEventListener('click', () => {
  setOpen(false);
  closePostModalFn();
  closeShareModalFn();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (isPanelOpen()) setOpen(false);
    if (postModal.classList.contains('show')) closePostModalFn();
    if (shareModal.classList.contains('show')) closeShareModalFn();
  }
});

saveProfile?.addEventListener('click', async () => {
  const token = localStorage.getItem('token');
  const currentUser = window.hireHubState?.user;
  if (!token || !currentUser) return;
  const payload = {
    about: document.getElementById('aboutInput').value,
    headline: document.getElementById('headlineInput').value,
    location: document.getElementById('locationInput').value,
    resumeUrl: document.getElementById('resumeUrlInput').value.trim() || currentUser.resumeUrl,
    avatarUrl: currentUser.avatarUrl || '',
    coverUrl: currentUser.coverUrl || '',
    experience: currentUser.experience || [],
    education: currentUser.education || [],
    skills: currentUser.skills || [],
  };
  const res = await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return alert(`Failed to update profile${err.message ? `: ${err.message}` : ''}`);
  }
  window.hireHubState.user = { ...currentUser, ...payload };
  renderUser(window.hireHubState.user);
  alert('Profile updated');
});

// Post Rendering
function makePostCard(post) {
  const name = post.fullName || 'Anonymous';
  const role = post.headline || '';
  const avatarStyle = post.avatarUrl ? `style="background-image: url(${post.avatarUrl})"` : '';
  const isOwner = window.hireHubState?.user?.id === post.user_id;

  const article = document.createElement('article');
  article.className = 'card post';
  article.dataset.postId = post.id;

  let mediaHtml = '';
  if (post.media_url) {
    if (post.media_type === 'video') {
      mediaHtml = `<div class="post-media-content"><video src="${post.media_url}" controls></video></div>`;
    } else {
      mediaHtml = `<div class="post-media-content"><img src="${post.media_url}" alt="Post media"></div>`;
    }
  }

  article.innerHTML = `
    <div class="post-head">
      <div class="avatar" ${avatarStyle}></div>
      <div>
        <strong>${name}</strong>
        <p>${role}</p>
      </div>
      <span style="margin-left: auto; font-size: 12px; color: var(--muted);">${post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'now'}</span>
    </div>
    <p class="post-text"></p>
    ${mediaHtml}
    <div class="post-actions" style="justify-content: space-between; border-top: 1px solid var(--line); margin-top: 12px; padding-top: 8px;">
      <button class="ghost-btn" data-like-post="${post.id}">👍 Like (${post.likes || 0})</button>
      <button class="ghost-btn" data-comment-btn="${post.id}">💬 Comment (${post.comments || 0})</button>
      <button class="ghost-btn" data-share-btn="${post.id}">🔗 Share (${post.shares || 0})</button>
      ${isOwner ? `<button class="ghost-btn" data-delete-post-feed="${post.id}">🗑</button>` : ''}
    </div>
    <div id="commentSection_${post.id}" class="comment-section">
      <div class="comment-list" id="commentList_${post.id}"></div>
      <div class="comment-input-container">
        <input type="text" id="commentInput_${post.id}" placeholder="Add a comment...">
        <button class="btn btn-primary small-btn" data-send-comment="${post.id}">Send</button>
      </div>
    </div>
  `;
  article.querySelector('.post-text').textContent = post.content || '';

  // Event Listeners for actions
  article.querySelector(`[data-like-post="${post.id}"]`).onclick = () => likePost(post.id);
  article.querySelector(`[data-comment-btn="${post.id}"]`).onclick = () => toggleComments(post.id);
  article.querySelector(`[data-share-btn="${post.id}"]`).onclick = () => openShareModal(post.id);
  if (isOwner) {
    article.querySelector(`[data-delete-post-feed="${post.id}"]`).onclick = () => deletePost(post.id);
  }
  article.querySelector(`[data-send-comment="${post.id}"]`).onclick = () => sendComment(post.id);

  return article;
}

function renderPosts(posts) {
  if (!feed) return;
  feed.innerHTML = '';
  (posts || []).forEach((post) => feed.appendChild(makePostCard(post)));

  // Also update profile posts editor
  const editor = document.getElementById('profilePosts');
  if (!editor) return;
  const myPosts = posts.filter(p => p.user_id === window.hireHubState.user.id);
  if (!myPosts.length) {
    editor.className = 'panel-list-empty';
    editor.textContent = 'No posts to edit.';
    return;
  }
  editor.className = '';
  editor.innerHTML = myPosts.map((post) => `
    <div class="panel-post-editor">
      <textarea id="postEdit_${post.id}">${post.content}</textarea>
      <div style="display: flex; gap: 8px;">
        <button class="btn-secondary small-btn" data-save-post="${post.id}" style="flex: 1;">Save</button>
        <button class="btn-secondary small-btn" data-delete-post="${post.id}" style="flex: 1;">Delete</button>
      </div>
    </div>
  `).join('');
  editor.querySelectorAll('[data-save-post]').forEach((button) => button.addEventListener('click', () => updatePost(button.getAttribute('data-save-post'))));
  editor.querySelectorAll('[data-delete-post]').forEach((button) => button.addEventListener('click', () => deletePost(button.getAttribute('data-delete-post'))));
}

// Post Actions
async function likePost(postId) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/user/posts/${postId}/like`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
  if (res.ok) {
    const data = await res.json();
    const post = window.hireHubState.user.posts.find(p => String(p.id) === String(postId));
    if (post) post.likes = data.likes;
    renderPosts(window.hireHubState.user.posts);
    refreshNotificationsIfAvailable();
  }
}

async function toggleComments(postId) {
  const section = document.getElementById(`commentSection_${postId}`);
  if (section.style.display === 'block') {
    section.style.display = 'none';
  } else {
    section.style.display = 'block';
    loadComments(postId);
  }
}

async function loadComments(postId) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/user/posts/${postId}/comments`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.ok) {
    const comments = await res.json();
    renderComments(postId, comments);
  }
}

function renderComments(postId, comments) {
  const list = document.getElementById(`commentList_${postId}`);
  list.innerHTML = '';

  // Group comments by parent_id
  const mainComments = comments.filter(c => !c.parent_id);
  const replies = comments.filter(c => c.parent_id);

  mainComments.forEach(comment => {
    const div = createCommentElement(comment);
    const replyList = document.createElement('div');
    replyList.className = 'replies';
    replyList.id = `replies_${comment.id}`;

    replies.filter(r => r.parent_id === comment.id).forEach(reply => {
      replyList.appendChild(createCommentElement(reply));
    });

    div.appendChild(replyList);
    list.appendChild(div);
  });
}

function createCommentElement(comment) {
  const div = document.createElement('div');
  div.className = 'comment';
  const isOwner = window.hireHubState?.user?.id === comment.user_id;
  const avatarStyle = comment.avatarUrl ? `style="background-image: url(${comment.avatarUrl})"` : '';

  div.innerHTML = `
    <div class="avatar small" ${avatarStyle}></div>
    <div class="comment-body">
      <strong>${comment.fullName}</strong>
      <p id="commentText_${comment.id}">${comment.content}</p>
      <div class="comment-meta">
        <button onclick="prepareReply(${comment.post_id}, ${comment.parent_id || comment.id})">Reply</button>
        ${isOwner ? `<button onclick="editComment(${comment.id})">Edit</button>` : ''}
        ${isOwner ? `<button onclick="deleteComment(${comment.post_id}, ${comment.id})">Delete</button>` : ''}
      </div>
    </div>
  `;
  return div;
}

async function sendComment(postId, parentId = null) {
  const input = document.getElementById(`commentInput_${postId}`);
  const content = input.value.trim();
  if (!content) return;

  const token = localStorage.getItem('token');
  const res = await fetch(`/api/user/posts/${postId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content, parentId })
  });

  if (res.ok) {
    input.value = '';
    loadComments(postId);
    // Update count in UI
    const post = window.hireHubState.user.posts.find(p => String(p.id) === String(postId));
    if (post) post.comments++;
    renderPosts(window.hireHubState.user.posts);
  }
}

window.prepareReply = (postId, parentId) => {
  const input = document.getElementById(`commentInput_${postId}`);
  input.focus();
  input.placeholder = "Replying...";
  // We need a way to pass parentId to sendComment.
  // Let's modify the send button's onclick
  const btn = document.querySelector(`[data-send-comment="${postId}"]`);
  btn.onclick = () => {
    sendComment(postId, parentId);
    btn.onclick = () => sendComment(postId);
    input.placeholder = "Add a comment...";
  };
};

window.deleteComment = async (postId, commentId) => {
  if (!confirm('Delete comment?')) return;
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (res.ok) {
    loadComments(postId);
    const post = window.hireHubState.user.posts.find(p => String(p.id) === String(postId));
    if (post) post.comments--;
    renderPosts(window.hireHubState.user.posts);
  }
};

window.editComment = async (commentId) => {
  const p = document.getElementById(`commentText_${commentId}`);
  const oldText = p.textContent;
  const newText = prompt('Edit comment:', oldText);
  if (!newText || newText === oldText) return;

  const token = localStorage.getItem('token');
  const res = await fetch(`/api/comments/${commentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content: newText })
  });
  if (res.ok) p.textContent = newText;
};

// Sharing
function openShareModal(postId) {
  currentSharingPostId = postId;
  shareModal.classList.add('show');
  backdrop.classList.add('show');
  loadUsersForSharing();
}

function closeShareModalFn() {
  shareModal.classList.remove('show');
  if (!isPanelOpen() && !postModal.classList.contains('show')) {
    backdrop.classList.remove('show');
  }
}

closeShareModal?.addEventListener('click', closeShareModalFn);

copyLinkBtn?.addEventListener('click', () => {
  const url = `${window.location.origin}/posts/${currentSharingPostId}`; // Placeholder URL
  navigator.clipboard.writeText(url).then(() => {
    alert('Link copied to clipboard!');
  });
});

async function loadUsersForSharing() {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/user/users', { headers: { Authorization: `Bearer ${token}` } });
  if (res.ok) {
    const users = await res.json();
    userListForSharing.innerHTML = users.map(user => `
      <div class="user-item" onclick="shareInternally(${user.id})">
        <span>${user.fullName}</span>
        <button class="btn btn-secondary small-btn">Share</button>
      </div>
    `).join('');
  }
}

window.shareInternally = async (targetUserId) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/user/posts/${currentSharingPostId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ shareType: 'internal', sharedWithUserId: targetUserId })
  });
  if (res.ok) {
    alert('Post shared successfully!');
    closeShareModalFn();
    // Update count
    const post = window.hireHubState.user.posts.find(p => String(p.id) === String(currentSharingPostId));
    if (post) post.shares++;
    renderPosts(window.hireHubState.user.posts);
  }
};

async function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/user/posts/${postId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (res.ok) {
    window.hireHubState.user.posts = window.hireHubState.user.posts.filter((p) => String(p.id) !== String(postId));
    renderPosts(window.hireHubState.user.posts);
  } else {
    alert('Failed to delete post');
  }
}

async function updatePost(postId) {
  const token = localStorage.getItem('token');
  const content = document.getElementById(`postEdit_${postId}`)?.value.trim();
  if (!content) return;
  const res = await fetch(`/api/user/posts/${postId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content }) });
  if (res.ok) {
    window.hireHubState.user.posts = window.hireHubState.user.posts.map((p) => (String(p.id) === String(postId) ? { ...p, content } : p));
    renderPosts(window.hireHubState.user.posts);
    alert('Post updated');
  } else {
    alert('Failed to update post');
  }
}

// Profile Rendering and Helper Functions
function renderList(type, values) {
  const target = document.getElementById(listIds[type]);
  if (!target) return;
  target.className = values?.length ? '' : 'panel-list-empty';
  target.innerHTML = values?.length ? values.map((v) => `<div class="panel-list-item"><span>${v}</span><span>›</span></div>`).join('') : `No ${type} added yet.`;
}

function renderUser(user) {
  const welcomeName = document.getElementById('welcomeName');
  if (welcomeName) welcomeName.textContent = user.fullName;
  const roleText = document.getElementById('roleText');
  if (roleText) roleText.textContent = user.headline || user.role;

  document.querySelectorAll('.user-full-name').forEach(el => el.textContent = user.fullName);

  document.getElementById('panelName').textContent = user.fullName;
  document.getElementById('panelRole').textContent = user.role;
  document.getElementById('panelHeadline').textContent = user.headline || '';
  document.getElementById('panelLocation').textContent = user.location || '';
  document.getElementById('aboutPreview').textContent = user.about || 'Tell people about yourself.';
  document.getElementById('aboutInput').value = user.about || '';
  document.getElementById('headlineInput').value = user.headline || '';
  document.getElementById('locationInput').value = user.location || '';
  document.getElementById('resumeUrlInput').value = user.resumeUrl || '';
  document.getElementById('resumeDownload').href = user.resumeUrl || '#';
  document.getElementById('resumeName').textContent = user.resumeUrl ? 'Uploaded Resume.pdf' : 'No resume uploaded';

  renderList('experience', user.experience || []);
  renderList('education', user.education || []);
  renderList('skills', user.skills || []);
  renderPosts(user.posts || []);

  const avatar = document.getElementById('profileAvatar');
  if (avatar && user.avatarUrl) avatar.style.backgroundImage = `url(${user.avatarUrl})`;

  document.querySelectorAll('.profile-avatar-img').forEach(el => {
    if (user.avatarUrl) el.style.backgroundImage = `url(${user.avatarUrl})`;
  });

  const cover = document.querySelector('.panel-cover');
  if (cover && user.coverUrl) cover.style.backgroundImage = `url(${user.coverUrl})`;
}

function setupSuggestions(type, inputId, datalistId) {
  const input = document.getElementById(inputId);
  const datalist = document.getElementById(datalistId);
  if (!input || !datalist) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const opts = suggestions[type].filter((v) => v.toLowerCase().includes(q)).slice(0, 8);
    datalist.innerHTML = opts.map((v) => `<option value="${v}"></option>`).join('');
  });
}

function bindProfileItem(type, inputId, buttonId) {
  const input = document.getElementById(inputId);
  document.getElementById(buttonId)?.addEventListener('click', () => {
    const value = input?.value.trim();
    if (!value) return;
    const user = window.hireHubState.user;
    user[type] = [...new Set([...(user[type] || []), value])];
    input.value = '';
    renderList(type, user[type]);
  });
}

bindProfileItem('experience', 'experienceInput', 'addExperienceBtn');
bindProfileItem('education', 'educationInput', 'addEducationBtn');
bindProfileItem('skills', 'skillsInput', 'addSkillsBtn');
setupSuggestions('education', 'educationInput', 'educationSuggestions');
setupSuggestions('skills', 'skillsInput', 'skillsSuggestions');

document.getElementById('avatarUploadBtn')?.addEventListener('click', () => document.getElementById('avatarUploadInput')?.click());
document.getElementById('coverUploadBtn')?.addEventListener('click', () => document.getElementById('coverUploadInput')?.click());

document.getElementById('avatarUploadInput')?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const optimizedAvatar = await imageFileToOptimizedDataUrl(f, { maxSide: 512, quality: 0.8 });
    ensurePayloadSize(optimizedAvatar, 'Avatar image');
    window.hireHubState.user.avatarUrl = optimizedAvatar;
    renderUser(window.hireHubState.user);
  } catch (err) {
    alert(err.message || 'Unable to process avatar image.');
    e.target.value = '';
  }
});

document.getElementById('coverUploadInput')?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const optimizedCover = await imageFileToOptimizedDataUrl(f, { maxSide: 1600, quality: 0.82 });
    ensurePayloadSize(optimizedCover, 'Banner image');
    window.hireHubState.user.coverUrl = optimizedCover;
    renderUser(window.hireHubState.user);
  } catch (err) {
    alert(err.message || 'Unable to process banner image.');
    e.target.value = '';
  }
});

document.getElementById('resumeUploadInput')?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const resumeDataUrl = await fileToDataUrl(f);
    ensurePayloadSize(resumeDataUrl, 'Resume');
    window.hireHubState.user.resumeUrl = resumeDataUrl;
    renderUser(window.hireHubState.user);
  } catch (err) {
    alert(err.message || 'Unable to process resume file.');
    e.target.value = '';
  }
});

async function refreshNotificationsIfAvailable() {
  if (typeof window.hireHubRefreshNotifications === 'function') await window.hireHubRefreshNotifications();
}

window.addEventListener('hirehub:user-loaded', (event) => renderUser(event.detail));
if (window.hireHubState?.user) renderUser(window.hireHubState.user);
