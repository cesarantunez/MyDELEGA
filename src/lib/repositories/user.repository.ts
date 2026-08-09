import { supabase } from '../supabase'

// Perfiles del negocio (la autenticacion vive en Supabase Auth;
// aqui solo se lee/gestiona el directorio del equipo).

export interface UserRow {
  id: string
  role: 'admin' | 'supervisor' | 'employee'
  name: string
  email: string
  area_id: string | null
  avatar_url: string | null
  /** 1 activo / 0 inactivo (compatibilidad con la UI V1) */
  active: number
  created_at: string
}

interface ProfileRow {
  user_id: string
  role: 'admin' | 'supervisor' | 'employee'
  name: string
  email: string | null
  area_id: string | null
  avatar_url: string | null
  active: boolean
  created_at: string
}

function mapProfile(row: ProfileRow): UserRow {
  return {
    id: row.user_id,
    role: row.role,
    name: row.name,
    email: row.email ?? '',
    area_id: row.area_id,
    avatar_url: row.avatar_url,
    active: row.active ? 1 : 0,
    created_at: row.created_at,
  }
}

export async function getAllUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return (data as ProfileRow[]).map(mapProfile)
}

export async function getActiveUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return (data as ProfileRow[]).map(mapProfile)
}

export async function getActiveEmployeeCount(): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'employee')
    .eq('active', true)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function toggleUserActive(id: string): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('active')
    .eq('user_id', id)
    .single()
  if (!data) return
  const { error } = await supabase
    .from('profiles')
    .update({ active: !data.active })
    .eq('user_id', id)
  if (error) throw new Error(error.message)
}
