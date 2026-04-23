(function initHome() {
  if (!window.location.pathname.endsWith('/home.html')) return;

  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  fetch(`${window.HIREHUB_API_BASE || ''}/api/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load user');
      document.getElementById('welcomeName').textContent = `Welcome, ${data.fullName}`;
      document.getElementById('roleText').textContent = data.role;
      const panelRole = document.getElementById('panelRole');
      if (panelRole) panelRole.textContent = data.role;
      document.getElementById('panelName').textContent = data.fullName;
      document.getElementById('panelHeadline').textContent = data.headline || '';
      document.getElementById('panelLocation').textContent = data.location || '';
      document.getElementById('aboutInput').value = data.about || '';
      document.getElementById('headlineInput').value = data.headline || '';
      document.getElementById('locationInput').value = data.location || '';
    })
    .catch(() => {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    });
})();
