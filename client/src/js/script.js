/* ── State ── */
let lists = JSON.parse(localStorage.getItem('tdlists') || '[]');
/* lists: [{ id, name, tasks: [{ id, text, checked }] }] */
let activeListId = null;
let searchQuery = '';
let isDark = localStorage.getItem('tddark') === 'true';

/* ── Persist ── */
function save() { localStorage.setItem('tdlists', JSON.stringify(lists)); }

/* ── ID gen ── */
const uid = () => Math.random().toString(36).slice(2, 9);

/* ── Dark mode ── */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('darkLabel').textContent = isDark ? 'Light' : 'Dark';
  localStorage.setItem('tddark', isDark);
}

document.getElementById('darkToggle').addEventListener('click', () => {
  isDark = !isDark;
  applyTheme();
});

applyTheme();

/* ── Render sidebar ── */
function renderSidebar() {
  const container = document.getElementById('sidebarLists');
  if (lists.length === 0) {
    container.innerHTML = `<div style="padding:16px 20px;font-size:11px;color:var(--text-muted);letter-spacing:0.04em;">No lists yet.</div>`;
    return;
  }
  container.innerHTML = lists.map(list => {
    const total = list.tasks.length;
    const done = list.tasks.filter(t => t.checked).length;
    const active = list.id === activeListId ? 'active' : '';
    return `
      <div class="list-item ${active}" data-id="${list.id}" onclick="selectList('${list.id}')">
        <span class="list-item-name">${esc(list.name)}</span>
        <span class="list-item-count">${done}/${total}</span>
        <button class="list-item-delete" onclick="deleteList(event,'${list.id}')" title="Delete list">×</button>
      </div>`;
  }).join('');
}

/* ── Render main ── */
function renderMain() {
  const content = document.getElementById('mainContent');

  // Search mode
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    let html = '';
    let found = 0;
    lists.forEach(list => {
      const matched = list.tasks.filter(t => t.text.toLowerCase().includes(q));
      if (matched.length === 0) return;
      found += matched.length;
      html += `<div class="search-result-list">${esc(list.name)}</div>`;
      html += `<div class="task-list">` + matched.map(t => taskHtml(t, list.id)).join('') + `</div>`;
    });
    if (found === 0) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">◌</div><div class="empty-state-title">No results</div><div class="empty-state-sub">Try a different search term</div></div>`;
    } else {
      content.innerHTML = `<div class="list-detail-header"><div class="list-detail-title">Search</div><div class="list-detail-stats">${found} result${found !== 1 ? 's' : ''}</div></div>` + html;
    }
    return;
  }

  // No list selected
  if (!activeListId) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">◫</div><div class="empty-state-title">Select a list</div><div class="empty-state-sub">Choose a list from the sidebar or create one</div></div>`;
    return;
  }

  const list = lists.find(l => l.id === activeListId);
  if (!list) { activeListId = null; renderMain(); return; }

  const pending = list.tasks.filter(t => !t.checked);
  const done = list.tasks.filter(t => t.checked);
  const total = list.tasks.length;
  const doneCount = done.length;

  let html = `
    <div class="list-detail-header">
      <div class="list-detail-title">${esc(list.name)}</div>
      <div class="list-detail-stats">${doneCount} of ${total} done</div>
    </div>
    <div class="add-task-form">
      <input class="add-task-input" id="addTaskInput" type="text" placeholder="Add a task…" maxlength="200" onkeydown="addTaskKey(event,'${list.id}')"/>
      <button class="add-task-btn" onclick="addTask('${list.id}')">Add</button>
    </div>`;

  if (total === 0) {
    html += `<div class="no-tasks">This list is empty — add your first task above.</div>`;
  } else {
    if (pending.length > 0) {
      html += `<div class="section-label">To do — ${pending.length}</div><div class="task-list">` + pending.map(t => taskHtml(t, list.id)).join('') + `</div>`;
    }
    if (done.length > 0) {
      html += `<div class="section-label">Completed — ${done.length}</div><div class="task-list">` + done.map(t => taskHtml(t, list.id)).join('') + `</div>`;
    }
  }

  content.innerHTML = html;

  // Focus input
  const inp = document.getElementById('addTaskInput');
  if (inp) inp.focus();
}

function taskHtml(t, listId) {
  const cls = t.checked ? 'is-checked' : '';
  const chkCls = t.checked ? 'checked' : '';
  const statusText = t.checked ? 'done' : 'open';
  return `
    <div class="task-item ${cls}" id="task-${t.id}">
      <div class="task-checkbox ${chkCls}" onclick="toggleTask('${listId}','${t.id}')" title="${t.checked ? 'Mark incomplete' : 'Mark complete'}"></div>
      <span class="task-text">${esc(t.text)}</span>
      <span class="task-status">${statusText}</span>
      <button class="task-delete" onclick="deleteTask('${listId}','${t.id}')" title="Delete task">×</button>
    </div>`;
}

/* ── Actions ── */
function selectList(id) {
  activeListId = id;
  searchQuery = '';
  document.getElementById('searchInput').value = '';
  render();
}

function deleteList(e, id) {
  e.stopPropagation();
  if (!confirm('Delete this list and all its tasks?')) return;
  lists = lists.filter(l => l.id !== id);
  if (activeListId === id) activeListId = null;
  save();
  render();
}

function addTask(listId) {
  const inp = document.getElementById('addTaskInput');
  const text = inp ? inp.value.trim() : '';
  if (!text) return;
  const list = lists.find(l => l.id === listId);
  if (!list) return;
  list.tasks.push({ id: uid(), text, checked: false });
  save();
  renderSidebar();
  renderMain();
  const newInp = document.getElementById('addTaskInput');
  if (newInp) newInp.focus();
}

function addTaskKey(e, listId) {
  if (e.key === 'Enter') addTask(listId);
}

function toggleTask(listId, taskId) {
  const list = lists.find(l => l.id === listId);
  if (!list) return;
  const task = list.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.checked = !task.checked;
  save();
  renderSidebar();
  renderMain();
}

function deleteTask(listId, taskId) {
  const list = lists.find(l => l.id === listId);
  if (!list) return;
  list.tasks = list.tasks.filter(t => t.id !== taskId);
  save();
  renderSidebar();
  renderMain();
}

/* ── New list ── */
document.getElementById('newListBtn').addEventListener('click', () => {
  const inp = document.getElementById('newListInput');
  const name = inp.value.trim();
  if (!name) return;
  const newList = { id: uid(), name, tasks: [] };
  lists.push(newList);
  save();
  activeListId = newList.id;
  inp.value = '';
  render();
});

document.getElementById('newListInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('newListBtn').click();
});

/* ── Search ── */
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderMain();
});

/* ── Utility ── */
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function render() { renderSidebar(); renderMain(); }

/* ── Seed data if empty ── */
if (lists.length === 0) {
  lists = [
    { id: uid(), name: 'Work', tasks: [
      { id: uid(), text: 'Review Q2 report draft', checked: false },
      { id: uid(), text: 'Schedule team sync for Monday', checked: true },
      { id: uid(), text: 'Update project timeline', checked: false },
    ]},
    { id: uid(), name: 'Groceries', tasks: [
      { id: uid(), text: 'Oat milk', checked: false },
      { id: uid(), text: 'Sourdough bread', checked: false },
      { id: uid(), text: 'Olive oil', checked: true },
    ]},
    { id: uid(), name: 'Reading', tasks: [
      { id: uid(), text: 'Finish Piranesi', checked: false },
      { id: uid(), text: 'Pick up from library', checked: false },
    ]},
  ];
  save();
  activeListId = lists[0].id;
}

render();