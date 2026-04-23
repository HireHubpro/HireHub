const profileBtn = document.getElementById('profileBtn');
const closePanel = document.getElementById('closePanel');
const profilePanel = document.getElementById('profilePanel');
const backdrop = document.getElementById('backdrop');
const saveProfile = document.getElementById('saveProfile');

function setOpen(open) {
  if (!profilePanel || !backdrop) return;
  profilePanel.classList.toggle('open', open);
  backdrop.classList.toggle('show', open);
}

profileBtn?.addEventListener('click', () => setOpen(true));
closePanel?.addEventListener('click', () => setOpen(false));
backdrop?.addEventListener('click', () => setOpen(false));

saveProfile?.addEventListener('click', () => {
  const payload = {
    about: document.getElementById('aboutInput').value,
    headline: document.getElementById('headlineInput').value,
    location: document.getElementById('locationInput').value,
  };

  try {
    const user = updateCurrentUserProfile(payload);
    document.getElementById('panelHeadline').textContent = user.profile.headline;
    document.getElementById('panelLocation').textContent = user.profile.location;
    alert('Profile updated');
  } catch (err) {
    alert(err.message || 'Failed to update profile');
  }
});
