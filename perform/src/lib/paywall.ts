const STORAGE_KEY = 'perform_access';

export function hasAccess(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'granted';
}

export function grantAccess(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, 'granted');
}

/** Owner bypass — call on mount if URL has ?access=owner */
export function checkOwnerBypass(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('access') === 'owner') {
    grantAccess();
    return true;
  }
  return false;
}
