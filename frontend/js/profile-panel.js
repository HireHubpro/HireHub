const profileBtn = document.getElementById('profileBtn');
const closePanel = document.getElementById('closePanel');
const profilePanel = document.getElementById('profilePanel');
const backdrop = document.getElementById('backdrop');
const saveProfile = document.getElementById('saveProfile');
const editLinks = document.querySelectorAll('.edit-link[data-section]');
const postButton = document.getElementById('publishTextPostBtn');
const postInput = document.getElementById('postTextInput');
const feed = document.getElementById('feed');

function showProfileGuardNotice(message) {
  const noticeId = 'profilePanelGuardNotice';
  if (document.getElementById(noticeId)) return;

  const notice = document.createElement('div');
  notice.id = noticeId;
  notice.textContent = message;
  notice.className = 'profile-guard-notice';
  notice.setAttribute('role', 'alert');
  document.body.appendChild(notice);
}

const requiredNodes = { profileBtn, profilePanel, backdrop };
const missingRequiredNodes = Object.entries(requiredNodes)
  .filter(([, node]) => !node)
  .map(([name]) => name);

if (missingRequiredNodes.length) {
  const message = `Profile panel unavailable. Missing DOM node(s): ${missingRequiredNodes.join(', ')}.`;
  console.error(`[profile-panel] ${message}`);
  showProfileGuardNotice(message);
}

function setOpen(open) {
  if (!profilePanel || !backdrop) return;
  profilePanel.classList.toggle('open', open);
  backdrop.classList.toggle('show', open);
  profilePanel.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('profile-panel-open', open);
}

function isPanelOpen() {
  return Boolean(profilePanel?.classList.contains('open'));
}

profileBtn?.addEventListener('click', (event) => {
  event.preventDefault();
  setOpen(!isPanelOpen());
});

closePanel?.addEventListener('click', () => setOpen(false));
backdrop?.addEventListener('click', () => setOpen(false));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isPanelOpen()) {
    setOpen(false);
  }
});

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
  const payload = {
    about: document.getElementById('aboutInput').value,
    headline: document.getElementById('headlineInput').value,
    location: document.getElementById('locationInput').value,
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
    document.getElementById('panelHeadline').textContent = payload.headline;
    document.getElementById('panelLocation').textContent = payload.location;
    document.getElementById('aboutPreview').textContent = payload.about || 'Tell people about yourself.';
    alert('Profile updated');
  } else {
    alert('Failed to update profile');
  }
});

function makePostCard(text) {
  const name = document.getElementById('welcomeName')?.textContent || 'You';
  const role = document.getElementById('roleText')?.textContent || '';
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
  article.querySelector('.post-text').textContent = text;
  return article;
}

function publishTextPost() {
  const text = postInput?.value.trim();
  if (!text || !feed) return;
  const postCard = makePostCard(text);
  feed.prepend(postCard);
  postInput.value = '';
}

postButton?.addEventListener('click', publishTextPost);
postInput?.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    publishTextPost();
  }
});

window.runProfilePanelSmokeCheck = function runProfilePanelSmokeCheck() {
  if (!profileBtn || !profilePanel || !backdrop) {
    console.warn('[profile-panel smoke-check] Skipped: required DOM nodes are missing.');
    return false;
  }

  const initialOpen = profilePanel.classList.contains('open');
  profileBtn.click();
  console.assert(profilePanel.classList.contains('open'), 'Expected .profile-panel.open after #profileBtn click.');
  console.assert(backdrop.classList.contains('show'), 'Expected .backdrop.show after #profileBtn click.');

  backdrop.click();
  console.assert(!profilePanel.classList.contains('open'), 'Expected .profile-panel to close after backdrop click.');
  console.assert(!backdrop.classList.contains('show'), 'Expected .backdrop to hide after backdrop click.');

  setOpen(initialOpen);

  console.info('[profile-panel smoke-check] Completed.');
  return true;
};
