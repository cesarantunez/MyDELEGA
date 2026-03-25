import type { Database } from 'sql.js'

const SCHEMA_VERSION = 4

const MIGRATIONS: string[] = [
  // Version 1: Schema inicial
  `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
    name TEXT NOT NULL,
    email TEXT,
    pin TEXT,
    avatar_url TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    default_priority TEXT NOT NULL DEFAULT 'medium' CHECK(default_priority IN ('low', 'medium', 'high', 'urgent')),
    default_checklist TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER REFERENCES task_templates(id),
    assigned_to INTEGER NOT NULL REFERENCES users(id),
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    area TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checklist_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    checklist_id INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    body TEXT,
    type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info', 'warning', 'success', 'task_assigned', 'task_completed')),
    read INTEGER NOT NULL DEFAULT 0,
    reference_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS active_session (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    user_id INTEGER REFERENCES users(id),
    started_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_tasks_area ON tasks(area);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
  CREATE INDEX IF NOT EXISTS idx_task_templates_area ON task_templates(area);
  CREATE INDEX IF NOT EXISTS idx_checklists_task_id ON checklists(task_id);
  CREATE INDEX IF NOT EXISTS idx_checklist_tasks_checklist_id ON checklist_tasks(checklist_id);
  `,

  // Version 2: Agregar password_hash y unique email
  `
  ALTER TABLE users ADD COLUMN password_hash TEXT;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `,

  // Version 3: Agregar evidence_base64 para evidencia fotografica en tareas
  `
  ALTER TABLE tasks ADD COLUMN evidence_base64 TEXT;
  `,

  // Version 4: Tabla para snapshots de reportes semanales
  `
  CREATE TABLE IF NOT EXISTS weekly_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    week_end TEXT NOT NULL,
    generated_by INTEGER NOT NULL REFERENCES users(id),
    data TEXT NOT NULL,
    generated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_weekly_reports_week ON weekly_reports(week_start, week_end);
  `
]

export function runMigrations(db: Database): void {
  db.run('CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL)')

  const result = db.exec('SELECT version FROM _schema_version LIMIT 1')
  const currentVersion = result.length > 0 ? (result[0].values[0][0] as number) : 0

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    const statements = MIGRATIONS[i]
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const statement of statements) {
      db.run(statement)
    }
  }

  if (currentVersion === 0) {
    db.run('INSERT INTO _schema_version (version) VALUES (?)', [SCHEMA_VERSION])
  } else if (currentVersion < SCHEMA_VERSION) {
    db.run('UPDATE _schema_version SET version = ?', [SCHEMA_VERSION])
  }
}
