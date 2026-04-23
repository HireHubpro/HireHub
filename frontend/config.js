(function setApiBase() {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  // For local dev use same origin (Express serves frontend + API).
  // For GitHub Pages, set this to your deployed backend URL, e.g.:
  // window.HIREHUB_API_BASE = 'https://api.example.com';
  window.HIREHUB_API_BASE = window.HIREHUB_API_BASE || (isLocal ? window.location.origin : '');
})();
