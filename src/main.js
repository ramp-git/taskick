const STORAGE_KEY = 'taskick.tasks.v1';
const THEME_KEY = 'taskick.theme.v1';

/** @typedef {{id:string,type:string,title:string,completed:boolean,createdAt:string,updatedAt:string}} Task */

const state = {
  tasks: loadTasks(),
  theme: loadTheme(),
  activeView: 'tasks',
  panelOpen: false,
  editingId: null,
};

const typeLabels = {
  shopping: '買い物',
  todo: 'やる事',
};

const app = document.querySelector('#app');
applyTheme(state.theme);
render();

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTaskLike);
  } catch {
    return [];
  }
}

function isTaskLike(task) {
  return task &&
    typeof task.id === 'string' &&
    typeof task.type === 'string' &&
    typeof task.title === 'string' &&
    typeof task.completed === 'boolean' &&
    typeof task.createdAt === 'string' &&
    typeof task.updatedAt === 'string';
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'light';
}

function saveTheme(theme) {
  state.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  render();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

function render() {
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar" aria-label="メニュー">
        <div>
          <p class="eyebrow">taskick</p>
          <h1>タスク管理</h1>
          <p class="muted">localStorage に保存するシンプルな買い物・やる事リストです。</p>
        </div>
        <nav class="nav">
          <button class="nav-button ${state.activeView === 'tasks' ? 'active' : ''}" data-view="tasks">タスク一覧</button>
          <button class="nav-button ${state.activeView === 'settings' ? 'active' : ''}" data-view="settings">設定</button>
        </nav>
      </aside>
      <main class="main">
        ${state.activeView === 'tasks' ? renderTaskView() : renderSettingsView()}
      </main>
      ${state.panelOpen ? renderTaskPanel() : ''}
    </div>
  `;
  bindEvents();
}

function renderTaskView() {
  const incomplete = state.tasks.filter((task) => !task.completed);
  const completed = state.tasks.filter((task) => task.completed);

  return `
    <section class="page-card">
      <div class="page-header">
        <div>
          <p class="eyebrow">タスク一覧</p>
          <h2>未完了 ${incomplete.length} 件 / 完了 ${completed.length} 件</h2>
        </div>
        <button class="primary" data-action="open-add">タスク追加</button>
      </div>
      <div class="deadline-grid" aria-label="期限別の状況">
        ${renderDeadlineCard('今日', 0, '期限項目は未確認のため、現在は自動分類しません。')}
        ${renderDeadlineCard('期限切れ', 0, '期限項目は未確認のため、現在は自動分類しません。')}
        ${renderDeadlineCard('期限なし', state.tasks.length, '現在のデータ構造には期限がないため全タスクをここに扱います。')}
      </div>
      ${renderTaskSection('未完了タスク', incomplete, false)}
      ${renderTaskSection('完了タスク', completed, true)}
    </section>
  `;
}

function renderDeadlineCard(label, count, note) {
  return `
    <div class="deadline-card">
      <span>${label}</span>
      <strong>${count}</strong>
      <small>${note}</small>
    </div>
  `;
}

function renderTaskSection(title, tasks, completedSection) {
  return `
    <section class="task-section">
      <div class="section-title">
        <h3>${title}</h3>
        <span>${tasks.length} 件</span>
      </div>
      ${tasks.length === 0 ? `<p class="empty">表示するタスクはありません。</p>` : `
        <ul class="task-list">
          ${tasks.map((task) => renderTaskItem(task, completedSection)).join('')}
        </ul>
      `}
    </section>
  `;
}

function renderTaskItem(task) {
  const originalIndex = state.tasks.findIndex((item) => item.id === task.id);
  return `
    <li class="task-item" data-id="${escapeAttr(task.id)}">
      <label class="check-label">
        <input type="checkbox" ${task.completed ? 'checked' : ''} data-action="toggle" />
        <span class="sr-only">完了 / 未完了切替</span>
      </label>
      <span class="type-badge">${typeLabels[task.type] ?? escapeHtml(task.type)}</span>
      <span class="task-title ${task.completed ? 'done' : ''}">${escapeHtml(task.title)}</span>
      <div class="task-actions">
        <button class="ghost" data-action="move-up" ${originalIndex === 0 ? 'disabled' : ''}>上へ</button>
        <button class="ghost" data-action="move-down" ${originalIndex === state.tasks.length - 1 ? 'disabled' : ''}>下へ</button>
        <button class="ghost" data-action="edit">編集</button>
        <button class="danger" data-action="delete">削除</button>
      </div>
    </li>
  `;
}

function renderTaskPanel() {
  const task = state.tasks.find((item) => item.id === state.editingId);
  const isEdit = Boolean(task);
  return `
    <div class="panel-backdrop" data-action="close-panel">
      <aside class="task-panel" aria-modal="true" role="dialog" aria-labelledby="panel-title" onclick="event.stopPropagation()">
        <div class="panel-header">
          <div>
            <p class="eyebrow">${isEdit ? '編集' : '追加'}</p>
            <h2 id="panel-title">タスク${isEdit ? '編集' : '追加'}パネル</h2>
          </div>
          <button class="icon-button" data-action="close-panel" aria-label="閉じる">×</button>
        </div>
        <form id="task-form" class="task-form">
          <label>
            種類
            <select name="type" required>
              <option value="shopping" ${task?.type === 'shopping' ? 'selected' : ''}>買い物</option>
              <option value="todo" ${task?.type === 'todo' ? 'selected' : ''}>やる事</option>
            </select>
          </label>
          <label>
            タスク名
            <input name="title" type="text" value="${escapeAttr(task?.title ?? '')}" maxlength="80" required placeholder="例：牛乳を買う" />
          </label>
          <label>
            ステータス
            <select name="completed" required>
              <option value="false" ${!task?.completed ? 'selected' : ''}>未完了</option>
              <option value="true" ${task?.completed ? 'selected' : ''}>完了</option>
            </select>
          </label>
          <div class="form-actions">
            <button type="button" class="ghost" data-action="close-panel">キャンセル</button>
            <button type="submit" class="primary">保存</button>
          </div>
        </form>
      </aside>
    </div>
  `;
}

function renderSettingsView() {
  return `
    <section class="page-card">
      <div class="page-header">
        <div>
          <p class="eyebrow">設定</p>
          <h2>データと表示</h2>
        </div>
      </div>
      <div class="settings-grid">
        <section class="setting-card">
          <h3>データ操作</h3>
          <div class="button-row">
            <button class="primary" data-action="export">エクスポート(JSON)</button>
            <label class="file-button">
              インポート(JSON)
              <input type="file" accept="application/json" data-action="import" />
            </label>
            <button class="danger" data-action="clear-all">全データ削除</button>
          </div>
        </section>
        <section class="setting-card">
          <h3>テーマ切替</h3>
          <div class="segmented" role="group" aria-label="テーマ切替">
            <button class="${state.theme === 'light' ? 'active' : ''}" data-action="theme" data-theme="light">ライト</button>
            <button class="${state.theme === 'dark' ? 'active' : ''}" data-action="theme" data-theme="dark">ダーク</button>
          </div>
        </section>
        <section class="setting-card">
          <h3>ストレージ使用状況</h3>
          <p class="storage-size">${formatBytes(getStorageBytes())}</p>
          <p class="muted">対象: ${STORAGE_KEY}, ${THEME_KEY}</p>
        </section>
      </div>
    </section>
  `;
}

function bindEvents() {
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeView = button.dataset.view;
      state.panelOpen = false;
      render();
    });
  });

  document.querySelectorAll('[data-action]').forEach((element) => {
    element.addEventListener('click', handleActionClick);
  });

  document.querySelector('#task-form')?.addEventListener('submit', handleTaskSubmit);
  document.querySelector('input[data-action="import"]')?.addEventListener('change', handleImport);
}

function handleActionClick(event) {
  const action = event.currentTarget.dataset.action;
  const item = event.currentTarget.closest('.task-item');
  const id = item?.dataset.id;

  if (action === 'open-add') openPanel();
  if (action === 'close-panel') closePanel();
  if (action === 'toggle' && id) toggleTask(id);
  if (action === 'edit' && id) openPanel(id);
  if (action === 'delete' && id) deleteTask(id);
  if (action === 'move-up' && id) moveTask(id, -1);
  if (action === 'move-down' && id) moveTask(id, 1);
  if (action === 'export') exportTasks();
  if (action === 'clear-all') clearAllTasks();
  if (action === 'theme') saveTheme(event.currentTarget.dataset.theme);
}

function openPanel(id = null) {
  state.editingId = id;
  state.panelOpen = true;
  render();
  document.querySelector('input[name="title"]')?.focus();
}

function closePanel() {
  state.panelOpen = false;
  state.editingId = null;
  render();
}

function handleTaskSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const now = new Date().toISOString();
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return;

  const existing = state.tasks.find((task) => task.id === state.editingId);
  if (existing) {
    existing.type = String(formData.get('type'));
    existing.title = title;
    existing.completed = String(formData.get('completed')) === 'true';
    existing.updatedAt = now;
  } else {
    state.tasks.unshift({
      id: crypto.randomUUID(),
      type: String(formData.get('type')),
      title,
      completed: String(formData.get('completed')) === 'true',
      createdAt: now,
      updatedAt: now,
    });
  }

  saveTasks();
  closePanel();
}

function toggleTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  task.completed = !task.completed;
  task.updatedAt = new Date().toISOString();
  saveTasks();
  render();
}

function deleteTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  if (!confirm(`「${task.title}」を削除しますか？`)) return;
  state.tasks = state.tasks.filter((item) => item.id !== id);
  saveTasks();
  render();
}

function moveTask(id, direction) {
  const index = state.tasks.findIndex((item) => item.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.tasks.length) return;
  const [task] = state.tasks.splice(index, 1);
  state.tasks.splice(nextIndex, 0, task);
  saveTasks();
  render();
}

function exportTasks() {
  const payload = JSON.stringify(state.tasks, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `taskick-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function handleImport(event) {
  const file = event.currentTarget.files?.[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported) || !imported.every(isTaskLike)) {
      alert('インポートできるJSON形式ではありません。');
      return;
    }
    state.tasks = imported;
    saveTasks();
    render();
  } catch {
    alert('JSONの読み込みに失敗しました。');
  }
}

function clearAllTasks() {
  if (!confirm('全データを削除しますか？')) return;
  state.tasks = [];
  saveTasks();
  render();
}

function getStorageBytes() {
  return new Blob([
    localStorage.getItem(STORAGE_KEY) ?? '',
    localStorage.getItem(THEME_KEY) ?? '',
  ]).size;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}
