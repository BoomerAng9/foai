import { Link, Outlet } from 'react-router'

export function PublicLayout() {
    return (
        <div className="flex flex-col h-screen justify-between px-6 pt-8 pb-12 overflow-auto">
            <Link to="/" className="flex items-center gap-x-3">
                <img
                    src="/images/acheevy/acheevy-helmet.png"
                    className="size-10"
                    alt="ACHEEVY"
                />
                <span className="text-black dark:text-white text-2xl font-semibold">
                    ACHEEVY
                </span>
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
