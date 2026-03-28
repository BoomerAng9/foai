/**
 * Re-export AuthProvider and useAuth from the canonical context module.
 * All existing consumers import from here — this keeps them working.
 */
export { AuthProvider, useAuth, type AuthContextType } from '@/context/auth-provider';
