const STORAGE_KEY = 'perform_access';

export function hasAccess(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'granted';
}

export function grantAccess(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, 'granted');
}

/**
 * Owner bypass — checks server-verified flag in localStorage.
 * Never grants access from URL params.
 */
export function checkOwnerBypass(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('perform_owner_verified') === 'true';
}

/**
 * Called after server-side profile fetch confirms owner status.
 */
export function setOwnerVerified(verified: boolean): void {
  if (typeof window === 'undefined') return;
  if (verified) {
    localStorage.setItem('perform_owner_verified', 'true');
    grantAccess();
  } else {
    localStorage.removeItem('perform_owner_verified');
  }
}
