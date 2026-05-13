(function initHome() {
  if (!window.location.pathname.endsWith('/home.html')) return;

  const THEME_KEY = 'hirehub-theme';
  const POLL_MS = 45000;
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

  function applyTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
  }

  async function refreshNotifications(markRead = false) {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (markRead) {
      await fetch('/api/user/notifications/read', { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    }
    const res = await fetch('/api/user/notifications', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    const unread = Number(data.unread || 0);
    const badge = document.getElementById('unreadBadge');
    if (!badge) return;
    badge.hidden = unread < 1;
    badge.textContent = unread > 99 ? '99+' : String(unread);
  }

  function redirectToLogin(message) {
    showAccessMessage(message);
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1800);
  }

  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('notificationsBtn')?.addEventListener('click', async () => refreshNotifications(true));
  window.hireHubRefreshNotifications = () => refreshNotifications(false);
  setInterval(() => refreshNotifications(false), POLL_MS);

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
        resumeUrl: data.resumeUrl || '',
        avatarUrl: data.avatarUrl || '',
        coverUrl: data.coverUrl || '',
      };
      window.hireHubState = { user: normalized };
      window.dispatchEvent(new CustomEvent('hirehub:user-loaded', { detail: normalized }));
      refreshNotifications(false);
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
