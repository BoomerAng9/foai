import { Navigate } from 'react-router'
import { useAuth } from '@/contexts/auth-context'
import { ReactNode } from 'react'
import { isGuestModeEnabled } from '@/constants/auth'

interface ProtectedRouteProps {
    children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth()
    const isGuest = isGuestModeEnabled()

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        )
    }

    if (!isAuthenticated && !isGuest) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}