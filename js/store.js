const USERS_KEY = 'hh_users';
const SESSION_KEY = 'hh_session';

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function registerUser({ fullName, email, password, role }) {
  const users = getUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Email already exists');
  }

function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

function registerUser({ fullName, email, password, role }) {
  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) throw new Error('Email already exists');
  const user = {
    id: Date.now(),
    fullName,
    email,
    password,
    role,
    posts: [],
    profile: {
      headline: role === 'hirer' ? 'Hiring Talent' : 'Open to opportunities',
      location: 'Bengaluru, India',
      about: 'Add a summary',
      education: [],
      experience: [],
      skills: [],
    },
  };

    profile: {
      headline: role === 'hirer' ? 'Hiring Talent' : 'Open to opportunities',
      location: 'Add your location',
      about: 'Add a summary',
    }
  };
  users.push(user);
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
}

function loginUser(email, password) {
  const user = getUsers().find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  const user = getUsers().find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) throw new Error('Invalid credentials');
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
}

function currentUser() {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (!session?.userId) return null;
  return getUsers().find((u) => u.id === session.userId) || null;
}

function updateCurrentUser(mutator) {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (!session?.userId) throw new Error('Not logged in');

  const users = getUsers();
  const idx = users.findIndex((u) => u.id === session.userId);
  if (idx < 0) throw new Error('User not found');

  mutator(users[idx]);
  saveUsers(users);
  return users[idx];
}

function updateProfile(updates) {
  return updateCurrentUser((user) => {
    user.profile = { ...user.profile, ...updates };
  });
}

function addPost(content) {
  return updateCurrentUser((user) => {
    user.posts.unshift({ id: Date.now(), content, createdAt: new Date().toISOString() });
  });
}

function updatePost(postId, content) {
  return updateCurrentUser((user) => {
    const post = user.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found');
    post.content = content;
    post.updatedAt = new Date().toISOString();
  });
}

function addProfileItem(type, value) {
  return updateCurrentUser((user) => {
    const clean = value.trim();
    if (!clean) return;
    const list = user.profile[type] || [];
    if (!list.includes(clean)) list.push(clean);
    user.profile[type] = list;
  });
}
  return getUsers().find(u => u.id === session.userId) || null;
}

function updateProfile(updates) {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (!session?.userId) throw new Error('Not logged in');
  const users = getUsers();
  const idx = users.findIndex(u => u.id === session.userId);
  if (idx < 0) throw new Error('User not found');
  users[idx].profile = { ...users[idx].profile, ...updates };
  saveUsers(users);
  return users[idx];
}
