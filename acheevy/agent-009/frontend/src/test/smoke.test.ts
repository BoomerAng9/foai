import { describe, it, expect } from 'vitest'

describe('Smoke test', () => {
    it('module system is functional', () => {
        expect(1 + 1).toBe(2)
    })

    it('environment variables are typed', () => {
        // VITE_API_URL should be string | undefined at runtime
        const apiUrl = import.meta.env.VITE_API_URL
        expect(apiUrl === undefined || typeof apiUrl === 'string').toBe(true)
    })
})
