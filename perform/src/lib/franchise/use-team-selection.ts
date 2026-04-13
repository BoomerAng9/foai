'use client';

/**
 * useTeamSelection — Persists team selection in localStorage and
 * optionally syncs to Neon for cross-device persistence (when authenticated).
 */

import { useState, useEffect, useCallback } from 'react';
import type { Sport } from './types';

const STORAGE_KEY = 'perform_selected_team';

interface StoredTeam {
  sport: Sport;
  abbr: string;
  updatedAt: number;
}

interface UseTeamSelectionReturn {
  sport: Sport;
  teamAbbr: string | undefined;
  setSport: (sport: Sport) => void;
  setTeam: (abbr: string) => void;
  clearSelection: () => void;
}

/**
 * Hook for persisting team selection across page loads and sessions.
 * Stores in localStorage immediately; syncs to Neon if user is authenticated.
 */
export function useTeamSelection(
  defaultSport: Sport = 'nfl',
  defaultTeam?: string
): UseTeamSelectionReturn {
  const [sport, setSportState] = useState<Sport>(defaultSport);
  const [teamAbbr, setTeamAbbrState] = useState<string | undefined>(defaultTeam);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredTeam = JSON.parse(stored);
        if (parsed.sport && parsed.abbr) {
          // Only use stored values if no explicit defaults were provided
          if (!defaultTeam) {
            setSportState(parsed.sport);
            setTeamAbbrState(parsed.abbr);
          }
        }
      }
    } catch {
      // localStorage unavailable or corrupted
    }
    setLoaded(true);
  }, [defaultTeam]);

  // Save to localStorage whenever selection changes
  const persistSelection = useCallback((s: Sport, abbr: string | undefined) => {
    if (!abbr) return;
    try {
      const data: StoredTeam = {
        sport: s,
        abbr,
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage unavailable
    }

    // Fire-and-forget sync to server for cross-device persistence
    syncToServer(s, abbr).catch(() => {
      // Silent fail — localStorage is the primary store
    });
  }, []);

  const setSport = useCallback((s: Sport) => {
    setSportState(s);
    // Clear team when sport changes (teams are sport-specific)
    setTeamAbbrState(undefined);
  }, []);

  const setTeam = useCallback((abbr: string) => {
    setTeamAbbrState(abbr);
    persistSelection(sport, abbr);
  }, [sport, persistSelection]);

  const clearSelection = useCallback(() => {
    setTeamAbbrState(undefined);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return {
    sport,
    teamAbbr: loaded ? teamAbbr : defaultTeam,
    setSport,
    setTeam,
    clearSelection,
  };
}

/**
 * Sync team selection to Neon via API (for authenticated users).
 * This is a best-effort operation — localStorage is the primary store.
 */
async function syncToServer(sport: Sport, abbr: string): Promise<void> {
  try {
    const res = await fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'selected_team',
        value: { sport, abbr },
      }),
    });
    // 401 is expected for unauthenticated users — not an error
    if (!res.ok && res.status !== 401) {
      console.warn('Team preference sync failed:', res.status);
    }
  } catch {
    // Network error — silent fail
  }
}
