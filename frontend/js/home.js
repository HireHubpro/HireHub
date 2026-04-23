(function initHome() {
  if (!window.location.pathname.endsWith('/home.html')) return;

  const feedbackId = 'homeAuthFeedback';

  function showAccessMessage(message) {
    let feedback = document.getElementById(feedbackId);
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.id = feedbackId;
      feedback.className = 'auth-feedback';
      feedback.setAttribute('role', 'alert');
      const phone = document.querySelector('.phone') || document.body;
      phone.prepend(feedback);
    }
    feedback.textContent = message;
  }

  function redirectToLogin(message) {
    showAccessMessage(message);
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1800);
  }

  const token = localStorage.getItem('token');
  if (!token) {
    redirectToLogin('Your session is missing. Please sign in to continue.');
    return;
  }

  fetch('/api/user/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load user');
      document.getElementById('welcomeName').textContent = data.fullName;
      document.getElementById('roleText').textContent = data.headline || `${data.role}`;
      document.getElementById('panelName').textContent = data.fullName;
      document.getElementById('panelRole').textContent = data.role;
      document.getElementById('panelHeadline').textContent = data.headline || '';
      document.getElementById('panelLocation').textContent = data.location || '';
      document.getElementById('aboutPreview').textContent = data.about || 'Tell people about yourself.';
      document.getElementById('aboutInput').value = data.about || '';
      document.getElementById('headlineInput').value = data.headline || '';
      document.getElementById('locationInput').value = data.location || '';
    })
    .catch((error) => {
      const reason = error?.message || 'Unable to verify your session.';
      showAccessMessage(`Unable to load your profile: ${reason} Redirecting to login...`);
      localStorage.removeItem('token');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1800);
    });
})();
