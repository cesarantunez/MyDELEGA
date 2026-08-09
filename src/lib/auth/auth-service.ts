import { supabase } from '../supabase'

export interface Profile {
  /** user_id de auth.users — se expone como `id` para toda la app */
  id: string
  business_id: string
  role: 'admin' | 'supervisor' | 'employee'
  name: string
  email: string
  area_id: string | null
  avatar_url: string | null
  active: boolean
}

interface ProfileRow {
  user_id: string
  business_id: string
  role: 'admin' | 'supervisor' | 'employee'
  name: string
  email: string | null
  area_id: string | null
  avatar_url: string | null
  active: boolean
}

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Credenciales invalidas'
  if (/email not confirmed/i.test(message)) return 'Confirma tu correo antes de iniciar sesion'
  if (/rate limit/i.test(message)) return 'Demasiados intentos. Espera un momento'
  if (/already registered/i.test(message)) return 'Ese correo ya tiene una cuenta'
  return message
}

export async function login(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(translateAuthError(error.message))
}

export async function signUpOwner(email: string, password: string, name: string): Promise<{ needsEmailConfirm: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${window.location.origin}/onboarding`,
    },
  })
  if (error) throw new Error(translateAuthError(error.message))
  return { needsEmailConfirm: !data.session }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}

/** Lee el perfil del usuario con sesion activa. null = sin sesion o sin perfil (onboarding pendiente). */
export async function fetchProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRow>()

  if (error || !data || !data.active) return null

  return {
    id: data.user_id,
    business_id: data.business_id,
    role: data.role,
    name: data.name,
    email: data.email ?? user.email ?? '',
    area_id: data.area_id,
    avatar_url: data.avatar_url,
    active: data.active,
  }
}

export async function hasSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  return session !== null
}
