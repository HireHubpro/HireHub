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

saveProfile?.addEventListener('click', async () => {
  const token = localStorage.getItem('token');
  const payload = {
    about: document.getElementById('aboutInput').value,
    headline: document.getElementById('headlineInput').value,
    location: document.getElementById('locationInput').value,
  };

  const res = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    document.getElementById('panelHeadline').textContent = payload.headline;
    document.getElementById('panelLocation').textContent = payload.location;
    alert('Profile updated');
  } else {
    alert('Failed to update profile');
  }
});
