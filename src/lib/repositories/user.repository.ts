import bcrypt from 'bcryptjs'
import { runRead, runWrite, persistDatabase } from '../db/sqlite-client'

export interface UserRow {
  id: number
  role: 'admin' | 'employee'
  name: string
  email: string
  pin: string | null
  password_hash: string | null
  avatar_url: string | null
  active: number
  created_at: string
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role: 'admin' | 'employee'
  area?: string
  avatar_url?: string | null
}

export function getAllUsers(): UserRow[] {
  return runRead<UserRow>('SELECT * FROM users ORDER BY name')
}

export function getActiveUsers(): UserRow[] {
  return runRead<UserRow>('SELECT * FROM users WHERE active = 1 ORDER BY name')
}

export function getUsersByRole(role: 'admin' | 'employee'): UserRow[] {
  return runRead<UserRow>('SELECT * FROM users WHERE role = ? AND active = 1 ORDER BY name', [role])
}

export function getUserById(id: number): UserRow | null {
  const rows = runRead<UserRow>('SELECT * FROM users WHERE id = ?', [id])
  return rows[0] ?? null
}

export function getActiveEmployeeCount(): number {
  const rows = runRead<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE role = ? AND active = 1', ['employee'])
  return rows[0]?.count ?? 0
}

export async function createUser(input: CreateUserInput): Promise<number> {
  const hash = await bcrypt.hash(input.password, 10)
  runWrite(
    'INSERT INTO users (role, name, email, password_hash, avatar_url, active) VALUES (?, ?, ?, ?, ?, 1)',
    [input.role, input.name, input.email, hash, input.avatar_url ?? null]
  )
  await persistDatabase()
  const rows = runRead<{ id: number }>('SELECT last_insert_rowid() as id')
  return rows[0].id
}

export async function updateUser(id: number, data: Partial<Pick<UserRow, 'name' | 'email' | 'avatar_url' | 'role'>>): Promise<void> {
  const sets: string[] = []
  const params: (string | number | null)[] = []

  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name) }
  if (data.email !== undefined) { sets.push('email = ?'); params.push(data.email) }
  if (data.avatar_url !== undefined) { sets.push('avatar_url = ?'); params.push(data.avatar_url) }
  if (data.role !== undefined) { sets.push('role = ?'); params.push(data.role) }

  if (sets.length === 0) return

  params.push(id)
  runWrite(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params)
  await persistDatabase()
}

export async function toggleUserActive(id: number): Promise<void> {
  runWrite('UPDATE users SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?', [id])
  await persistDatabase()
}
