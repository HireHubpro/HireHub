(function initHome() {
  if (!window.location.pathname.endsWith('/home.html') && !window.location.pathname.endsWith('home.html')) return;

  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('welcomeName').textContent = `Welcome, ${user.fullName}`;
  document.getElementById('roleText').textContent = user.role;
  const panelRole = document.getElementById('panelRole');
  if (panelRole) panelRole.textContent = user.role;
  document.getElementById('panelName').textContent = user.fullName;
  document.getElementById('panelHeadline').textContent = user.profile?.headline || '';
  document.getElementById('panelLocation').textContent = user.profile?.location || '';
  document.getElementById('aboutInput').value = user.profile?.about || '';
  document.getElementById('headlineInput').value = user.profile?.headline || '';
  document.getElementById('locationInput').value = user.profile?.location || '';
})();
