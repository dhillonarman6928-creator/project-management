const STORAGE_KEY = 'flowboard-tasks';
const ACTIVITY_KEY = 'flowboard-activity';

const statusConfig = {
  todo: { label: 'To Do', accent: '#67b3ff' },
  'in-progress': { label: 'In Progress', accent: '#fbbf24' },
  review: { label: 'Review', accent: '#8a6eff' },
  done: { label: 'Done', accent: '#2dd4bf' }
};

const defaultTasks = [
  {
    id: crypto.randomUUID(),
    title: 'Kickoff planning',
    description: 'Align goals, owners, and timeline for the first sprint.',
    dueDate: '2026-07-10',
    priority: 'High',
    category: 'Planning',
    status: 'todo'
  },
  {
    id: crypto.randomUUID(),
    title: 'Design system refresh',
    description: 'Polish the color palette and reusable components.',
    dueDate: '2026-07-12',
    priority: 'Medium',
    category: 'Design',
    status: 'in-progress'
  },
  {
    id: crypto.randomUUID(),
    title: 'Stakeholder review',
    description: 'Share progress and gather feedback before launch.',
    dueDate: '2026-07-15',
    priority: 'Low',
    category: 'Review',
    status: 'review'
  }
];

let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaultTasks;
let activity = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || 'null') || [];
let editingId = null;
let currentUser = JSON.parse(localStorage.getItem('flowboard-current-user') || 'null');
let isSignupMode = false;

const form = document.getElementById('task-form');
const appShell = document.getElementById('app-shell');
const authScreen = document.getElementById('auth-screen');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authSwitchText = document.getElementById('auth-switch-text');
const authMessage = document.getElementById('auth-message');
const authSubmit = document.getElementById('auth-submit');
const toggleAuthModeButton = document.getElementById('toggle-auth-mode');
const logoutButton = document.getElementById('logout-btn');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const titleInput = document.getElementById('task-title');
const descriptionInput = document.getElementById('task-description');
const dueDateInput = document.getElementById('task-due');
const priorityInput = document.getElementById('task-priority');
const categoryInput = document.getElementById('task-category');
const statusInput = document.getElementById('task-status');
const cancelEditButton = document.getElementById('cancel-edit');
const board = document.getElementById('board');
const statsGrid = document.getElementById('stats-grid');
const activityList = document.getElementById('activity-list');
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');
const filterPriority = document.getElementById('filter-priority');

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function saveActivity() {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
}

function addActivity(message) {
  const entry = {
    id: crypto.randomUUID(),
    message,
    time: new Date().toLocaleString([], { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })
  };

  activity.unshift(entry);
  activity = activity.slice(0, 8);
  saveActivity();
  renderActivity();
}

function resetForm() {
  form.reset();
  editingId = null;
  statusInput.value = 'todo';
  priorityInput.value = 'Medium';
  cancelEditButton.style.display = 'none';
}

function showAuthScreen() {
  authScreen.classList.remove('hidden');
  appShell.classList.add('hidden');
}

function showAppScreen() {
  authScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
}

function setAuthMode(signup) {
  isSignupMode = signup;
  authTitle.textContent = signup ? 'Create your account' : 'Login to FlowBoard';
  authSubtitle.textContent = signup
    ? 'Start organizing your team and projects in one place.'
    : 'Access your workspace and keep every task moving.';
  authSwitchText.textContent = signup ? 'Already have an account?' : 'New here?';
  toggleAuthModeButton.textContent = signup ? 'Login instead' : 'Create account';
  authSubmit.textContent = signup ? 'Create account' : 'Login';
  authMessage.textContent = '';
  authMessage.className = 'auth-message';
}

