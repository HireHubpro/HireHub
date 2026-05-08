const API_BASE = window.HIREHUB_API_BASE || window.location.origin;

const AUTH_ENDPOINTS = {
  register: ['/api/auth/register', '/api/register.php'],
  login: ['/api/auth/login', '/api/login.php'],
};

function byId(id) {
  return document.getElementById(id);
}

async function postAuth(action, payload) {
  const endpoints = AUTH_ENDPOINTS[action] || [];
  let lastError = new Error(`${action} failed`);

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let data = null;

      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        const isHtml = raw.trim().startsWith('<!DOCTYPE') || raw.trim().startsWith('<html');
        if (isHtml) {
          throw new Error(`Endpoint ${endpoint} returned HTML instead of JSON`);
        }
        throw new Error(`Endpoint ${endpoint} returned invalid JSON`);
      }

      if (!res.ok) {
        throw new Error(data?.message || `${action} failed`);
      }

      return data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

byId('goSignup')?.addEventListener('click', () => {
  window.location.href = '/choose-role.html';
});

byId('goLogin')?.addEventListener('click', () => {
  window.location.href = '/login.html';
});

document.querySelectorAll('.role-card').forEach((card) => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.role-card').forEach((c) => c.classList.remove('selected'));
    card.classList.add('selected');
    const role = card.dataset.role;
    sessionStorage.setItem('selected_role', role);
    window.location.href = '/signup.html';
  });
});

const selectedRole = sessionStorage.getItem('selected_role');
if (window.location.pathname.endsWith('/signup.html')) {
  if (!selectedRole) {
    window.location.href = '/choose-role.html';
  } else {
    byId('selectedRole').textContent = `Signing up as: ${selectedRole}`;
  }
}

byId('signupForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const payload = {
    fullName: form.get('fullName')?.toString().trim(),
    email: form.get('email')?.toString().trim(),
    password: form.get('password')?.toString(),
    role: sessionStorage.getItem('selected_role'),
  };

  const errorEl = byId('authError');
  errorEl.textContent = '';

  try {
    const data = await postAuth('register', payload);
    localStorage.setItem('hirehub_user', JSON.stringify(data.user));
    sessionStorage.removeItem('selected_role');
    window.location.href = '/home.html';
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

byId('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const payload = {
    email: form.get('email')?.toString().trim(),
    password: form.get('password')?.toString(),
  };

  const errorEl = byId('authError');
  errorEl.textContent = '';

  try {
    const data = await postAuth('login', payload);
    localStorage.setItem('hirehub_user', JSON.stringify(data.user));
    window.location.href = '/home.html';
  } catch (err) {
    errorEl.textContent = err.message;
  }
});
