const USERS_KEY = 'hh_users';
const SESSION_KEY = 'hh_session';

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function createDefaultProfile(role) {
  return {
    headline: role === 'hirer' ? 'Hiring Talent' : 'Product Designer at DesignX',
    location: 'Bengaluru, India',
    about:
      'Passionate product designer with 4+ years of experience in creating user-centered digital experiences.',
    education: [],
    experience: [],
    skills: []
  };
}

function registerUser({ fullName, email, password, role }) {
  const users = getUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Email already exists');
  }

  const user = {
    id: Date.now(),
    fullName,
    email,
    password,
    role: role || 'applicant',
    posts: [
      {
        id: Date.now() + 1,
        content:
          'Excited to share my latest UI/UX case study on improving user onboarding for a SaaS product. Let me know your thoughts!',
        createdAt: new Date().toISOString(),
        likes: 120,
        comments: 12
      }
    ],
    profile: createDefaultProfile(role)
  };

  users.push(user);
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
  return user;
}

function loginUser(email, password) {
  const user = getUsers().find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) {
    throw new Error('Invalid credentials');
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
  return user;
}

function currentUser() {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (!session?.userId) {
    return null;
  }
  return getUsers().find((u) => u.id === session.userId) || null;
}

function updateCurrentUser(mutator) {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (!session?.userId) {
    throw new Error('Not logged in');
  }

  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id === session.userId);
  if (userIndex < 0) {
    throw new Error('User not found');
  }

  mutator(users[userIndex]);
  saveUsers(users);
  return users[userIndex];
}

function updateProfile(updates) {
  return updateCurrentUser((user) => {
    user.profile = { ...user.profile, ...updates };
  });
}

function addProfileItem(type, value) {
  return updateCurrentUser((user) => {
    const cleanValue = value.trim();
    if (!cleanValue) {
      return;
    }
    const list = Array.isArray(user.profile[type]) ? user.profile[type] : [];
    if (!list.includes(cleanValue)) {
      list.push(cleanValue);
    }
    user.profile[type] = list;
  });
}

function addPost(content) {
  return updateCurrentUser((user) => {
    user.posts.unshift({
      id: Date.now(),
      content,
      createdAt: new Date().toISOString(),
      likes: Math.floor(Math.random() * 80) + 1,
      comments: Math.floor(Math.random() * 20)
    });
  });
}

function updatePost(postId, content) {
  return updateCurrentUser((user) => {
    const post = user.posts.find((p) => p.id === postId);
    if (!post) {
      throw new Error('Post not found');
    }
    post.content = content;
  });
}
