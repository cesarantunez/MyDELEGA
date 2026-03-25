import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { Home, ClipboardList, CheckSquare, User, LogOut } from 'lucide-react'
import { cn } from '../../lib/utils'
import NotificationBell from '../ui/NotificationBell'

const navItems = [
  { to: '/employee/dashboard', icon: Home, label: 'Inicio' },
  { to: '/employee/tasks', icon: ClipboardList, label: 'Tareas' },
  { to: '/employee/checklist', icon: CheckSquare, label: 'Checklist' },
  { to: '/employee/profile', icon: User, label: 'Perfil' },
]

export default function EmployeeLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'E'

  return (
    <div className="min-h-screen bg-oscuro flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-oscuro border-b border-blanco/10">
        <div className="flex items-center gap-3">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-rosa flex items-center justify-center">
              <span className="text-blanco text-xs font-bold">{initials}</span>
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold text-blanco leading-tight">
              My<span className="text-amarillo">DELEGA</span>
            </h1>
            <p className="text-blanco/40 text-[10px]">{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={handleLogout} className="text-blanco/40 hover:text-blanco transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-20 max-w-lg mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-oscuro border-t border-blanco/10 px-2 py-1 z-50">
        <div className="flex justify-around max-w-lg mx-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs transition-colors min-h-[44px] min-w-[44px]',
                  isActive ? 'text-amarillo' : 'text-blanco/40 hover:text-blanco/70'
                )
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
