import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { tokenStore } from '../api/token'

export function ProtectedRoute() {
  const location = useLocation()
  const token = tokenStore.get()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
