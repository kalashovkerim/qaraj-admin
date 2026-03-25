import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './layout/AdminLayout'
import { CategoriesPage } from './pages/CategoriesPage'
import { LoginPage } from './pages/LoginPage'
import { PostDetailsPage } from './pages/PostDetailsPage'
import { PostsPage } from './pages/PostsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/posts" element={<PostsPage />} />
          <Route path="/admin/posts/:id" element={<PostDetailsPage />} />
          <Route path="/admin/categories" element={<CategoriesPage />} />
          <Route path="*" element={<Navigate to="/admin/posts" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
