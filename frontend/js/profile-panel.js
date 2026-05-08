const profileBtn = document.getElementById('profileBtn');
const closePanel = document.getElementById('closePanel');
const profilePanel = document.getElementById('profilePanel');
const backdrop = document.getElementById('backdrop');
const saveProfile = document.getElementById('saveProfile');
const editLinks = document.querySelectorAll('.edit-link[data-section]');
const postButton = document.getElementById('publishTextPostBtn');
const postInput = document.getElementById('postTextInput');
const feed = document.getElementById('feed');
const listIds = { experience: 'experienceList', education: 'educationList', skills: 'skillsList' };
const suggestions = {
  education: ['B.Tech Computer Science', 'BBA', 'MBA', 'MCA', 'B.Sc IT', 'M.Tech'],
  skills: ['JavaScript', 'React', 'Node.js', 'SQL', 'UI/UX', 'Communication'],
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

function setOpen(open) { if (!profilePanel || !backdrop) return; profilePanel.classList.toggle('open', open); backdrop.classList.toggle('show', open); profilePanel.setAttribute('aria-hidden', String(!open)); document.body.classList.toggle('profile-panel-open', open); }
function isPanelOpen() { return Boolean(profilePanel?.classList.contains('open')); }
profileBtn?.addEventListener('click', (e) => { e.preventDefault(); setOpen(!isPanelOpen()); });
closePanel?.addEventListener('click', () => setOpen(false));
backdrop?.addEventListener('click', () => setOpen(false));

document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isPanelOpen()) setOpen(false); });
editLinks.forEach((link) => link.addEventListener('click', () => document.getElementById(`${link.dataset.section}Input`)?.classList.toggle('show')));

saveProfile?.addEventListener('click', async () => {
  const token = localStorage.getItem('token');
  const currentUser = window.hireHubState?.user;
  if (!token || !currentUser) return;
  const payload = {
    about: document.getElementById('aboutInput').value,
    headline: document.getElementById('headlineInput').value,
    location: document.getElementById('locationInput').value,
    resumeUrl: currentUser.resumeUrl || document.getElementById('resumeUrlInput').value.trim(),
    avatarUrl: currentUser.avatarUrl || '',
    coverUrl: currentUser.coverUrl || '',
    experience: currentUser.experience || [],
    education: currentUser.education || [],
    skills: currentUser.skills || [],
  };
  const res = await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  if (!res.ok) return alert('Failed to update profile');
  window.hireHubState.user = { ...currentUser, ...payload };
  renderUser(window.hireHubState.user);
  alert('Profile updated');
});

