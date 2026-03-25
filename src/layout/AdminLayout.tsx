import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { tokenStore } from '../api/token'

const navItems = [
  { to: '/admin/posts', label: 'Posts' },
  { to: '/admin/categories', label: 'Categories' },
]

export function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const logout = () => {
    tokenStore.clear()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold text-slate-900">QarajStudio Admin</h1>
          <div className="flex gap-3">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-3 py-2 text-sm ${
                    active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            <button
              onClick={logout}
              className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700"
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
