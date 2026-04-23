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
      const normalized = {
        ...data,
        experience: Array.isArray(data.experience) ? data.experience : [],
        education: Array.isArray(data.education) ? data.education : [],
        skills: Array.isArray(data.skills) ? data.skills : [],
        posts: Array.isArray(data.posts) ? data.posts : [],
      };
      window.hireHubState = { user: normalized };
      window.dispatchEvent(new CustomEvent('hirehub:user-loaded', { detail: normalized }));
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
