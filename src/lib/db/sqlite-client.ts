import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import { runMigrations } from './migrations'
import { runSeed } from './seed'

// ── Singleton ──────────────────────────────────────────────
let SQL: SqlJsStatic | null = null
let db: Database | null = null
let persistTimeout: ReturnType<typeof setTimeout> | null = null

const DB_FILENAME = 'mydelega.sqlite'

// ── OPFS helpers ───────────────────────────────────────────
function isOPFSAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    'getDirectory' in navigator.storage
  )
}

async function loadFromOPFS(): Promise<Uint8Array | null> {
  try {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(DB_FILENAME)
    const file = await handle.getFile()
    const buffer = await file.arrayBuffer()
    return new Uint8Array(buffer)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      return null
    }
    throw err
  }
}

async function saveToOPFS(data: Uint8Array): Promise<void> {
  const root = await navigator.storage.getDirectory()
  const handle = await root.getFileHandle(DB_FILENAME, { create: true })
  const writable = await handle.createWritable()
  await writable.write(data)
  await writable.close()
}

// ── Public API ─────────────────────────────────────────────

/**
 * Initialize database: load from OPFS if exists, otherwise create + migrate + seed.
 * Returns the ready-to-use Database instance.
 */
export async function initDatabase(): Promise<Database> {
  if (db) return db

  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file: string) => `/wasm/${file}`,
    })
  }

  // Try loading persisted database from OPFS
  if (isOPFSAvailable()) {
    const existing = await loadFromOPFS()
    if (existing) {
      db = new SQL.Database(existing)
      // Run migrations in case schema was updated
      runMigrations(db)
      await persistDatabase()
      setupAutoPersist()
      return db
    }
  }

  // Fresh database
  db = new SQL.Database()
  runMigrations(db)
  runSeed(db)
  await persistDatabase()
  setupAutoPersist()

  return db
}

/**
 * Get the current database instance. Throws if not initialized.
 */
export function getDatabase(): Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

/**
 * Export current DB state and write to OPFS.
 * Uses navigator.locks to prevent concurrent writes from multiple tabs.
 */
export async function persistDatabase(): Promise<void> {
  if (!db || !isOPFSAvailable()) return

  const data = new Uint8Array(db.export())

  if ('locks' in navigator) {
    await navigator.locks.request('mydelega-db-write', async () => {
      await saveToOPFS(data)
    })
  } else {
    await saveToOPFS(data)
  }
}

/**
 * Debounced persist: call after write operations to batch saves.
 */
export function debouncedPersist(delayMs = 500): void {
  if (persistTimeout) clearTimeout(persistTimeout)
  persistTimeout = setTimeout(() => {
    persistDatabase().catch(console.error)
  }, delayMs)
}

/**
 * Execute a write query and auto-persist.
 */
export function runWrite(sql: string, params?: (string | number | null | Uint8Array)[]): void {
  getDatabase().run(sql, params)
  debouncedPersist()
}

/**
 * Execute a read query and return rows as objects.
 */
export function runRead<T = Record<string, unknown>>(
  sql: string,
  params?: (string | number | null | Uint8Array)[]
): T[] {
  const stmt = getDatabase().prepare(sql)
  if (params) stmt.bind(params)

  const results: T[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return results
}

/**
 * Close database, flush pending changes.
 */
export async function closeDatabase(): Promise<void> {
  if (persistTimeout) clearTimeout(persistTimeout)
  await persistDatabase()
  db?.close()
  db = null
}

// ── Auto-persist on visibility change / beforeunload ───────
function setupAutoPersist(): void {
  // Mobile-reliable: persist when app goes to background
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      persistDatabase().catch(console.error)
    }
  })

  // Desktop fallback
  window.addEventListener('beforeunload', () => {
    if (db) {
      const data = new Uint8Array(db.export())
      // Use sync approach for beforeunload since async may not complete
      try {
        const blob = new Blob([data])
        // navigator.sendBeacon can't write to OPFS, so we rely on visibilitychange
        // This is a best-effort fallback; visibilitychange handles most cases
        void blob
      } catch {
        // Silently fail — visibilitychange should have already persisted
      }
    }
  })
}
