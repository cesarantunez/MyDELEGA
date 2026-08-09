import { supabase } from '../supabase'
import { useAuthStore } from '../../stores/auth.store'

// ══════════════════════════════════════════════════════════════
// Control de vencimientos (SPEC V2 §M3). El job diario
// /api/expiry-check genera las alertas; aquí vive el CRUD.
// ══════════════════════════════════════════════════════════════

export interface ProductRow {
  id: string
  area: string
  name: string
  lot: string | null
  quantity: number
  unit: string
  expiry_date: string
  status: 'active' | 'consumed' | 'discarded' | 'expired'
  last_alert_threshold: number | null
  created_by: string
  created_at: string
}

export interface CreateProductInput {
  area: string
  name: string
  lot?: string
  quantity: number
  unit: string
  expiry_date: string
}

export interface ProductFilters {
  area?: string
  status?: string
}

export function daysUntilExpiry(expiryDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(expiryDate + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

export async function getProducts(filters: ProductFilters = {}): Promise<ProductRow[]> {
  let query = supabase.from('products').select('*')
  if (filters.area) query = query.eq('area', filters.area)
  if (filters.status) query = query.eq('status', filters.status)
  const { data, error } = await query.order('expiry_date', { ascending: true })
  if (error) throw new Error(error.message)
  return data as ProductRow[]
}

/** Los próximos a vencer (activos, ≤7 días) para el widget del dashboard. */
export async function getExpiringSoon(limit = 5): Promise<ProductRow[]> {
  const horizon = new Date()
  horizon.setDate(horizon.getDate() + 7)
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('status', ['active', 'expired'])
    .lte('expiry_date', horizon.toISOString().split('T')[0])
    .order('expiry_date', { ascending: true })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data as ProductRow[]
}

export async function createProduct(input: CreateProductInput): Promise<string> {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Sin sesion activa')

  const { data, error } = await supabase
    .from('products')
    .insert({
      business_id: user.business_id,
      area: input.area,
      name: input.name,
      lot: input.lot || null,
      quantity: input.quantity,
      unit: input.unit,
      expiry_date: input.expiry_date,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}

/** Retirar producto del control: consumido o descartado. */
export async function resolveProduct(id: string, status: 'consumed' | 'discarded'): Promise<void> {
  const { error } = await supabase.from('products').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}
