(() => {
  const STORAGE_KEY = 'task-tracker-v1';
  const THEME_KEY = 'task-tracker-theme';

  /** @type {{id:string,title:string,desc:string,priority:'low'|'medium'|'high',deadline:string,progress:number,done:boolean,created:number}[]} */
  let tasks = load();
  let filter = 'all';
  let search = '';
  let sortBy = 'created';

  const $ = (id) => document.getElementById(id);
  const els = {
    list: $('taskList'),
    empty: $('emptyState'),
    addForm: $('addForm'),
    newTitle: $('newTitle'),
    newPriority: $('newPriority'),
    newDeadline: $('newDeadline'),
    search: $('search'),
    sortBy: $('sortBy'),
    chips: $('statusChips'),
    overallBar: $('overallBar'),
    overallText: $('overallText'),
    statTotal: $('statTotal'),
    statDone: $('statDone'),
    statActive: $('statActive'),
    statOverdue: $('statOverdue'),
    modal: $('modal'),
    editForm: $('editForm'),
    editId: $('editId'),
    editTitle: $('editTitle'),
    editDesc: $('editDesc'),
    editPriority: $('editPriority'),
    editDeadline: $('editDeadline'),
    editProgress: $('editProgress'),
    editProgressLabel: $('editProgressLabel'),
    btnCancel: $('btnCancel'),
    btnExport: $('btnExport'),
    importFile: $('importFile'),
    btnReset: $('btnReset'),
    btnTheme: $('btnTheme'),
  };

  // ---------- Хранение ----------
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

  // ---------- Вычисления ----------
  function isOverdue(t) {
    if (t.done || !t.deadline) return false;
    const today = new Date().toISOString().slice(0, 10);
    return t.deadline < today;
  }

  // Прогресс задачи: если отмечена готовой — 100%, иначе её ручной процент
  const taskPercent = (t) => (t.done ? 100 : clamp(t.progress));

  function overallPercent() {
    if (!tasks.length) return 0;
    const sum = tasks.reduce((acc, t) => acc + taskPercent(t), 0);
    return Math.round(sum / tasks.length);
  }

  // ---------- Рендер ----------
  const PRIO_ORDER = { high: 0, medium: 1, low: 2 };
  const PRIO_LABEL = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };

  function getVisibleTasks() {
    let list = tasks.filter((t) => {
      if (filter === 'active' && t.done) return false;
      if (filter === 'done' && !t.done) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.desc.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'priority') return PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority];
      if (sortBy === 'deadline') {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      }
      return a.created - b.created;
    });
    return list;
  }

  function render() {
    const visible = getVisibleTasks();
    els.list.innerHTML = '';

    for (const t of visible) {
      els.list.appendChild(buildTaskNode(t));
    }
    els.empty.hidden = tasks.length !== 0;

    renderStats();
  }

  function buildTaskNode(t) {
    const li = document.createElement('li');
    const overdue = isOverdue(t);
    li.className = `task prio-${t.priority}` + (t.done ? ' done' : '') + (overdue ? ' overdue' : '');
    li.dataset.id = t.id;

    // Чекбокс «готово»
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = t.done;
    cb.title = 'Отметить готовой';
    cb.addEventListener('change', () => toggleDone(t.id));

    const body = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = t.title;

    body.appendChild(title);

    if (t.desc) {
      const desc = document.createElement('div');
      desc.className = 'task-desc';
      desc.textContent = t.desc;
      body.appendChild(desc);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span class="badge ${t.priority}">${PRIO_LABEL[t.priority]}</span>`;
    if (t.deadline) {
      const d = document.createElement('span');
      d.className = 'meta-deadline';
      d.textContent = `📅 ${formatDate(t.deadline)}${overdue ? ' (просрочено)' : ''}`;
      meta.appendChild(d);
    }
    body.appendChild(meta);

    // Прогресс задачи
    const pct = taskPercent(t);
    const prog = document.createElement('div');
    prog.className = 'task-progress';
    prog.innerHTML = `<div class="bar"><div style="width:${pct}%"></div></div><span>${pct}%</span>`;
    body.appendChild(prog);

    // Действия
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    actions.appendChild(makeBtn('✏️', 'Редактировать', () => openModal(t.id)));
    actions.appendChild(makeBtn('🗑', 'Удалить', () => deleteTask(t.id), 'danger'));

    li.append(cb, body, actions);
    return li;
  }

  function makeBtn(icon, title, onClick, extra = '') {
    const b = document.createElement('button');
    b.className = `btn btn-icon ${extra}`.trim();
    b.textContent = icon;
    b.title = title;
    b.addEventListener('click', onClick);
    return b;
  }

  function renderStats() {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    const active = total - done;
    const overdue = tasks.filter(isOverdue).length;
    const pct = overallPercent();

    els.overallBar.style.width = pct + '%';
    els.overallText.textContent = pct + '%';
    els.statTotal.textContent = total;
    els.statDone.textContent = done;
    els.statActive.textContent = active;
    els.statOverdue.textContent = overdue;
  }

  function formatDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  // ---------- Действия ----------
  function addTask(data) {
    tasks.push({
      id: uid(),
      title: data.title.trim(),
      desc: (data.desc || '').trim(),
      priority: data.priority || 'medium',
      deadline: data.deadline || '',
      progress: 0,
      done: false,
      created: Date.now(),
    });
    save();
    render();
  }

  function toggleDone(id) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    // Если отмечена готовой — прогресс 100, иначе откатываем на 0 при снятии, если было 100
    t.progress = t.done ? 100 : (t.progress === 100 ? 0 : t.progress);
    save();
    render();
  }

  function deleteTask(id) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    if (!confirm(`Удалить задачу «${t.title}»?`)) return;
    tasks = tasks.filter((x) => x.id !== id);
    save();
    render();
  }

  function updateTask(id, patch) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    if (t.done) t.progress = 100;
    save();
    render();
  }

  // ---------- Модалка ----------
  function openModal(id) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    els.editId.value = t.id;
    els.editTitle.value = t.title;
    els.editDesc.value = t.desc;
    els.editPriority.value = t.priority;
    els.editDeadline.value = t.deadline;
    els.editProgress.value = taskPercent(t);
    els.editProgressLabel.textContent = taskPercent(t) + '%';
    els.modal.hidden = false;
    els.editTitle.focus();
  }

  function closeModal() {
    els.modal.hidden = true;
  }

  // ---------- Импорт / экспорт ----------
  function exportJSON() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('not array');
        tasks = data.map((t) => ({
          id: t.id || uid(),
          title: String(t.title || 'Без названия'),
          desc: String(t.desc || ''),
          priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
          deadline: /^\d{4}-\d{2}-\d{2}$/.test(t.deadline || '') ? t.deadline : '',
          progress: clamp(t.progress),
          done: !!t.done,
          created: Number(t.created) || Date.now(),
        }));
        save();
        render();
      } catch {
        alert('Не удалось прочитать файл. Нужен JSON-массив задач.');
      }
    };
    reader.readAsText(file);
  }

  // ---------- Тема ----------
  function applyTheme() {
    document.body.classList.toggle('dark', localStorage.getItem(THEME_KEY) === 'dark');
  }

  // ---------- Обработчики ----------
  els.addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = els.newTitle.value.trim();
    if (!title) return;
    addTask({
      title,
      priority: els.newPriority.value,
      deadline: els.newDeadline.value,
    });
    els.addForm.reset();
    els.newPriority.value = 'medium';
    els.newTitle.focus();
  });

  els.search.addEventListener('input', (e) => {
    search = e.target.value;
    render();
  });

  els.sortBy.addEventListener('change', (e) => {
    sortBy = e.target.value;
    render();
  });

  els.chips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filter = chip.dataset.filter;
    els.chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
    render();
  });

  els.editProgress.addEventListener('input', () => {
    els.editProgressLabel.textContent = els.editProgress.value + '%';
  });

  els.editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const progress = clamp(els.editProgress.value);
    updateTask(els.editId.value, {
      title: els.editTitle.value.trim() || 'Без названия',
      desc: els.editDesc.value.trim(),
      priority: els.editPriority.value,
      deadline: els.editDeadline.value,
      progress,
      done: progress === 100 ? true : tasks.find((x) => x.id === els.editId.value)?.done && progress === 100,
    });
    closeModal();
  });

  els.btnCancel.addEventListener('click', closeModal);
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.modal.hidden) closeModal();
  });

  els.btnExport.addEventListener('click', exportJSON);
  els.importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importJSON(file);
    e.target.value = '';
  });

  els.btnReset.addEventListener('click', () => {
    if (!tasks.length) return;
    if (!confirm('Точно удалить ВСЕ задачи?')) return;
    tasks = [];
    save();
    render();
  });

  els.btnTheme.addEventListener('click', () => {
    const next = document.body.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme();
  });

  // ---------- Старт ----------
  applyTheme();
  render();
})();
