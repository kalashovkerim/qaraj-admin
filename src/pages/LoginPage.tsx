import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { tokenStore } from '../api/token'
import { authService } from '../services/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (token) => {
      tokenStore.set(token)
      navigate(location.state?.from ?? '/admin/posts', { replace: true })
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault()
          loginMutation.mutate({ email, password })
        }}
      >
        <h1 className="text-2xl font-semibold text-slate-900">Admin Login</h1>
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {loginMutation.isError && (
          <p className="text-sm text-rose-600">Login failed. Check credentials.</p>
        )}
        <button
          className="w-full rounded-md bg-slate-900 px-3 py-2 font-medium text-white disabled:opacity-50"
          disabled={loginMutation.isPending}
          type="submit"
        >
          {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
