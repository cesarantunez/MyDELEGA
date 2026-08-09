import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { PackagePlus, X, Filter, CheckCircle2, Trash2, CalendarClock, AlertTriangle } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import EmptyState from '../../components/ui/EmptyState'
import {
  getProducts,
  createProduct,
  resolveProduct,
  daysUntilExpiry,
  type ProductRow,
  type ProductFilters,
} from '../../lib/repositories/product.repository'
import { getAllAreas } from '../../lib/repositories/task.repository'
import { hapticSuccess, hapticLight } from '../../lib/haptic'

const productSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres'),
  area: z.string().min(1, 'Selecciona un area'),
  quantity: z.coerce.number().positive('Cantidad invalida'),
  unit: z.string().min(1, 'Requerido'),
  lot: z.string().optional(),
  expiry_date: z.string().min(1, 'Fecha requerida'),
})

type ProductForm = z.infer<typeof productSchema>

const UNIT_OPTIONS = [
  { value: 'unidades', label: 'Unidades' },
  { value: 'cajas', label: 'Cajas' },
  { value: 'kg', label: 'Kilos' },
  { value: 'lb', label: 'Libras' },
  { value: 'litros', label: 'Litros' },
  { value: 'paquetes', label: 'Paquetes' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activos' },
  { value: 'expired', label: 'Vencidos' },
  { value: 'consumed', label: 'Consumidos' },
  { value: 'discarded', label: 'Descartados' },
]

function expiryStyle(daysLeft: number): { badge: string; text: string; label: string } {
  if (daysLeft < 0) return { badge: 'bg-rojo text-blanco', text: 'text-rojo', label: `Vencido hace ${Math.abs(daysLeft)}d` }
  if (daysLeft === 0) return { badge: 'bg-rojo text-blanco', text: 'text-rojo', label: 'Vence HOY' }
  if (daysLeft <= 3) return { badge: 'bg-rojo/20 text-rojo', text: 'text-rojo', label: `${daysLeft}d restantes` }
  if (daysLeft <= 7) return { badge: 'bg-amarillo/20 text-amarillo', text: 'text-amarillo', label: `${daysLeft}d restantes` }
  return { badge: 'bg-azul/20 text-azul', text: 'text-azul', label: `${daysLeft}d restantes` }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<ProductFilters>({ status: 'active' })
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { unit: 'unidades', quantity: 1 },
  })

  const load = useCallback(() => {
    getProducts(filters).then(setProducts).catch(console.error)
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    getAllAreas().then(setAreas).catch(console.error)
  }, [])

  const onSubmit = async (data: ProductForm) => {
    setError(null)
    try {
      await createProduct({
        name: data.name,
        area: data.area,
        quantity: data.quantity,
        unit: data.unit,
        lot: data.lot,
        expiry_date: data.expiry_date,
      })
      hapticSuccess()
      setShowForm(false)
      reset()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar')
    }
  }

  const handleResolve = async (id: string, status: 'consumed' | 'discarded') => {
    hapticLight()
    await resolveProduct(id, status)
    load()
  }

  const areaOptions = areas.map((a) => ({ value: a, label: a }))
  const areaFilterOptions = [{ value: '', label: 'Todas las areas' }, ...areaOptions]

  const expiringSoonCount = products.filter((p) => p.status === 'active' && daysUntilExpiry(p.expiry_date) <= 7).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-blanco">Vencimientos</h2>
          <p className="text-blanco/50 text-sm">
            {products.length} producto(s)
            {filters.status === 'active' && expiringSoonCount > 0 && (
              <span className="text-rojo"> · {expiringSoonCount} por vencer</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'text-amarillo' : ''}
          >
            <Filter size={16} />
          </Button>
          <Button onClick={() => setShowForm(true)} size="sm">
            <PackagePlus size={16} />
            Registrar
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="grid grid-cols-2 gap-3"
        >
          <Select
            options={areaFilterOptions}
            value={filters.area ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value || undefined }))}
          />
          <Select
            options={STATUS_OPTIONS}
            value={filters.status ?? 'active'}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
          />
        </motion.div>
      )}

      {/* Empty state */}
      {products.length === 0 && (
        <EmptyState
          icon="tasks"
          title="Sin productos en control"
          subtitle="Registra productos con fecha de vencimiento y la app te avisa sola"
        />
      )}

      {/* Product list */}
      <div className="space-y-2">
        {products.map((p, i) => {
          const daysLeft = daysUntilExpiry(p.expiry_date)
          const style = expiryStyle(daysLeft)
          const isOpen = p.status === 'active' || p.status === 'expired'

          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className={`p-3 ${daysLeft <= 3 && isOpen ? 'border-rojo/40' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${daysLeft < 0 ? 'bg-rojo/20' : 'bg-blanco/5'}`}>
                    {daysLeft <= 0 && isOpen ? (
                      <AlertTriangle size={18} className="text-rojo" />
                    ) : (
                      <CalendarClock size={18} className={style.text} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blanco truncate">
                      {p.name}
                      {p.lot && <span className="text-blanco/40 font-normal"> · lote {p.lot}</span>}
                    </p>
                    <p className="text-xs text-blanco/40">
                      {p.quantity} {p.unit} · {p.area} · vence {p.expiry_date}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${style.badge}`}>
                    {isOpen ? style.label : p.status === 'consumed' ? 'Consumido' : 'Descartado'}
                  </span>
                </div>

                {isOpen && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-blanco/5">
                    <button
                      onClick={() => handleResolve(p.id, 'consumed')}
                      className="flex-1 text-[11px] text-azul hover:bg-azul/10 rounded-lg py-1.5 flex items-center justify-center gap-1 transition-colors"
                    >
                      <CheckCircle2 size={12} /> Consumido / vendido
                    </button>
                    <button
                      onClick={() => handleResolve(p.id, 'discarded')}
                      className="flex-1 text-[11px] text-rojo hover:bg-rojo/10 rounded-lg py-1.5 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Trash2 size={12} /> Descartado (merma)
                    </button>
                  </div>
                )}
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Create form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="bg-oscuro border border-blanco/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blanco">Registrar producto</h3>
                <button onClick={() => setShowForm(false)} className="text-blanco/40 hover:text-blanco">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <Input id="name" label="Producto" placeholder="Leche entera 1L" error={errors.name?.message} {...register('name')} />
                <Select id="area" label="Area responsable" options={areaOptions} placeholder="Seleccionar area" error={errors.area?.message} {...register('area')} />
                <div className="grid grid-cols-2 gap-3">
                  <Input id="quantity" label="Cantidad" type="number" step="any" error={errors.quantity?.message} {...register('quantity')} />
                  <Select id="unit" label="Unidad" options={UNIT_OPTIONS} error={errors.unit?.message} {...register('unit')} />
                </div>
                <Input id="lot" label="Lote (opcional)" placeholder="L-2408" {...register('lot')} />
                <Input id="expiry_date" label="Fecha de vencimiento" type="date" error={errors.expiry_date?.message} {...register('expiry_date')} />

                <p className="text-[10px] text-blanco/40">
                  La app avisa sola al area responsable y a los admins: 30, 7, 3 y 1 dia antes, y el dia del vencimiento.
                </p>

                {error && (
                  <div className="bg-rojo/20 border border-rojo/40 rounded-xl px-4 py-3">
                    <p className="text-rojo text-sm text-center">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : 'Registrar'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
