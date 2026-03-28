"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface WhiteLabelConfig {
  systemName: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  faviconUrl: string;
}

const defaultConfig: WhiteLabelConfig = {
  systemName: 'GRAMMAR',
  tagline: 'Governed Action Runtime',
  primaryColor: '#00A3FF',
  accentColor: '#A855F7',
  logoUrl: '',
  faviconUrl: '',
};

const WhiteLabelContext = createContext<{
  config: WhiteLabelConfig;
  updateConfig: (newConfig: Partial<WhiteLabelConfig>) => Promise<void>;
  isLoading: boolean;
}>({
  config: defaultConfig,
  updateConfig: async () => {},
  isLoading: false,
});

const BRANDING_CACHE_KEY = 'grammar_white_label';
const BRANDING_FAIL_KEY = 'grammar_white_label_fetch_failed_at';
const BRANDING_RETRY_WINDOW_MS = 60_000;

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<WhiteLabelConfig>(defaultConfig);
  const isLoading = false;

  const applyStyles = (cfg: WhiteLabelConfig) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--accent', cfg.primaryColor);
      document.title = cfg.systemName + (cfg.tagline ? ` | ${cfg.tagline}` : '');
      if (cfg.faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = cfg.faviconUrl;
      }
    }
  };

  // Load from Backend API or localStorage cache
  useEffect(() => {
    async function loadConfig() {
      const cached = localStorage.getItem(BRANDING_CACHE_KEY);
      if (cached) {
        try {
          const parsed = { ...defaultConfig, ...JSON.parse(cached) } as WhiteLabelConfig;
          setConfig(parsed);
          applyStyles(parsed);
        } catch {}
      }

      const lastFailure = Number(sessionStorage.getItem(BRANDING_FAIL_KEY) || '0');
      if (lastFailure && Date.now() - lastFailure < BRANDING_RETRY_WINDOW_MS) {
        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 1500);

      try {
        const response = await fetch('/api/admin/branding', {
          cache: 'force-cache',
          signal: controller.signal,
        });

        if (!response.ok) {
          sessionStorage.setItem(BRANDING_FAIL_KEY, Date.now().toString());
          return;
        }

        const payload = await response.json();

        if (response.ok && payload?.data) {
          const dbConfig: WhiteLabelConfig = {
            systemName: payload.data.system_name,
            tagline: payload.data.tagline,
            primaryColor: payload.data.primary_color,
            accentColor: payload.data.accent_color,
            logoUrl: payload.data.logo_url || '',
            faviconUrl: payload.data.favicon_url || '',
          };

          setConfig(dbConfig);
          localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(dbConfig));
          applyStyles(dbConfig);
        }
      } catch {
        sessionStorage.setItem(BRANDING_FAIL_KEY, Date.now().toString());
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    loadConfig();
  }, []);

  const updateConfig = async (newConfig: Partial<WhiteLabelConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(updated));
    applyStyles(updated);
    
    // Persist through backend API (InsForge)
    try {
      const response = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to save branding config');
      }
    } catch (e) {
      console.error('Failed to save white-label config via backend', e);
    }
  };

  return (
    <WhiteLabelContext.Provider value={{ config, updateConfig, isLoading }}>
      {children}
    </WhiteLabelContext.Provider>
  );
}

export const useWhiteLabel = () => useContext(WhiteLabelContext);
