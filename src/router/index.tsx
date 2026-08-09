import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import JoinPage from '../pages/auth/JoinPage'
import OnboardingPage from '../pages/auth/OnboardingPage'
import AdminLayout from '../components/admin/AdminLayout'
import AdminDashboard from '../pages/admin/AdminDashboard'
import EmployeesPage from '../pages/admin/EmployeesPage'
import CreateTaskPage from '../pages/admin/CreateTaskPage'
import TaskTrackingPage from '../pages/admin/TaskTrackingPage'
import WeeklyChecklistPage from '../pages/admin/WeeklyChecklistPage'
import ReportsPage from '../pages/admin/ReportsPage'
import ProductsPage from '../pages/admin/ProductsPage'
import TrainingPage from '../pages/admin/TrainingPage'
import LearnPage from '../pages/employee/LearnPage'
import EmployeeLayout from '../components/employee/EmployeeLayout'
import EmployeeDashboard from '../pages/employee/EmployeeDashboard'
import MyTasksPage from '../pages/employee/MyTasksPage'
import MyChecklistPage from '../pages/employee/MyChecklistPage'
import ProfilePage from '../pages/employee/ProfilePage'

/** Redirects to login if not authenticated; to onboarding if session without business */
function RequireAuth() {
  const { hasSession, user } = useAuthStore()
  if (!hasSession) return <Navigate to="/login" replace />
  if (!user) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

/** Redirects to dashboard if already authenticated */
function GuestOnly() {
  const { hasSession, user } = useAuthStore()
  if (hasSession && user) {
    const dest = user.role === 'employee' ? '/employee/checklist' : '/admin/dashboard'
    return <Navigate to={dest} replace />
  }
  if (hasSession && !user) {
    return <Navigate to="/onboarding" replace />
  }
  return <Outlet />
}

/** Onboarding: requires session; if profile already exists go to dashboard */
function OnboardingGuard() {
  const { hasSession, user } = useAuthStore()
  if (!hasSession) return <Navigate to="/login" replace />
  if (user) {
    const dest = user.role === 'employee' ? '/employee/checklist' : '/admin/dashboard'
    return <Navigate to={dest} replace />
  }
  return <Outlet />
}

/** Only allows admin/supervisor roles */
function RequireAdmin() {
  const { user } = useAuthStore()
  if (user?.role !== 'admin' && user?.role !== 'supervisor') return <Navigate to="/login" replace />
  return <Outlet />
}

/** Only allows employee role */
function RequireEmployee() {
  const { user } = useAuthStore()
  if (user?.role !== 'employee') return <Navigate to="/login" replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  // Public routes
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  // Join route: acepta invitacion y define contraseña (siempre accesible)
  { path: '/join', element: <JoinPage /> },
  // Onboarding: crear el negocio (sesion sin perfil)
  {
    element: <OnboardingGuard />,
    children: [{ path: '/onboarding', element: <OnboardingPage /> }],
  },

  // Admin routes (with layout)
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireAdmin />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: '/admin/dashboard', element: <AdminDashboard /> },
              { path: '/admin/employees', element: <EmployeesPage /> },
              { path: '/admin/tasks/new', element: <CreateTaskPage /> },
              { path: '/admin/tasks', element: <TaskTrackingPage /> },
              { path: '/admin/products', element: <ProductsPage /> },
              { path: '/admin/training', element: <TrainingPage /> },
              { path: '/admin/checklist', element: <WeeklyChecklistPage /> },
              { path: '/admin/reports', element: <ReportsPage /> },
            ],
          },
        ],
      },
    ],
  },

  // Employee routes (with layout)
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireEmployee />,
        children: [
          {
            element: <EmployeeLayout />,
            children: [
              { path: '/employee/dashboard', element: <EmployeeDashboard /> },
              { path: '/employee/tasks', element: <MyTasksPage /> },
              { path: '/employee/checklist', element: <MyChecklistPage /> },
              { path: '/employee/training', element: <LearnPage /> },
              { path: '/employee/profile', element: <ProfilePage /> },
            ],
          },
        ],
      },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/login" replace /> },
])
