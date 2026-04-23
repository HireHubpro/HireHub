function byId(id) {
  return document.getElementById(id);
}

byId('goSignup')?.addEventListener('click', () => {
  window.location.href = 'choose-role.html';
});

byId('goLogin')?.addEventListener('click', () => {
  window.location.href = 'login.html';
});

document.querySelectorAll('.role-card').forEach((card) => {
  card.addEventListener('click', () => {
    const role = card.dataset.role;
    sessionStorage.setItem('selected_role', role);
    window.location.href = 'signup.html';
  });
});

const selectedRole = sessionStorage.getItem('selected_role');
if (window.location.pathname.endsWith('signup.html')) {
  if (!selectedRole) {
    window.location.href = 'choose-role.html';
  } else {
    byId('selectedRole').textContent = `Signing up as: ${selectedRole}`;
  }
}

byId('signupForm')?.addEventListener('submit', (e) => {
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
    const user = createUser(payload);
    setSession(user.id);
    sessionStorage.removeItem('selected_role');
    window.location.href = 'home.html';
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

byId('loginForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const payload = {
    email: form.get('email')?.toString().trim(),
    password: form.get('password')?.toString(),
  };

  const errorEl = byId('authError');
  errorEl.textContent = '';

  try {
    loginUser(payload);
    window.location.href = 'home.html';
  } catch (err) {
    errorEl.textContent = err.message;
  }
});
