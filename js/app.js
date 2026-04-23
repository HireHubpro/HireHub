const $ = (id) => document.getElementById(id);

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
