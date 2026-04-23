const USERS_KEY = 'hirehub_users';
const SESSION_KEY = 'hirehub_session';

function readUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function createUser({ fullName, email, password, role }) {
  const users = readUsers();
  const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) throw new Error('Email already registered');

  const user = {
    id: Date.now(),
    fullName,
    email,
    password,
    role,
    profile: {
      headline: role === 'hirer' ? 'Hiring Talent' : 'Open to opportunities',
      location: 'Add your location',
      about: 'Add your about summary',
    },
  };

  users.push(user);
  writeUsers(users);
  return user;
}

function loginUser({ email, password }) {
  const users = readUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) throw new Error('Invalid credentials');
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
  return user;
}

function setSession(userId) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
}

function getCurrentUser() {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (!session?.userId) return null;
  return readUsers().find((u) => u.id === session.userId) || null;
}

function updateCurrentUserProfile(profileUpdates) {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (!session?.userId) throw new Error('Not logged in');

  const users = readUsers();
  const idx = users.findIndex((u) => u.id === session.userId);
  if (idx < 0) throw new Error('User not found');

  users[idx].profile = {
    ...users[idx].profile,
    ...profileUpdates,
  };

  writeUsers(users);
  return users[idx];
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
}