function showAuthMessage(message, type = '') {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`.trim();
}

function getUsers() {
  return JSON.parse(localStorage.getItem('flowboard-users') || 'null') || [];
}

function saveUsers(users) {
  localStorage.setItem('flowboard-users', JSON.stringify(users));
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const username = authUsername.value.trim();
  const password = authPassword.value.trim();

  if (!username || !password) {
    showAuthMessage('Please enter both username and password.', 'error');
    return;
  }

  const users = getUsers();

  if (isSignupMode) {
    const exists = users.some((user) => user.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      showAuthMessage('That username already exists. Please choose another.', 'error');
      return;
    }

    users.push({ id: crypto.randomUUID(), username, password });
    saveUsers(users);
    localStorage.setItem('flowboard-current-user', JSON.stringify({ username }));
    currentUser = { username };
    showAuthMessage('Account created successfully.', 'success');
    showAppScreen();
    render();
    authForm.reset();
    return;
  }

  const user = users.find((entry) => entry.username === username && entry.password === password);
  if (!user) {
    showAuthMessage('Invalid credentials. Try signing up first.', 'error');
    return;
  }

  localStorage.setItem('flowboard-current-user', JSON.stringify({ username: user.username }));
  currentUser = { username: user.username };
  showAuthMessage('Signed in successfully.', 'success');
  showAppScreen();
  render();
  authForm.reset();
}

function renderStats() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === 'done').length;
  const inProgress = tasks.filter((task) => task.status === 'in-progress').length;
  const pending = tasks.filter((task) => task.status !== 'done').length;

  const cards = [
    { label: 'Total tasks', value: total },
    { label: 'Completed', value: completed },
    { label: 'In progress', value: inProgress },
    { label: 'Pending', value: pending }
  ];

  statsGrid.innerHTML = cards
    .map(
      (card) => `
        <div class="stat-card">
          <span>${card.label}</span>
          <strong>${card.value}</strong>
        </div>
      `
    )
    .join('');
}

function getFilteredTasks() {
  const search = searchInput.value.trim().toLowerCase();
  const statusValue = filterStatus.value;
  const priorityValue = filterPriority.value;

  return tasks.filter((task) => {
    const matchesSearch =
      !search ||
      task.title.toLowerCase().includes(search) ||
      task.description.toLowerCase().includes(search) ||
      task.category.toLowerCase().includes(search);

    const matchesStatus = statusValue === 'all' || task.status === statusValue;
    const matchesPriority = priorityValue === 'all' || task.priority === priorityValue;

    return matchesSearch && matchesStatus && matchesPriority;
  });
}

function renderBoard() {
  const filteredTasks = getFilteredTasks();
  const columns = Object.entries(statusConfig);

  board.innerHTML = columns
    .map(([status, config]) => {
      const columnTasks = filteredTasks.filter((task) => task.status === status);

      return `
        <section class="column" data-status="${status}" ondragover="event.preventDefault()" ondrop="handleDrop(event, '${status}')">
          <div class="column-header">
            <h3>${config.label}</h3>
            <span>${columnTasks.length}</span>
          </div>
          ${columnTasks.length ? columnTasks.map(renderTaskCard).join('') : '<p class="empty-state">No tasks here yet.</p>'}
        </section>
      `;
    })
    .join('');
}

function renderTaskCard(task) {
  return `
    <article class="task-card" draggable="true" data-id="${task.id}" ondragstart="handleDragStart(event, '${task.id}')">
      <h3>${task.title}</h3>
      <p>${task.description || 'No description yet.'}</p>
      <div class="task-meta">
        <span class="badge ${task.priority.toLowerCase()}">${task.priority}</span>
        <span class="badge">${task.category || 'General'}</span>
        ${task.dueDate ? `<span class="badge">Due ${task.dueDate}</span>` : ''}
      </div>
      <div class="card-actions">
        <div class="action-group">
          <button class="action-btn" data-action="advance" data-id="${task.id}">▶</button>
          <button class="action-btn" data-action="edit" data-id="${task.id}">✎</button>
        </div>
        <button class="action-btn" data-action="delete" data-id="${task.id}">✕</button>
      </div>
    </article>
  `;
}

function renderActivity() {
  if (!activity.length) {
    activityList.innerHTML = '<li>No recent updates yet.</li>';
    return;
  }

  activityList.innerHTML = activity
    .map((item) => `<li><strong>${item.time}</strong> — ${item.message}</li>`)
    .join('');
}

function handleSubmit(event) {
  event.preventDefault();

  const task = {
    id: editingId || crypto.randomUUID(),
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    dueDate: dueDateInput.value,
    priority: priorityInput.value,
    category: categoryInput.value.trim() || 'General',
    status: statusInput.value
  };

  if (!task.title) return;

  if (editingId) {
    tasks = tasks.map((item) => (item.id === editingId ? task : item));
    addActivity(`Updated task “${task.title}”.`);
  } else {
    tasks.unshift(task);
    addActivity(`Created task “${task.title}”.`);
  }

  saveTasks();
  render();
  resetForm();
}

function handleBoardClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  if (action === 'delete') {
    tasks = tasks.filter((item) => item.id !== id);
    addActivity(`Deleted task “${task.title}”.`);
    saveTasks();
    render();
  }

  if (action === 'edit') {
    editingId = id;
    titleInput.value = task.title;
    descriptionInput.value = task.description;
    dueDateInput.value = task.dueDate;
    priorityInput.value = task.priority;
    categoryInput.value = task.category;
    statusInput.value = task.status;
    cancelEditButton.style.display = 'inline-block';
    titleInput.focus();
  }

  if (action === 'advance') {
    const nextStatus = {
      todo: 'in-progress',
      'in-progress': 'review',
      review: 'done',
      done: 'done'
    }[task.status];

    task.status = nextStatus;
    addActivity(`Moved “${task.title}” to ${statusConfig[nextStatus].label}.`);
    saveTasks();
    render();
  }
}

function handleDragStart(event, id) {
  event.dataTransfer.setData('text/plain', id);
}

function handleDrop(event, status) {
  event.preventDefault();
  const id = event.dataTransfer.getData('text/plain');
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  task.status = status;
  addActivity(`Moved “${task.title}” to ${statusConfig[status].label}.`);
  saveTasks();
  render();
}

function render() {
  renderStats();
  renderBoard();
  renderActivity();
}

form.addEventListener('submit', handleSubmit);
cancelEditButton.addEventListener('click', resetForm);
board.addEventListener('click', handleBoardClick);
authForm.addEventListener('submit', handleAuthSubmit);
toggleAuthModeButton.addEventListener('click', () => setAuthMode(!isSignupMode));
logoutButton.addEventListener('click', () => {
  localStorage.removeItem('flowboard-current-user');
  currentUser = null;
  authForm.reset();
  showAuthScreen();
  setAuthMode(false);
});
[searchInput, filterStatus, filterPriority].forEach((input) => {
  input.addEventListener('input', renderBoard);
});

resetForm();
setAuthMode(false);

if (currentUser) {
  showAppScreen();
  render();
} else {
  showAuthScreen();
}
