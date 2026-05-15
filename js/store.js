const USERS_KEY = 'hh_users';
const SESSION_KEY = 'hh_session';
const JOBS_KEY = 'hh_jobs';
const APPLICATIONS_KEY = 'hh_applications';

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

function getJobs() {
  return JSON.parse(localStorage.getItem(JOBS_KEY) || '[]');
}

function saveJobs(jobs) {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

function getApplications() {
  return JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || '[]');
}

function saveApplications(applications) {
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
}

function createJob({ title, company, description, location }) {
  const user = currentUser();
  if (!user || user.role !== 'hirer') {
    throw new Error('Only hirers can create jobs');
  }
  const jobs = getJobs();
  const job = {
    id: Date.now(),
    recruiterId: user.id,
    title,
    company,
    description,
    location,
    createdAt: new Date().toISOString()
  };
  jobs.unshift(job);
  saveJobs(jobs);
  return job;
}

function getActivePostingsForCurrentHirer() {
  const user = currentUser();
  if (!user) return [];
  return getJobs().filter((job) => job.recruiterId === user.id);
}

function getApplicantRowsForCurrentHirer() {
  const user = currentUser();
  if (!user || user.role !== 'hirer') return [];
  const jobs = getActivePostingsForCurrentHirer();
  const jobMap = new Map(jobs.map((job) => [job.id, job]));
  const users = getUsers();
  const applications = getApplications();

  return applications
    .filter((app) => jobMap.has(app.jobId))
    .map((app) => {
      const applicant = users.find((u) => u.id === app.applicantId);
      return {
        applicationId: app.id,
        applicantName: applicant?.fullName || 'Unknown',
        applicantEmail: applicant?.email || 'Unknown',
        applicantSkills: (applicant?.profile?.skills || []).join(', ') || 'Not listed',
        status: app.status,
        jobTitle: jobMap.get(app.jobId)?.title || 'Unknown job'
      };
    });
}

function updateApplicationStatus(applicationId, status) {
  const allowed = ['Applied', 'Shortlisted', 'Rejected'];
  if (!allowed.includes(status)) {
    throw new Error('Invalid application status');
  }
  const user = currentUser();
  if (!user || user.role !== 'hirer') {
    throw new Error('Only hirers can update status');
  }
  const apps = getApplications();
  const jobs = getActivePostingsForCurrentHirer();
  const allowedJobIds = new Set(jobs.map((j) => j.id));
  const app = apps.find((a) => a.id === applicationId);
  if (!app || !allowedJobIds.has(app.jobId)) {
    throw new Error('Application not found');
  }
  app.status = status;
  saveApplications(apps);
}
