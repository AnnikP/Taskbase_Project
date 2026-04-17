/* ─────────────────────────────────────────────────────────────────────────────
   dashboard.js  –  Taskbase client-side logic
   ───────────────────────────────────────────────────────────────────────────── */

const API = {
  // Auth
  me:       () => get('/api/auth/me'),
  logout:   () => post('/api/auth/logout'),

  // User
  profile:  () => get('/api/user/profile'),

  // Lists
  getLists:   ()         => get('/api/lists'),
  createList: (title)    => post('/api/lists', { title }),
  deleteList: (id)       => del(`/api/lists/${id}`),
  renameList: (id, title)=> patch(`/api/lists/${id}`, { title }),

  // Tasks
  getTasks:    (listId)           => get(`/api/tasks?listId=${listId}`),
  createTask:  (title, listId)    => post('/api/tasks', { title, listId }),
  toggleTask:  (id, completed)    => patch(`/api/tasks/${id}`, { completed }),
  deleteTask:  (id)               => del(`/api/tasks/${id}`),
  searchTasks: (q)                => get(`/api/tasks/search?q=${encodeURIComponent(q)}`)
};

// ─── HTTP helpers ──────────────────────────────────────────────────────────────
async function get(url) {
  const r = await fetch(url);
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}
async function post(url, body = {}) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}
async function patch(url, body = {}) {
  const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}
async function del(url) {
  const r = await fetch(url, { method: 'DELETE' });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}

// ─── State ─────────────────────────────────────────────────────────────────────
let state = {
  lists:       [],
  activeListId: null,
  tasks:       [],
  searchMode:  false
};

// ─── DOM refs ──────────────────────────────────────────────────────────────────
const sidebarLists = () => document.getElementById('sidebarLists');
const mainContent  = () => document.getElementById('mainContent');
const newListInput = () => document.getElementById('newListInput');
const searchInput  = () => document.getElementById('searchInput');

// ─── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Verify session; redirect if not logged in
  try {
    await API.me();
  } catch {
    window.location.href = '/';
    return;
  }

  await loadLists();
  bindSidebar();
  bindSearch();
  bindDarkToggle();
  applyStoredTheme();

  // Show welcome screen
  renderWelcome();
});

// ─── Lists ─────────────────────────────────────────────────────────────────────
async function loadLists() {
  state.lists = await API.getLists();
  renderSidebar();
}

function renderSidebar() {
  const el = sidebarLists();
  el.innerHTML = '';

  if (state.lists.length === 0) {
    el.innerHTML = '<p class="sidebar-empty">No lists yet. Create one below ↓</p>';
    return;
  }

  state.lists.forEach(list => {
    const item = document.createElement('div');
    item.className = 'sidebar-list-item' + (list._id === state.activeListId ? ' active' : '');
    item.dataset.id = list._id;

    item.innerHTML = `
      <span class="list-item-title">${esc(list.title)}</span>
      <div class="list-item-actions">
        <button class="list-action-btn rename-btn" title="Rename" data-id="${list._id}">✎</button>
        <button class="list-action-btn delete-btn" title="Delete" data-id="${list._id}">✕</button>
      </div>
    `;

    item.querySelector('.list-item-title').addEventListener('click', () => selectList(list._id));

    item.querySelector('.rename-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const newTitle = prompt('Rename list:', list.title);
      if (!newTitle || !newTitle.trim()) return;
      try {
        const updated = await API.renameList(list._id, newTitle.trim());
        const i = state.lists.findIndex(l => l._id === list._id);
        state.lists[i] = updated;
        renderSidebar();
        if (state.activeListId === list._id) renderTaskView();
      } catch (err) { showToast(err.message, 'error'); }
    });

    item.querySelector('.delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete "${list.title}" and all its tasks?`)) return;
      try {
        await API.deleteList(list._id);
        state.lists = state.lists.filter(l => l._id !== list._id);
        if (state.activeListId === list._id) {
          state.activeListId = null;
          state.tasks = [];
          renderWelcome();
        }
        renderSidebar();
        showToast('List deleted.', 'info');
      } catch (err) { showToast(err.message, 'error'); }
    });

    el.appendChild(item);
  });
}

