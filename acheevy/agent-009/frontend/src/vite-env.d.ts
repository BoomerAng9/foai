/// <reference types="vite/client" />
/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_ACHEEVY_BACKEND_MODE?: 'test' | 'production'
    readonly VITE_GOOGLE_CLIENT_ID?: string
    readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
    readonly VITE_SENTRY_DSN?: string
    readonly VITE_ENABLE_EMAIL_AUTH?: string
    readonly VITE_DISABLE_CHAT_MODE?: string
    readonly VITE_POLICY_DEBUG_EVENTS?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
