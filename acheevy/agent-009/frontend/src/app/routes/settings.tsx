import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import AccountTab from '@/components/settings/account-tab'
import GeneralTab from '@/components/settings/general-tab'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import DataControlTab from '@/components/settings/data-control-tab'
import CreditUsage from '@/components/credit-usage'
import SubscriptionTab from '@/components/settings/subscription-tab'
import { authService } from '@/services/auth.service'
import { setUser } from '@/state/slice/user'
import { useAppDispatch } from '@/state'

enum SettingTab {
    GENERAL = 'general',
    ACCOUNT = 'account',
    NOTIFICATIONS = 'notifications',
    CONNECTORS = 'connectors',
    DATA_CONTROLS = 'data-controls',
    USAGE = 'usage',
    SUBSCRIPTION = 'subscription'
}

const Settings = () => {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { tab } = useParams<{ tab?: string }>()

    const [activeTab, setActiveTab] = useState<SettingTab>(SettingTab.GENERAL)

    const tabs = [
        { key: SettingTab.GENERAL, label: 'General' },
        { key: SettingTab.ACCOUNT, label: 'Account' },
        // { key: SettingTab.NOTIFICATIONS, label: 'Notifications' },
        // { key: SettingTab.CONNECTORS, label: 'Connectors' },
        { key: SettingTab.DATA_CONTROLS, label: 'Data Controls' },
        { key: SettingTab.USAGE, label: 'Usage' },
        { key: SettingTab.SUBSCRIPTION, label: 'Subscription' }
    ]

    const handleBack = () => {
        navigate(-1)
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case SettingTab.GENERAL:
                return <GeneralTab />
            case SettingTab.ACCOUNT:
                return <AccountTab />
            case SettingTab.DATA_CONTROLS:
                return <DataControlTab />
            case SettingTab.USAGE:
                return <CreditUsage />
            case SettingTab.SUBSCRIPTION:
                return <SubscriptionTab />
            default:
                return (
                    <div className="text-center py-8 text-muted-foreground">
                        Coming soon...
                    </div>
                )
        }
    }

    useEffect(() => {
        if (tab && Object.values(SettingTab).includes(tab as SettingTab)) {
            setActiveTab(tab as SettingTab)
        }
    }, [tab])

    useEffect(() => {
        ;(async () => {
            if (tab === SettingTab.SUBSCRIPTION) {
                const userRes = await authService.getCurrentUser()
                dispatch(setUser(userRes))
            }
        })()
    }, [tab])

    return (
        <div className="p-3 md:p-0 min-h-screen bg-background">
            <div className="hidden md:flex px-6 pt-8 pb-6">
                <div className="flex items-center gap-x-3">
                    <img
                        src="/images/acheevy/acheevy-helmet.png"
                        className="size-10"
                        alt="ACHEEVY"
                    />
                    <span className="type-h2 text-black dark:text-white">
                        ACHEEVY
                    </span>
                </div>
            </div>

            <div className="max-w-3xl mx-auto md:pb-8">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-x-3 md:gap-x-4">
                        <button className="cursor-pointer" onClick={handleBack}>
                            <Icon
                                name="arrow-left"
                                className="size-8 hidden dark:inline"
                            />
                            <Icon
                                name="arrow-left-dark"
                                className="size-8 inline dark:hidden"
                            />
                        </button>
                        <span className="type-h1 text-black dark:text-[var(--text-brand)]">
                            Settings
                        </span>
                    </div>
                </div>

                <div className="space-y-8 mt-5">
                    <div className="flex items-center gap-x-2 md:flex-wrap overflow-x-auto">
                        {tabs.map((tab) => (
                            <Button
                                key={tab.key}
                                className={clsx(
                                    'h-7 text-xs font-semibold px-4 rounded-full border border-[var(--border-brand)]',
                                    {
                                        'bg-[var(--bg-base)] border-[var(--bg-base)] dark:border-[var(--text-brand)] dark:bg-[var(--text-brand)] text-[var(--text-brand)] dark:text-[var(--bg-base)]':
                                            activeTab === tab.key,
                                        'dark:border-[var(--border-brand)] border-[var(--bg-base)] dark:text-[var(--text-brand)]':
                                            activeTab !== tab.key
                                    }
                                )}
                                onClick={() => {
                                    setActiveTab(tab.key)
                                    navigate(`/settings/${tab.key}`, {
                                        replace: true
                                    })
                                }}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>

                    <div className="mt-6 md:mt-8">{renderTabContent()}</div>
                </div>
            </div>
        </div>
    )
}

export { Settings as Component }
