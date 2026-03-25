import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { LayoutDashboard, Users, PlusCircle, ClipboardList, CheckSquare, BarChart3, LogOut } from 'lucide-react'
import { cn } from '../../lib/utils'
import NotificationBell from '../ui/NotificationBell'

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/admin/tasks', icon: ClipboardList, label: 'Tareas' },
  { to: '/admin/tasks/new', icon: PlusCircle, label: 'Nueva' },
  { to: '/admin/checklist', icon: CheckSquare, label: 'Checklist' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reportes' },
  { to: '/admin/employees', icon: Users, label: 'Equipo' },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-oscuro flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-oscuro border-b border-blanco/10">
        <h1 className="text-lg font-bold text-blanco">
          My<span className="text-amarillo">DELEGA</span>
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-blanco/50 text-xs hidden sm:block">{user?.name}</span>
          <NotificationBell />
          <button onClick={handleLogout} className="text-blanco/40 hover:text-blanco transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-20 max-w-3xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-oscuro border-t border-blanco/10 px-2 py-1 z-50">
        <div className="flex justify-around max-w-3xl mx-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-xl text-[10px] transition-colors min-h-[44px] min-w-[40px]',
                  isActive ? 'text-amarillo' : 'text-blanco/40 hover:text-blanco/70'
                )
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