function makePostCard(post) {
  const name = window.hireHubState?.user?.fullName || 'You'; const role = window.hireHubState?.user?.headline || '';
  const article = document.createElement('article'); article.className = 'card post';
  article.innerHTML = `<div class="post-head"><div class="avatar"></div><div><strong>${name}</strong><p>${role}</p></div><span>${post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'now'}</span></div><p class="post-text"></p><div class="post-actions">👍 ❤️ 👏 <span>${post.likes || 0}</span> <span>${post.comments || 0} Comments</span></div>`;
  article.querySelector('.post-text').textContent = post.content || '';
  return article;
}
async function publishTextPost() { const text = postInput?.value.trim(); if (!text || !feed) return; const token = localStorage.getItem('token'); const res = await fetch('/api/user/posts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content: text }) }); if (!res.ok) return alert('Failed to publish post'); const createdPost = await res.json(); const user = window.hireHubState.user; user.posts = [createdPost, ...(user.posts || [])]; renderPosts(user.posts); postInput.value = ''; }
postButton?.addEventListener('click', publishTextPost);

function renderList(type, values) { const target = document.getElementById(listIds[type]); if (!target) return; target.className = values?.length ? '' : 'panel-list-empty'; target.innerHTML = values?.length ? values.map((v) => `<div class="panel-list-item"><span>${v}</span><span>›</span></div>`).join('') : `No ${type} added yet.`; }

function renderPosts(posts) {
  if (!feed) return; feed.innerHTML = ''; (posts || []).forEach((post) => feed.appendChild(makePostCard(post)));
  const editor = document.getElementById('profilePosts'); if (!editor) return;
  if (!posts?.length) { editor.className = 'panel-list-empty'; editor.textContent = 'No posts to edit.'; return; }
  editor.className = '';
  editor.innerHTML = posts.map((post) => `<div class="panel-post-editor"><textarea id="postEdit_${post.id}">${post.content}</textarea><button class="btn-secondary small-btn" data-save-post="${post.id}" type="button">Save</button><button class="btn-secondary small-btn" data-delete-post="${post.id}" type="button">Delete</button></div>`).join('');
  editor.querySelectorAll('[data-save-post]').forEach((button) => button.addEventListener('click', () => updatePost(button.getAttribute('data-save-post'))));
  editor.querySelectorAll('[data-delete-post]').forEach((button) => button.addEventListener('click', () => deletePost(button.getAttribute('data-delete-post'))));
}
async function updatePost(postId) { const token = localStorage.getItem('token'); const content = document.getElementById(`postEdit_${postId}`)?.value.trim(); if (!content) return; const res = await fetch(`/api/user/posts/${postId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content }) }); if (!res.ok) return alert('Failed to update post'); const u = window.hireHubState.user; u.posts = u.posts.map((p) => (String(p.id) === String(postId) ? { ...p, content } : p)); renderPosts(u.posts); }
async function deletePost(postId) { const token = localStorage.getItem('token'); const res = await fetch(`/api/user/posts/${postId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); if (!res.ok) return alert('Failed to delete post'); const u = window.hireHubState.user; u.posts = u.posts.filter((p) => String(p.id) !== String(postId)); renderPosts(u.posts); }

function renderUser(user) {
  document.getElementById('welcomeName').textContent = user.fullName;
  document.getElementById('roleText').textContent = user.headline || user.role;
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
  renderList('experience', user.experience || []); renderList('education', user.education || []); renderList('skills', user.skills || []); renderPosts(user.posts || []);
  const avatar = document.getElementById('profileAvatar'); if (avatar && user.avatarUrl) avatar.style.backgroundImage = `url(${user.avatarUrl})`;
  const cover = document.querySelector('.panel-cover'); if (cover && user.coverUrl) cover.style.backgroundImage = `url(${user.coverUrl})`;
}
function bindProfileItem(type, inputId, buttonId) { const input = document.getElementById(inputId); document.getElementById(buttonId)?.addEventListener('click', () => { const value = input?.value.trim(); if (!value) return; const user = window.hireHubState.user; user[type] = [...new Set([...(user[type] || []), value])]; input.value = ''; renderList(type, user[type]); }); }
bindProfileItem('experience', 'experienceInput', 'addExperienceBtn'); bindProfileItem('education', 'educationInput', 'addEducationBtn'); bindProfileItem('skills', 'skillsInput', 'addSkillsBtn');
setupSuggestions('education', 'educationInput', 'educationSuggestions'); setupSuggestions('skills', 'skillsInput', 'skillsSuggestions');

document.getElementById('avatarUploadBtn')?.addEventListener('click', () => document.getElementById('avatarUploadInput')?.click());
document.getElementById('coverUploadBtn')?.addEventListener('click', () => document.getElementById('coverUploadInput')?.click());
document.getElementById('avatarUploadInput')?.addEventListener('change', async (e) => { const f = e.target.files?.[0]; if (!f) return; window.hireHubState.user.avatarUrl = await fileToDataUrl(f); renderUser(window.hireHubState.user); });
document.getElementById('coverUploadInput')?.addEventListener('change', async (e) => { const f = e.target.files?.[0]; if (!f) return; window.hireHubState.user.coverUrl = await fileToDataUrl(f); renderUser(window.hireHubState.user); });
document.getElementById('resumeUploadInput')?.addEventListener('change', async (e) => { const f = e.target.files?.[0]; if (!f) return; window.hireHubState.user.resumeUrl = await fileToDataUrl(f); renderUser(window.hireHubState.user); });
window.addEventListener('hirehub:user-loaded', (event) => renderUser(event.detail)); if (window.hireHubState?.user) renderUser(window.hireHubState.user);