async function selectList(id) {
  state.activeListId = id;
  state.searchMode   = false;
  searchInput().value = '';
  renderSidebar();
  try {
    state.tasks = await API.getTasks(id);
    renderTaskView();
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── Task view ─────────────────────────────────────────────────────────────────
function renderTaskView() {
  const list = state.lists.find(l => l._id === state.activeListId);
  if (!list) return renderWelcome();

  const done  = state.tasks.filter(t => t.completed).length;
  const total = state.tasks.length;

  mainContent().innerHTML = `
    <div class="task-view">
      <div class="task-view-header">
        <h1 class="task-view-title">${esc(list.title)}</h1>
        <span class="task-count">${total - done} of ${total} remaining</span>
      </div>

      <div class="add-task-row">
        <input class="add-task-input" id="addTaskInput" type="text"
               placeholder="Add a new task…" maxlength="200" />
        <button class="add-task-btn" id="addTaskBtn">Add</button>
      </div>

      <div id="taskListContainer"></div>
    </div>
  `;

  renderTasks();

  document.getElementById('addTaskBtn').addEventListener('click', handleAddTask);
  document.getElementById('addTaskInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAddTask();
  });
}

function renderTasks() {
  const container = document.getElementById('taskListContainer');
  if (!container) return;
  container.innerHTML = '';

  const todo = state.tasks.filter(t => !t.completed);
  const done = state.tasks.filter(t =>  t.completed);

  if (state.tasks.length === 0) {
    container.innerHTML = '<div class="task-empty">No tasks yet. Add one above ↑</div>';
    return;
  }

  function buildTaskEl(task) {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' completed' : '');
    li.dataset.id = task._id;
    li.innerHTML = `
      <label class="task-check-label">
        <input class="task-checkbox" type="checkbox" ${task.completed ? 'checked' : ''}/>
        <span class="task-title">${esc(task.title)}</span>
      </label>
      <button class="task-delete-btn" title="Delete task" data-id="${task._id}">✕</button>
    `;
    li.querySelector('.task-checkbox').addEventListener('change', async (e) => {
      try {
        const updated = await API.toggleTask(task._id, e.target.checked);
        const i = state.tasks.findIndex(t => t._id === task._id);
        state.tasks[i] = updated;
        updateCountBadge();
        renderTasks();
      } catch (err) { showToast(err.message, 'error'); e.target.checked = !e.target.checked; }
    });
    li.querySelector('.task-delete-btn').addEventListener('click', async () => {
      try {
        await API.deleteTask(task._id);
        state.tasks = state.tasks.filter(t => t._id !== task._id);
        updateCountBadge();
        renderTasks();
        showToast('Task removed.', 'info');
      } catch (err) { showToast(err.message, 'error'); }
    });
    return li;
  }

  // ── To-do section ──
  const todoLabel = document.createElement('div');
  todoLabel.className = 'section-label';
  todoLabel.textContent = 'To do';
  container.appendChild(todoLabel);

  const todoList = document.createElement('ul');
  todoList.className = 'task-list';
  if (todo.length === 0) {
    todoList.innerHTML = '<li class="task-empty">Nothing to do — add a task above</li>';
  } else {
    todo.forEach(t => todoList.appendChild(buildTaskEl(t)));
  }
  container.appendChild(todoList);

  // ── Completed section (only if there are any) ──
  if (done.length > 0) {
    const doneLabel = document.createElement('div');
    doneLabel.className = 'section-label';
    doneLabel.textContent = 'Completed';
    container.appendChild(doneLabel);

    const doneList = document.createElement('ul');
    doneList.className = 'task-list';
    done.forEach(t => doneList.appendChild(buildTaskEl(t)));
    container.appendChild(doneList);
  }
}

async function handleAddTask() {
  const input = document.getElementById('addTaskInput');
  const title = input?.value.trim();
  if (!title || !state.activeListId) return;

  try {
    const task = await API.createTask(title, state.activeListId);
    state.tasks.push(task);
    input.value = '';
    updateCountBadge();
    renderTasks();
    input.focus();
  } catch (err) { showToast(err.message, 'error'); }
}

function updateCountBadge() {
  const badge = document.querySelector('.task-count');
  if (!badge) return;
  const done  = state.tasks.filter(t => t.completed).length;
  const total = state.tasks.length;
  badge.textContent = `${total - done} of ${total} remaining`;
}

// ─── Welcome screen ────────────────────────────────────────────────────────────
function renderWelcome() {
  mainContent().innerHTML = `
    <div class="welcome-screen">
      <div class="welcome-icon">✦</div>
      <h2 class="welcome-title">Welcome to Taskbase</h2>
      <p class="welcome-sub">Select a list from the sidebar or create a new one to get started.</p>
    </div>
  `;
}

