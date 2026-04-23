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

function setOpen(open) {
  if (!profilePanel || !backdrop) return;
  profilePanel.classList.toggle('open', open);
  backdrop.classList.toggle('show', open);
  profilePanel.setAttribute('aria-hidden', String(!open));
}

profileBtn?.addEventListener('click', () => setOpen(true));
closePanel?.addEventListener('click', () => setOpen(false));
backdrop?.addEventListener('click', () => setOpen(false));

function toggleEdit(section) {
  const field = document.getElementById(`${section}Input`);
  if (!field) return;
  field.classList.toggle('show');
  field.focus();
}

editLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const section = link.dataset.section;
    if (!section) return;
    toggleEdit(section);
  });
});

saveProfile?.addEventListener('click', async () => {
  const token = localStorage.getItem('token');
  const currentUser = window.hireHubState?.user;
  if (!token || !currentUser) return;
  const payload = {
    about: document.getElementById('aboutInput').value,
    headline: document.getElementById('headlineInput').value,
    location: document.getElementById('locationInput').value,
    experience: currentUser.experience || [],
    education: currentUser.education || [],
    skills: currentUser.skills || [],
  };

  const res = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    window.hireHubState.user = { ...currentUser, ...payload };
    renderUser(window.hireHubState.user);
    alert('Profile updated');
  } else {
    alert('Failed to update profile');
  }
});

function makePostCard(text) {
  const name = window.hireHubState?.user?.fullName || 'You';
  const role = window.hireHubState?.user?.headline || '';
  const article = document.createElement('article');
  article.className = 'card post';
  article.innerHTML = `
    <div class="post-head">
      <div class="avatar"></div>
      <div>
        <strong>${name}</strong>
        <p>${role}</p>
      </div>
      <span>now</span>
    </div>
    <p class="post-text"></p>
    <div class="post-actions">👍 ❤️ 👏 <span>0</span> <span>0 Comments</span></div>
  `;
  article.querySelector('.post-text').textContent = text.content || text;
  article.querySelector('.post-head span').textContent = text.createdAt
    ? new Date(text.createdAt).toLocaleDateString()
    : 'now';
  const counts = article.querySelector('.post-actions');
  counts.innerHTML = `👍 ❤️ 👏 <span>${text.likes || 0}</span> <span>${text.comments || 0} Comments</span>`;
  return article;
}

async function publishTextPost() {
  const text = postInput?.value.trim();
  if (!text || !feed) return;
  const token = localStorage.getItem('token');
  const res = await fetch('/api/user/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content: text }),
  });
  if (!res.ok) {
    alert('Failed to publish post');
    return;
  }
  const createdPost = await res.json();
  const user = window.hireHubState.user;
  user.posts = [createdPost, ...(user.posts || [])];
  renderPosts(user.posts);
  postInput.value = '';
}

postButton?.addEventListener('click', publishTextPost);
postInput?.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    publishTextPost();
  }
});

function renderList(type, values) {
  const target = document.getElementById(listIds[type]);
  if (!target) return;
  if (!values?.length) {
    target.className = 'panel-list-empty';
    target.innerHTML = `No ${type} added yet.`;
    return;
  }
  target.className = '';
  target.innerHTML = values.map((value) => `<div class="panel-list-item"><span>${value}</span><span>›</span></div>`).join('');
}

function renderPosts(posts) {
  if (!feed) return;
  feed.innerHTML = '';
  posts.forEach((post) => feed.appendChild(makePostCard(post)));

  const editor = document.getElementById('profilePosts');
  if (!editor) return;
  if (!posts?.length) {
    editor.className = 'panel-list-empty';
    editor.textContent = 'No posts to edit.';
    return;
  }
  editor.className = '';
  editor.innerHTML = posts
    .map(
      (post) => `
      <div class="panel-post-editor">
        <textarea id="postEdit_${post.id}">${post.content}</textarea>
        <button class="btn-secondary small-btn" data-save-post="${post.id}" type="button">Save Post</button>
      </div>
    `
    )
    .join('');

  editor.querySelectorAll('[data-save-post]').forEach((button) => {
    button.addEventListener('click', async () => {
      const token = localStorage.getItem('token');
      const postId = button.getAttribute('data-save-post');
      const textarea = document.getElementById(`postEdit_${postId}`);
      const content = textarea?.value.trim();
      if (!content) return;
      const res = await fetch(`/api/user/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        alert('Failed to update post');
        return;
      }
      const user = window.hireHubState.user;
      user.posts = user.posts.map((post) => (String(post.id) === String(postId) ? { ...post, content } : post));
      renderPosts(user.posts);
    });
  });
}

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
  renderList('experience', user.experience || []);
  renderList('education', user.education || []);
  renderList('skills', user.skills || []);
  renderPosts(user.posts || []);
}

function bindProfileItem(type, inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  button?.addEventListener('click', () => {
    const value = input?.value.trim();
    if (!value) return;
    const user = window.hireHubState.user;
    const items = new Set(user[type] || []);
    items.add(value);
    user[type] = [...items];
    input.value = '';
    renderList(type, user[type]);
  });
}

bindProfileItem('experience', 'experienceInput', 'addExperienceBtn');
bindProfileItem('education', 'educationInput', 'addEducationBtn');
bindProfileItem('skills', 'skillsInput', 'addSkillsBtn');

window.addEventListener('hirehub:user-loaded', (event) => {
  renderUser(event.detail);
});

if (window.hireHubState?.user) {
  renderUser(window.hireHubState.user);
}
