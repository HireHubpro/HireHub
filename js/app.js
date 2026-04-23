const $ = (id) => document.getElementById(id);

const prettyRole = (role) => (role === 'hirer' ? 'Hirer' : 'Applicant');

function getInitials(name = 'User') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function togglePassword(inputId, toggleId) {
  const input = $(inputId);
  const toggle = $(toggleId);
  if (!input || !toggle) {
    return;
  }
  toggle.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
  });
}

$('goSignup')?.addEventListener('click', () => {
  location.href = 'choose-role.html';
});

$('goLogin')?.addEventListener('click', () => {
  location.href = 'login.html';
});

document.querySelectorAll('.role-card').forEach((card) => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.role-card').forEach((item) => item.classList.remove('active'));
    card.classList.add('active');
    sessionStorage.setItem('hh_role', card.dataset.role);
    setTimeout(() => {
      location.href = 'signup.html';
    }, 150);
  });
});

if (location.pathname.endsWith('signup.html')) {
  const role = sessionStorage.getItem('hh_role');
  if (!role) {
    location.href = 'choose-role.html';
  } else if ($('selectedRole')) {
    $('selectedRole').textContent = `Signing up as ${prettyRole(role)}`;
  }
}

togglePassword('signupPassword', 'toggleSignupPassword');
togglePassword('loginPassword', 'toggleLoginPassword');

$('signupForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    registerUser({
      fullName: String(form.get('fullName') || '').trim(),
      email: String(form.get('email') || '').trim(),
      password: String(form.get('password') || ''),
      role: sessionStorage.getItem('hh_role')
    });
    sessionStorage.removeItem('hh_role');
    location.href = 'home.html';
  } catch (error) {
    $('authError').textContent = error.message;
  }
});

$('loginForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    loginUser(String(form.get('email') || '').trim(), String(form.get('password') || ''));
    location.href = 'home.html';
  } catch (error) {
    $('authError').textContent = error.message;
  }
});

function renderList(containerId, list) {
  const el = $(containerId);
  if (!el) {
    return;
  }
  if (!list.length) {
    el.innerHTML = '<div class="tiny">No items added yet.</div>';
    return;
  }
  el.innerHTML = list
    .map(
      (item) => `<div class="list-row"><span>${item}</span><span style="color:#98a2b3">›</span></div>`
    )
    .join('');
}

function renderPosts(user) {
  const feed = $('feedPosts');
  const profilePosts = $('profilePosts');
  if (!feed || !profilePosts) {
    return;
  }

  if (!user.posts.length) {
    feed.innerHTML = '<div class="card post"><p class="tiny">No posts yet. Share your first thought.</p></div>';
    profilePosts.innerHTML = '<p class="tiny">No posts to edit.</p>';
    return;
  }

  feed.innerHTML = user.posts
    .map((post) => {
      const postTime = new Date(post.createdAt).toLocaleDateString();
      return `
        <article class="card post">
          <div class="post-head">
            <div style="display:flex; gap:8px; align-items:center;">
              <div class="avatar" style="width:40px; height:40px; font-size:14px;">${getInitials(user.fullName)}</div>
              <div>
                <strong>${user.fullName}</strong>
                <div class="post-meta">${user.profile.headline}</div>
                <div class="post-meta">${postTime}</div>
              </div>
            </div>
            <span style="color:#98a2b3">•••</span>
          </div>
          <p style="margin:8px 0 0; line-height:1.5;">${post.content}</p>
          <div class="post-image"></div>
          <div class="post-stats"><span>👍 ❤️ ${post.likes || 0}</span><span>${post.comments || 0} Comments</span></div>
          <div class="post-actions"><span>Like</span><span>Comment</span><span>Share</span></div>
        </article>
      `;
    })
    .join('');

  profilePosts.innerHTML = user.posts
    .map(
      (post) => `
        <div style="margin-bottom:10px;">
          <textarea id="post_${post.id}" rows="3">${post.content}</textarea>
          <button class="btn btn-ghost" style="height:40px; font-size:14px; margin-top:6px;" data-post-save="${post.id}">Save Post</button>
        </div>
      `
    )
    .join('');

  profilePosts.querySelectorAll('[data-post-save]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const postId = Number(btn.getAttribute('data-post-save'));
      const updated = updatePost(postId, $(`post_${postId}`).value.trim());
      renderHome(updated);
    });
  });
}

function renderHome(user) {
  $('composerAvatar').textContent = getInitials(user.fullName);
  $('panelAvatar').textContent = getInitials(user.fullName);
  $('panelName').textContent = user.fullName;
  $('panelRole').textContent = prettyRole(user.role);
  $('panelHeadline').textContent = user.profile.headline;
  $('panelLocation').textContent = user.profile.location;

  $('headlineInput').value = user.profile.headline;
  $('locationInput').value = user.profile.location;
  $('aboutInput').value = user.profile.about;

  renderList('experiencePills', user.profile.experience || []);
  renderList('educationPills', user.profile.education || []);
  renderList('skillsPills', user.profile.skills || []);
  renderPosts(user);
}

(function initHomePage() {
  if (!location.pathname.endsWith('home.html')) {
    return;
  }

  const user = currentUser();
  if (!user) {
    location.href = 'login.html';
    return;
  }

  renderHome(user);

  function submitPost() {
    const content = $('postInput').value.trim();
    if (!content) {
      return;
    }
    const updated = addPost(content);
    $('postInput').value = '';
    renderHome(updated);
  }

  $('addPostBtn')?.addEventListener('click', submitPost);
  $('postTextBtn')?.addEventListener('click', submitPost);

  $('saveProfile')?.addEventListener('click', () => {
    const updated = updateProfile({
      headline: $('headlineInput').value.trim(),
      location: $('locationInput').value.trim(),
      about: $('aboutInput').value.trim()
    });
    renderHome(updated);
  });

  [
    ['experienceInput', 'addExperienceBtn', 'experience'],
    ['educationInput', 'addEducationBtn', 'education'],
    ['skillsInput', 'addSkillsBtn', 'skills']
  ].forEach(([inputId, buttonId, key]) => {
    $(buttonId)?.addEventListener('click', () => {
      const updated = addProfileItem(key, $(inputId).value);
      $(inputId).value = '';
      renderHome(updated);
    });
  });

  const panel = $('profilePanel');
  const backdrop = $('backdrop');

  function setPanel(open) {
    panel.classList.toggle('open', open);
    backdrop.classList.toggle('show', open);
  }

  $('profileBtn')?.addEventListener('click', () => setPanel(true));
  $('closePanel')?.addEventListener('click', () => setPanel(false));
  backdrop?.addEventListener('click', () => setPanel(false));
})();
