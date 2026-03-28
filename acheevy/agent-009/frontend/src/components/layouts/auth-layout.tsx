import { Link, Outlet } from 'react-router'
import { useAuth } from '@/contexts/auth-context'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ENABLE_BETA } from '@/constants/features'

export function AuthLayout() {
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/')
        }
    }, [isAuthenticated, navigate])

    return (
        <div className="flex flex-col h-screen justify-between px-3 md:px-6 pt-8 pb-12 overflow-auto acheevy-bg-gradient">
            <Link to="/" className="flex items-center gap-x-2 md:gap-x-3">
                <img
                    src="/images/acheevy/acheevy-helmet.png"
                    className="size-8 md:size-10"
                    alt="ACHEEVY"
                />
                <div className="relative">
                    <span className="text-lg md:text-2xl font-semibold acheevy-gradient-text">
                        ACHEEVY
                    </span>
                    {ENABLE_BETA && (
                        <span className="text-[10px] absolute -right-8 -top-1">
                            BETA
                        </span>
                    )}
                </div>
            </Link>
            <div className="flex-1">
                <Outlet />
            </div>
            <div className="flex justify-center gap-x-10">
                <Link
                    to="/terms-of-use"
                    className="dark:text-white text-sm font-semibold"
                >
                    Terms of Use
                </Link>
                <Link
                    to="/privacy-policy"
                    target="_blank"
                    className="dark:text-white text-sm font-semibold"
                >
                    Privacy Policy
                </Link>
            </div>
        </div>
    )
}
