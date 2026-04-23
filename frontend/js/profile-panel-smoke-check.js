(function registerProfilePanelSmokeCheckAutoRun() {
  if (!window.location.pathname.endsWith('/home.html')) return;

  const shouldAutoRun = window.location.search.includes('profilePanelSmokeCheck=1');
  if (!shouldAutoRun) return;

  window.addEventListener('load', () => {
    if (typeof window.runProfilePanelSmokeCheck === 'function') {
      window.runProfilePanelSmokeCheck();
      return;
    }

    console.warn('[profile-panel smoke-check] runProfilePanelSmokeCheck() is unavailable.');
  });
})();
