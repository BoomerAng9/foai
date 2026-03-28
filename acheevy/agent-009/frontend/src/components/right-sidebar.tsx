import { useTheme } from 'next-themes'

import { Icon } from './ui/icon'
import ButtonIcon from './button-icon'
import { WebSocketConnectionState } from '@/typings/agent'
import { useAppSelector } from '@/state/store'
import { selectUser } from '@/state/slice/user'
import UserProfileDropdown from './user-profile-dropdown'
import { ObservabilityDrawer } from '@/components/glass-box/index'

const RightSidebar = () => {
    const { theme, setTheme } = useTheme()

    const wsConnectionState = useAppSelector(
        (state) => state.agent.wsConnectionState
    )
    const user = useAppSelector(selectUser)

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
    }

    if (!user) return null

    return (
        <div className="hidden h-full flex-col items-center justify-between border-l border-[var(--border-default)] bg-[rgba(255,255,255,0.34)] px-5 py-6 md:flex">
            <div className="flex flex-col items-center gap-4">
                <UserProfileDropdown />

                <ButtonIcon
                    name={theme === 'dark' ? 'sun' : 'moon'}
                    iconClassName="!fill-none stroke-[var(--text-primary)]"
                    className="size-9 border border-[var(--border-default)] bg-white"
                    onClick={toggleTheme}
                />

                {/* Glass Box — Agent Observability Panel */}
                <ObservabilityDrawer />
            </div>
            {wsConnectionState === WebSocketConnectionState.CONNECTED && (
                <Icon name="connected" />
            )}
        </div>
    )
}

export default RightSidebar