// ─── Sidebar bindings ──────────────────────────────────────────────────────────
function bindSidebar() {
  // New list
  document.getElementById('newListBtn').addEventListener('click', handleNewList);
  document.getElementById('newListInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleNewList();
  });

  // Account modal
  document.querySelector('.account-btn').addEventListener('click', openAccountModal);

  // Logout
  document.querySelector('.logout-btn').addEventListener('click', async () => {
    if (!confirm('Log out of Taskbase?')) return;
    try {
      await API.logout();
      window.location.href = '/';
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function handleNewList() {
  const input = newListInput();
  const title = input.value.trim();
  if (!title) { input.focus(); return; }

  try {
    const list = await API.createList(title);
    state.lists.push(list);
    input.value = '';
    renderSidebar();
    showToast(`"${list.title}" created!`, 'success');
    selectList(list._id);
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── Search ────────────────────────────────────────────────────────────────────
function bindSearch() {
  let debounce;
  searchInput().addEventListener('input', e => {
    clearTimeout(debounce);
    const q = e.target.value.trim();
    if (!q) {
      state.searchMode = false;
      if (state.activeListId) selectList(state.activeListId);
      else renderWelcome();
      return;
    }
    debounce = setTimeout(() => runSearch(q), 300);
  });
}

async function runSearch(q) {
  try {
    const results = await API.searchTasks(q);
    state.searchMode = true;
    state.activeListId = null;
    renderSidebar();
    renderSearchResults(results, q);
  } catch (err) { showToast(err.message, 'error'); }
}

function renderSearchResults(tasks, q) {
  if (tasks.length === 0) {
    mainContent().innerHTML = `
      <div class="welcome-screen">
        <div class="welcome-icon">◌</div>
        <h2 class="welcome-title">No results for "${esc(q)}"</h2>
        <p class="welcome-sub">Try a different keyword.</p>
      </div>`;
    return;
  }

  const items = tasks.map(t => `
    <li class="task-item search-result ${t.completed ? 'completed' : ''}" data-id="${t._id}">
      <label class="task-check-label">
        <input class="task-checkbox" type="checkbox" ${t.completed ? 'checked' : ''} data-id="${t._id}"/>
        <span class="task-title">${esc(t.title)}</span>
      </label>
      <span class="search-list-tag">${esc(t.list?.title || '')}</span>
    </li>`).join('');

  mainContent().innerHTML = `
    <div class="task-view">
      <div class="task-view-header">
        <h1 class="task-view-title">Results for "${esc(q)}"</h1>
        <span class="task-count">${tasks.length} found</span>
      </div>
      <ul class="task-list">${items}</ul>
    </div>`;

  // Wire checkboxes in search results
  mainContent().querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      try {
        await API.toggleTask(cb.dataset.id, e.target.checked);
        runSearch(searchInput().value.trim());
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}

// ─── Account modal ─────────────────────────────────────────────────────────────
async function openAccountModal() {
  try {
    const profile = await API.profile();
    showModal(`
      <div class="modal-profile">
        <div class="modal-avatar">${profile.username.charAt(0).toUpperCase()}</div>
        <h2 class="modal-name">@${esc(profile.username)}</h2>
        <div class="profile-grid">
          <div class="profile-row"><span class="profile-label">User ID</span><span class="profile-val mono">${profile.userId}</span></div>
          <div class="profile-row"><span class="profile-label">Email</span><span class="profile-val">${esc(profile.email)}</span></div>
          <div class="profile-row"><span class="profile-label">Phone</span><span class="profile-val">${esc(profile.phone)}</span></div>
          <div class="profile-row"><span class="profile-label">Total Lists</span><span class="profile-val accent">${profile.totalLists}</span></div>
          <div class="profile-row"><span class="profile-label">Total Tasks</span><span class="profile-val accent">${profile.totalTasks}</span></div>
        </div>
      </div>
    `);
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── Modal helpers ─────────────────────────────────────────────────────────────
function showModal(html) {
  const existing = document.getElementById('taskbaseModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'taskbaseModal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" id="modalClose">✕</button>
      ${html}
    </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('modalClose').addEventListener('click', () => overlay.remove());

  // Trap escape key
  const esc = e => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);
}

// ─── Dark mode ─────────────────────────────────────────────────────────────────
function bindDarkToggle() {
  document.getElementById('darkToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    document.getElementById('darkLabel').textContent = isDark ? 'Light' : 'Dark';
    localStorage.setItem('tb-dark', isDark ? '1' : '0');
  });
}

function applyStoredTheme() {
  if (localStorage.getItem('tb-dark') === '1') {
    document.body.classList.add('dark');
    document.getElementById('darkLabel').textContent = 'Light';
  }
}

// ─── Toast notifications ───────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toastContainer';
  div.className = 'toast-container';
  document.body.appendChild(div);
  return div;
}

// ─── Utilities ─────────────────────────────────────────────────────────────────
function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}