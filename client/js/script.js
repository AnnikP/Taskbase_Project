// ── In-memory state ────────────────────────────────────────────────────────
      let nextListId = 10;
      let nextTaskId = 100;
      let activeListId = 1;
      let searchQuery = '';

      const lists = [
        { id: 1, name: 'Work' },
        { id: 2, name: 'Personal' },
        { id: 3, name: 'Shopping' },
      ];

      const tasks = [
        { id: 1, listId: 1, text: 'Finish Q3 report and send to stakeholders', done: false },
        { id: 2, listId: 1, text: 'Review pull requests from the team',         done: false },
        { id: 3, listId: 1, text: 'Schedule 1:1 with Sarah about onboarding',   done: false },
        { id: 4, listId: 1, text: 'Set up staging environment',                 done: true  },
        { id: 5, listId: 2, text: 'Book dentist appointment',                   done: false },
        { id: 6, listId: 2, text: 'Call mum back',                              done: true  },
        { id: 7, listId: 2, text: 'Renew car insurance',                        done: false },
        { id: 8, listId: 3, text: 'Oat milk',                                   done: false },
        { id: 9, listId: 3, text: 'Sourdough bread',                            done: true  },
      ];

      // ── Helpers ────────────────────────────────────────────────────────────────
      function esc(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      }

      function totalCount(listId) { return tasks.filter(t => t.listId === listId).length; }
      function remainingCount(listId) { return tasks.filter(t => t.listId === listId && !t.done).length; }

      // ── Sidebar ────────────────────────────────────────────────────────────────
      function renderSidebar() {
        const el = document.getElementById('sidebarLists');
        el.innerHTML = '';
        lists.forEach(list => {
          const item = document.createElement('div');
          item.className = 'list-item' + (list.id === activeListId ? ' active' : '');
          item.innerHTML = `
            <span class="list-item-name">${esc(list.name)}</span>
            <span class="list-item-count">${totalCount(list.id)}</span>
            <button class="list-item-delete" title="Delete list">×</button>
          `;
          item.addEventListener('click', e => {
            if (e.target.classList.contains('list-item-delete')) return;
            activeListId = list.id;
            searchQuery = '';
            document.getElementById('searchInput').value = '';
            render();
          });
          item.querySelector('.list-item-delete').addEventListener('click', () => deleteList(list.id));
          el.appendChild(item);
        });
      }

      // ── Task HTML ──────────────────────────────────────────────────────────────
      function taskHTML(t) {
        return `<div class="task-item${t.done ? ' is-checked' : ''}" data-id="${t.id}">
          <div class="task-checkbox${t.done ? ' checked' : ''}" data-check="${t.id}"></div>
          <span class="task-text">${esc(t.text)}</span>
          <button class="task-delete" data-del="${t.id}" title="Delete">×</button>
        </div>`;
      }

      function bindTaskEvents(root) {
        root.querySelectorAll('[data-check]').forEach(el => el.addEventListener('click', () => toggleTask(+el.dataset.check)));
        root.querySelectorAll('[data-del]').forEach(el => el.addEventListener('click', () => deleteTask(+el.dataset.del)));
      }

      // ── Main content ───────────────────────────────────────────────────────────
      function renderMain() {
        const content = document.getElementById('mainContent');

        // Search mode
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const results = tasks.filter(t => t.text.toLowerCase().includes(q));
          let html = `<div class="list-detail-header">
            <div class="list-detail-title">Search</div>
            <div class="list-detail-stats">${results.length} result${results.length !== 1 ? 's' : ''}</div>
          </div>`;
          if (!results.length) {
            html += `<div class="no-tasks">No tasks match "${esc(searchQuery)}"</div>`;
          } else {
            const grouped = {};
            results.forEach(t => { (grouped[t.listId] = grouped[t.listId] || []).push(t); });
            Object.keys(grouped).forEach(lid => {
              const list = lists.find(l => l.id === +lid);
              if (!list) return;
              html += `<div class="search-result-list">${esc(list.name)}</div><div class="task-list">`;
              grouped[lid].forEach(t => { html += taskHTML(t); });
              html += `</div>`;
            });
          }
          content.innerHTML = html;
          bindTaskEvents(content);
          return;
        }

        // No lists at all
        if (!lists.length) {
          content.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">✦</div>
            <div class="empty-state-title">No lists yet</div>
            <div class="empty-state-sub">Create one in the sidebar to get started</div>
          </div>`;
          return;
        }

        // Ensure active list is still valid
        if (!lists.find(l => l.id === activeListId)) activeListId = lists[0].id;

        const list = lists.find(l => l.id === activeListId);
        const todo = tasks.filter(t => t.listId === activeListId && !t.done);
        const done = tasks.filter(t => t.listId === activeListId && t.done);
        const total = todo.length + done.length;

        let html = `
          <div class="list-detail-header">
            <div class="list-detail-title">${esc(list.name)}</div>
            <div class="list-detail-stats">${todo.length} of ${total} remaining</div>
          </div>
          <div class="add-task-form">
            <input class="add-task-input" id="addTaskInput" type="text" placeholder="Add a task…" maxlength="200"/>
            <button class="add-task-btn" id="addTaskBtn">Add</button>
          </div>
          <div class="section-label">To do</div>
          <div class="task-list">
            ${todo.length ? todo.map(taskHTML).join('') : '<div class="no-tasks">Nothing to do — add a task above</div>'}
          </div>
        `;

        if (done.length) {
          html += `<div class="section-label">Completed</div><div class="task-list">${done.map(taskHTML).join('')}</div>`;
        }

        html += `<div class="unlock-banner">
          <div class="unlock-text">
            <strong>You're viewing a demo.</strong><br/>
            Sign in or create a free account to save your lists, sync across devices, and track your own tasks.
          </div>
          <div class="unlock-actions">
            <a class="unlock-btn-login" href="/pages/login.html">Log in</a>
            <a class="unlock-btn-register" href="/pages/login.html">Get started</a>
          </div>
        </div>`;

        content.innerHTML = html;
        bindTaskEvents(content);

        const addInput = document.getElementById('addTaskInput');
        document.getElementById('addTaskBtn').addEventListener('click', () => addTask(addInput));
        addInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(addInput); });
      }

      // ── Actions ────────────────────────────────────────────────────────────────
      function addList(name) {
        if (!name.trim()) return;
        const id = nextListId++;
        lists.push({ id, name: name.trim() });
        activeListId = id;
        render();
      }

      function deleteList(id) {
        const idx = lists.findIndex(l => l.id === id);
        if (idx === -1) return;
        lists.splice(idx, 1);
        for (let i = tasks.length - 1; i >= 0; i--) {
          if (tasks[i].listId === id) tasks.splice(i, 1);
        }
        if (activeListId === id) activeListId = lists.length ? lists[0].id : null;
        render();
      }

      function addTask(input) {
        const text = input.value.trim();
        if (!text || !activeListId) return;
        tasks.push({ id: nextTaskId++, listId: activeListId, text, done: false });
        input.value = '';
        render();
      }

      function toggleTask(id) {
        const t = tasks.find(t => t.id === id);
        if (t) { t.done = !t.done; render(); }
      }

      function deleteTask(id) {
        const idx = tasks.findIndex(t => t.id === id);
        if (idx !== -1) { tasks.splice(idx, 1); render(); }
      }

      // ── Full render ────────────────────────────────────────────────────────────
      function render() {
        renderSidebar();
        renderMain();
      }

      // ── New list form ──────────────────────────────────────────────────────────
      const newListInput = document.getElementById('newListInput');
      document.getElementById('newListBtn').addEventListener('click', () => {
        addList(newListInput.value); newListInput.value = '';
      });
      newListInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { addList(newListInput.value); newListInput.value = ''; }
      });

      // ── Search ─────────────────────────────────────────────────────────────────
      document.getElementById('searchInput').addEventListener('input', e => {
        searchQuery = e.target.value;
        render();
      });

      // ── Dark mode ──────────────────────────────────────────────────────────────
      const darkLabel = document.getElementById('darkLabel');
      const htmlEl    = document.documentElement;
      if (localStorage.getItem('theme') === 'dark') { htmlEl.setAttribute('data-theme', 'dark'); darkLabel.textContent = 'Light'; }
      document.getElementById('darkToggle').addEventListener('click', () => {
        const isDark = htmlEl.getAttribute('data-theme') === 'dark';
        isDark ? htmlEl.removeAttribute('data-theme') : htmlEl.setAttribute('data-theme', 'dark');
        darkLabel.textContent = isDark ? 'Dark' : 'Light';
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
      });

      // ── Init ───────────────────────────────────────────────────────────────────
      render();