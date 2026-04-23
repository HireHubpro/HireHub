(function initHome() {
  if (!window.location.pathname.endsWith('/home.html')) return;

  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
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
    .catch(() => {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
    });
})();
