const STORAGE_KEY = 'taskick.tasks.v1';
const THEME_KEY = 'taskick.theme.v1';

/** @typedef {{id:string,type:string,title:string,completed:boolean,createdAt:string,updatedAt:string}} Task */

const typeLabels = {
  shopping: '買い物',
  todo: 'やる事',
};

const app = document.querySelector('#app');

if (!window.React || !window.ReactDOM) {
  app.innerHTML = `
    <section class="runtime-error">
      <p class="eyebrow">未確認</p>
      <h1>React を読み込めませんでした</h1>
      <p>この画面は React で描画します。ネットワーク制限などで CDN の React が読み込めない場合は表示できません。</p>
      <p>HTTP サーバーで開いているか、React CDN にアクセスできるかを確認してください。</p>
    </section>
  `;
} else {
  const { createElement: h, useEffect, useMemo, useState } = window.React;
  const root = window.ReactDOM.createRoot(app);
  root.render(h(App));

  function App() {
    const [tasks, setTasks] = useState(loadTasks);
    const [theme, setTheme] = useState(loadTheme);
    const [activeView, setActiveView] = useState('tasks');
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    const editingTask = useMemo(
      () => tasks.find((task) => task.id === editingId) ?? null,
      [editingId, tasks],
    );

    function openPanel(id = null) {
      setEditingId(id);
      setPanelOpen(true);
    }

    function closePanel() {
      setPanelOpen(false);
      setEditingId(null);
    }

    function saveTask(formTask) {
      const now = new Date().toISOString();
      setTasks((currentTasks) => {
        if (formTask.id) {
          return currentTasks.map((task) => task.id === formTask.id
            ? { ...task, ...formTask, updatedAt: now }
            : task);
        }

        return [{
          id: crypto.randomUUID(),
          type: formTask.type,
          title: formTask.title,
          completed: formTask.completed,
          createdAt: now,
          updatedAt: now,
        }, ...currentTasks];
      });
      closePanel();
    }

    function toggleTask(id) {
      setTasks((currentTasks) => currentTasks.map((task) => task.id === id
        ? { ...task, completed: !task.completed, updatedAt: new Date().toISOString() }
        : task));
    }

    function deleteTask(id) {
      const task = tasks.find((item) => item.id === id);
      if (!task) return;
      if (!confirm(`「${task.title}」を削除しますか？`)) return;
      setTasks((currentTasks) => currentTasks.filter((item) => item.id !== id));
    }

    function exportTasks() {
      const payload = JSON.stringify(tasks, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `taskick-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }

    async function importTasks(file) {
      if (!file) return;
      try {
        const imported = JSON.parse(await file.text());
        if (!Array.isArray(imported) || !imported.every(isTaskLike)) {
          alert('インポートできるJSON形式ではありません。');
          return;
        }
        setTasks(imported);
      } catch {
        alert('JSONの読み込みに失敗しました。');
      }
    }

    function clearAllTasks() {
      if (!confirm('全データを削除しますか？')) return;
      setTasks([]);
    }

    function clearCompletedTasks() {
      if (!confirm('完了タスクをすべて削除しますか？')) return;
      setTasks((currentTasks) => currentTasks.filter((task) => !task.completed));
    }

    return h('div', { className: 'shell' },
      h(AppHeader),
      h('main', { className: 'main' },
        activeView === 'tasks' && h(TaskView, { tasks, openPanel, toggleTask, deleteTask }),
        activeView === 'completed' && h(CompletedTaskView, { tasks, openPanel, toggleTask, deleteTask, clearCompletedTasks }),
        activeView === 'settings' && h(SettingsView, { tasks, theme, setTheme, exportTasks, importTasks, clearAllTasks }),
      ),
      h(BottomMenu, { activeView, setActiveView, closePanel }),
      panelOpen && h(TaskPanel, { task: editingTask, closePanel, saveTask }),
    );
  }

  function AppHeader() {
    return h('header', { className: 'app-header' },
      h('div', { className: 'title-mark', 'aria-hidden': 'true' }, 'T'),
      h('div', { className: 'title-copy' },
        h('p', { className: 'eyebrow' }, 'taskick'),
        h('h1', null, 'タスク管理'),
      ),
    );
  }

  function BottomMenu({ activeView, setActiveView, closePanel }) {
    function selectView(view) {
      setActiveView(view);
      closePanel();
    }

    return h('nav', { className: 'bottom-menu', 'aria-label': 'ページ下メニュー' },
      h('a', {
        className: `bottom-menu-button ${activeView === 'tasks' ? 'active' : ''}`,
        href: '#tasks',
        onClick: (event) => { event.preventDefault(); selectView('tasks'); },
      }, '未完了タスク'),
      h('a', {
        className: `bottom-menu-button ${activeView === 'completed' ? 'active' : ''}`,
        href: '#completed',
        onClick: (event) => { event.preventDefault(); selectView('completed'); },
      }, '完了タスク'),
      h('a', {
        className: `bottom-menu-button ${activeView === 'settings' ? 'active' : ''}`,
        href: '#settings',
        onClick: (event) => { event.preventDefault(); selectView('settings'); },
      }, '設定'),
    );
  }

  function TaskView({ tasks, openPanel, toggleTask, deleteTask }) {
    const incomplete = sortTasksByCreatedAtDesc(tasks.filter((task) => !task.completed));

    return h('section', { className: 'page-card' },
      h('div', { className: 'page-header' },
        h('div', null,
          h('p', { className: 'eyebrow' }, 'トップページ'),
          h('h2', null, `未完了タスク ${incomplete.length} 件`),
        ),
      ),
      h(TaskSection, { title: '未完了タスク', tasks: incomplete, openPanel, toggleTask, deleteTask }),
      h('div', { className: 'bottom-action' },
        h('button', { className: 'primary add-task-button', type: 'button', onClick: () => openPanel() }, 'タスク追加'),
      ),
    );
  }

  function CompletedTaskView({ tasks, openPanel, toggleTask, deleteTask, clearCompletedTasks }) {
    const completed = sortTasksByCreatedAtDesc(tasks.filter((task) => task.completed));

    return h('section', { className: 'page-card' },
      h('div', { className: 'page-header' },
        h('div', null,
          h('p', { className: 'eyebrow' }, '完了タスク'),
          h('h2', null, `完了タスク ${completed.length} 件`),
        ),
        h('button', {
          className: 'danger clear-completed-button',
          type: 'button',
          disabled: completed.length === 0,
          onClick: clearCompletedTasks,
        }, '完了データ全削除'),
      ),
      h(TaskSection, { title: '完了タスク', tasks: completed, openPanel, toggleTask, deleteTask }),
    );
  }

  function TaskSection({ title, tasks, openPanel, toggleTask, deleteTask }) {
    return h('section', { className: 'task-section' },
      h('div', { className: 'section-title' },
        h('h3', null, title),
        h('span', null, `${tasks.length} 件`),
      ),
      tasks.length === 0
        ? h('p', { className: 'empty' }, '表示するタスクはありません。')
        : h('ul', { className: 'task-list' }, tasks.map((task) => h(TaskItem, {
            key: task.id,
            task,
            openPanel,
            toggleTask,
            deleteTask,
          }))),
    );
  }

  function TaskItem({ task, openPanel, toggleTask, deleteTask }) {
    return h('li', { className: 'task-item' },
      h('div', { className: 'task-row task-meta-row' },
        h('label', { className: 'check-label' },
          h('input', {
            type: 'checkbox',
            checked: task.completed,
            onChange: () => toggleTask(task.id),
          }),
          h('span', { className: 'sr-only' }, '完了 / 未完了切替'),
        ),
        h('span', { className: 'type-badge' }, typeLabels[task.type] ?? task.type),
        h('div', { className: 'task-actions' },
          h('button', {
            className: 'icon-action edit-action',
            type: 'button',
            onClick: () => openPanel(task.id),
            'aria-label': `${task.title}を編集`,
            title: '編集',
          }, '✎'),
          h('button', {
            className: 'icon-action delete-action',
            type: 'button',
            onClick: () => deleteTask(task.id),
            'aria-label': `${task.title}を削除`,
            title: '削除',
          }, '×'),
        ),
      ),
      h('div', { className: 'task-row task-title-row' },
        h('span', { className: `task-title ${task.completed ? 'done' : ''}` }, task.title),
      ),
    );
  }

  function TaskPanel({ task, closePanel, saveTask }) {
    const [type, setType] = useState(task?.type ?? 'shopping');
    const [title, setTitle] = useState(task?.title ?? '');
    const [completed, setCompleted] = useState(task?.completed ?? false);
    const isEdit = Boolean(task);

    function submitTask(event) {
      event.preventDefault();
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;
      saveTask({
        id: task?.id ?? null,
        type,
        title: trimmedTitle,
        completed,
      });
    }

    return h('div', { className: 'panel-backdrop', onClick: closePanel },
      h('aside', {
        className: 'task-panel',
        'aria-modal': 'true',
        role: 'dialog',
        'aria-labelledby': 'panel-title',
        onClick: (event) => event.stopPropagation(),
      },
        h('div', { className: 'panel-header' },
          h('div', null,
            h('p', { className: 'eyebrow' }, isEdit ? '編集' : '追加'),
            h('h2', { id: 'panel-title' }, `タスク${isEdit ? '編集' : '追加'}パネル`),
          ),
          h('button', { className: 'icon-button', type: 'button', onClick: closePanel, 'aria-label': '閉じる' }, '×'),
        ),
        h('form', { className: 'task-form', onSubmit: submitTask },
          h('label', null,
            '種類',
            h('select', { value: type, required: true, onChange: (event) => setType(event.target.value) },
              h('option', { value: 'shopping' }, '買い物'),
              h('option', { value: 'todo' }, 'やる事'),
            ),
          ),
          h('label', null,
            'タスク名',
            h('input', {
              type: 'text',
              value: title,
              maxLength: 80,
              required: true,
              placeholder: '例：牛乳を買う',
              autoFocus: true,
              onChange: (event) => setTitle(event.target.value),
            }),
          ),
          h('label', null,
            'ステータス',
            h('select', { value: String(completed), required: true, onChange: (event) => setCompleted(event.target.value === 'true') },
              h('option', { value: 'false' }, '未完了'),
              h('option', { value: 'true' }, '完了'),
            ),
          ),
          h('div', { className: 'form-actions' },
            h('button', { type: 'button', className: 'ghost', onClick: closePanel }, 'キャンセル'),
            h('button', { type: 'submit', className: 'primary' }, '保存'),
          ),
        ),
      ),
    );
  }

  function SettingsView({ tasks, theme, setTheme, exportTasks, importTasks, clearAllTasks }) {
    return h('section', { className: 'page-card' },
      h('div', { className: 'page-header' },
        h('div', null,
          h('p', { className: 'eyebrow' }, '設定'),
          h('h2', null, 'データと表示'),
        ),
      ),
      h('div', { className: 'settings-grid' },
        h('section', { className: 'setting-card' },
          h('h3', null, 'データ操作'),
          h('div', { className: 'button-row' },
            h('button', { className: 'primary', type: 'button', onClick: exportTasks }, 'エクスポート(JSON)'),
            h('label', { className: 'file-button' },
              'インポート(JSON)',
              h('input', {
                type: 'file',
                accept: 'application/json',
                onChange: (event) => importTasks(event.target.files?.[0]),
              }),
            ),
            h('button', { className: 'danger', type: 'button', onClick: clearAllTasks }, '全データ削除'),
          ),
        ),
        h('section', { className: 'setting-card' },
          h('h3', null, 'テーマ切替'),
          h('div', { className: 'segmented', role: 'group', 'aria-label': 'テーマ切替' },
            h('button', {
              className: theme === 'light' ? 'active' : '',
              type: 'button',
              onClick: () => setTheme('light'),
            }, 'ライト'),
            h('button', {
              className: theme === 'dark' ? 'active' : '',
              type: 'button',
              onClick: () => setTheme('dark'),
            }, 'ダーク'),
          ),
        ),
        h('section', { className: 'setting-card' },
          h('h3', null, 'ストレージ使用状況'),
          h('p', { className: 'storage-size' }, formatBytes(getStorageBytes(tasks, theme))),
          h('p', { className: 'muted' }, `対象: ${STORAGE_KEY}, ${THEME_KEY}`),
        ),
      ),
    );
  }
}

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

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'light';
}

function sortTasksByCreatedAtDesc(tasks) {
  return [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function getStorageBytes(tasks, theme) {
  return new Blob([
    JSON.stringify(tasks),
    theme,
  ]).size;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
