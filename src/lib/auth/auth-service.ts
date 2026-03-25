import bcrypt from 'bcryptjs'
import { runRead, runWrite, persistDatabase } from '../db/sqlite-client'

export interface User {
  id: number
  role: 'admin' | 'employee'
  name: string
  email: string
  avatar_url: string | null
  active: number
  created_at: string
}

interface UserRow extends User {
  password_hash: string
}

/**
 * Login with email + password.
 * Validates credentials against SQLite, creates active_session.
 */
export async function login(email: string, password: string): Promise<User> {
  const rows = runRead<UserRow>(
    'SELECT * FROM users WHERE email = ? AND active = 1',
    [email]
  )

  if (rows.length === 0) {
    throw new Error('Credenciales invalidas')
  }

  const user = rows[0]

  if (!user.password_hash) {
    throw new Error('Este usuario no tiene contraseña configurada')
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    throw new Error('Credenciales invalidas')
  }

  // Write active session
  runWrite(
    `INSERT OR REPLACE INTO active_session (id, user_id, started_at) VALUES (1, ?, datetime('now'))`,
    [user.id]
  )
  await persistDatabase()

  const { password_hash: _, ...safeUser } = user
  return safeUser
}

/**
 * Get current session from SQLite.
 * Returns the logged-in user or null if no session.
 */
export function getCurrentSession(): User | null {
  const sessions = runRead<{ user_id: number }>(
    'SELECT user_id FROM active_session WHERE id = 1'
  )

  if (sessions.length === 0 || !sessions[0].user_id) {
    return null
  }

  const users = runRead<UserRow>(
    'SELECT * FROM users WHERE id = ? AND active = 1',
    [sessions[0].user_id]
  )

  if (users.length === 0) {
    return null
  }

  const { password_hash: _, ...safeUser } = users[0]
  return safeUser
}

/**
 * Logout: clear active session and persist.
 */
export async function logout(): Promise<void> {
  runWrite('DELETE FROM active_session WHERE id = 1')
  await persistDatabase()
}
