export const ACCESS_TOKEN = 'II_AGENT_ACCESS_TOKEN'
export const GUEST_MODE = 'II_AGENT_GUEST_MODE'

export const isGuestModeEnabled = () => {
	if (typeof window === 'undefined') return false
	return localStorage.getItem(GUEST_MODE) === 'true'
}

export const enableGuestMode = () => {
	if (typeof window === 'undefined') return
	localStorage.setItem(GUEST_MODE, 'true')
	localStorage.removeItem(ACCESS_TOKEN)
}

export const disableGuestMode = () => {
	if (typeof window === 'undefined') return
	localStorage.removeItem(GUEST_MODE)
}
