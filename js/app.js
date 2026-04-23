const $ = (id) => document.getElementById(id);

$('goSignup')?.addEventListener('click', () => (location.href = 'choose-role.html'));
$('goLogin')?.addEventListener('click', () => (location.href = 'login.html'));

document.querySelectorAll('.role-card').forEach((card) => {
$('goSignup')?.addEventListener('click', () => location.href = 'choose-role.html');
$('goLogin')?.addEventListener('click', () => location.href = 'login.html');

document.querySelectorAll('.role-card').forEach(card => {
  card.addEventListener('click', () => {
    sessionStorage.setItem('hh_role', card.dataset.role);
    location.href = 'signup.html';
  });
});

if (location.pathname.endsWith('signup.html')) {
  const role = sessionStorage.getItem('hh_role');
  if (!role) location.href = 'choose-role.html';
  if ($('selectedRole')) $('selectedRole').textContent = `Signing up as ${role}`;
}

$('signupForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  try {
    registerUser({
      fullName: form.get('fullName').toString().trim(),
      email: form.get('email').toString().trim(),
      password: form.get('password').toString(),
      role: sessionStorage.getItem('hh_role'),
    });
    sessionStorage.removeItem('hh_role');
    location.href = 'home.html';
  } catch (err) {
    $('authError').textContent = err.message;
  }
});

$('loginForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  try {
    loginUser(form.get('email').toString().trim(), form.get('password').toString());
    location.href = 'home.html';
  } catch (err) {
    $('authError').textContent = err.message;
  }
});

function renderPills(containerId, list) {
  const el = $(containerId);
  if (!el) return;
  el.innerHTML = '';
  list.forEach((item) => {
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = item;
    el.appendChild(pill);
  });
}

function renderPosts(user) {
  const feed = $('feedPosts');
  const profilePosts = $('profilePosts');
  if (!feed || !profilePosts) return;

  if (!user.posts.length) {
    feed.innerHTML = '<div class="card muted">No posts yet. Create your first text post.</div>';
    profilePosts.innerHTML = '<div class="muted">No posts to edit yet.</div>';
    return;
  }

  feed.innerHTML = user.posts
    .map(
      (p) => `
      <article class="card post">
        <div class="post-head"><strong>${user.fullName}</strong><span>${user.role}</span></div>
        <p class="post-body">${p.content}</p>
      </article>`
    )
    .join('');

  profilePosts.innerHTML = user.posts
    .map(
      (p) => `
      <div class="post-edit-item">
        <textarea id="post_${p.id}" rows="2">${p.content}</textarea>
        <button class="btn btn-outline" data-post-save="${p.id}">Save</button>
      </div>`
    )
    .join('');

  profilePosts.querySelectorAll('[data-post-save]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const postId = Number(btn.getAttribute('data-post-save'));
      const val = $(`post_${postId}`).value;
      const updated = updatePost(postId, val);
      renderPosts(updated);
    });
  });
}

function hydrateHome(user) {
(function initHome() {
  if (!location.pathname.endsWith('home.html')) return;
  const user = currentUser();
  if (!user) { location.href = 'login.html'; return; }

  $('welcomeName').textContent = user.fullName;
  $('roleText').textContent = user.role;
  $('panelName').textContent = user.fullName;
  $('panelRole').textContent = user.role;
  $('panelHeadline').textContent = user.profile.headline;
  $('panelLocation').textContent = user.profile.location;
  $('headlineInput').value = user.profile.headline;
  $('locationInput').value = user.profile.location;
  $('aboutInput').value = user.profile.about;

  renderPills('educationPills', user.profile.education || []);
  renderPills('experiencePills', user.profile.experience || []);
  renderPills('skillsPills', user.profile.skills || []);
  renderPosts(user);
}

(function initHome() {
  if (!location.pathname.endsWith('home.html')) return;
  const user = currentUser();
  if (!user) {
    location.href = 'login.html';
    return;
  }

  hydrateHome(user);

  $('addPostBtn')?.addEventListener('click', () => {
    const content = $('postInput').value.trim();
    if (!content) return;
    const updated = addPost(content);
    $('postInput').value = '';
    renderPosts(updated);
  });

  $('saveProfile')?.addEventListener('click', () => {
    const updated = updateProfile({
      headline: $('headlineInput').value,
      location: $('locationInput').value,
      about: $('aboutInput').value,
    });
    hydrateHome(updated);
    alert('Profile updated');
  });

  const pillMap = [
    ['educationInput', 'addEducationBtn', 'education'],
    ['experienceInput', 'addExperienceBtn', 'experience'],
    ['skillsInput', 'addSkillsBtn', 'skills'],
  ];

  pillMap.forEach(([inputId, btnId, type]) => {
    $(btnId)?.addEventListener('click', () => {
      const val = $(inputId).value;
      const updated = addProfileItem(type, val);
      $(inputId).value = '';
      hydrateHome(updated);
    });
  });
})();

const panel = $('profilePanel');
const backdrop = $('backdrop');
function togglePanel(open) {
  if (!panel || !backdrop) return;
  panel.classList.toggle('open', open);
  backdrop.classList.toggle('show', open);
}
$('profileBtn')?.addEventListener('click', () => togglePanel(true));
$('closePanel')?.addEventListener('click', () => togglePanel(false));
$('backdrop')?.addEventListener('click', () => togglePanel(false));

$('profileBtn')?.addEventListener('click', () => togglePanel(true));
$('closePanel')?.addEventListener('click', () => togglePanel(false));
$('backdrop')?.addEventListener('click', () => togglePanel(false));

$('saveProfile')?.addEventListener('click', () => {
  try {
    const user = updateProfile({
      headline: $('headlineInput').value,
      location: $('locationInput').value,
      about: $('aboutInput').value,
    });
    $('panelHeadline').textContent = user.profile.headline;
    $('panelLocation').textContent = user.profile.location;
    alert('Profile updated');
  } catch (err) {
    alert(err.message);
  }
});
