export function getApiBaseUrl(): string {
    const backendMode = (
        import.meta.env.VITE_ACHEEVY_BACKEND_MODE || 'test'
    ) as 'test' | 'production'

    if (backendMode === 'test') {
        return 'http://localhost:8002'
    }

    return import.meta.env.VITE_API_URL || 'http://localhost:8000'
}