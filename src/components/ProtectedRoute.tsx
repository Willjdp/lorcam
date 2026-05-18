import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-[#4A5D23] border-t-transparent rounded-full animate-spin" aria-label="Verificando sesión" />
    </div>
  )

  if (!user) return <Navigate to="/admin/login" replace />

  return <>{children}</>
}
