/**
 * Settings Context for Venuity.
 *
 * Manages global application settings (business name, currency, check-in fee)
 * and branding (primary colors) across the entire application.
 *
 * Responsibilities:
 *   - Fetch settings from Django API on mount (requires auth)
 *   - Cache in localStorage for instant UI on next load
 *   - Apply branding colors as CSS custom properties
 *   - Manage dark/light theme
 *   - Provide formatCurrency helper
 *
 * @module SettingsContext
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchSettings as fetchSettingsApi } from '../lib/api';

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  business_name: 'PlayArea Manager',
  currency_symbol: '₹',
  checkin_fee: '100.00',
  primary_color: '#6366f1',
  primary_hover_color: '#4f46e5',
  logo_url: '/logo.png',
  app_title: 'Venuity',
};

/**
 * Load cached settings from localStorage with defaults.
 * @returns {object}
 */
function loadCachedSettings() {
  const result = {};
  for (const [key, defaultVal] of Object.entries(DEFAULT_SETTINGS)) {
    result[key] = localStorage.getItem(`venuity_${key}`) || defaultVal;
  }
  return result;
}

/**
 * Save settings to localStorage cache.
 * @param {object} settings
 */
function cacheSettings(settings) {
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined && value !== null) {
      localStorage.setItem(`venuity_${key}`, value);
    }
  }
}

/**
 * Apply branding colors to the document's CSS custom properties.
 * @param {object} settings
 */
function applyBranding(settings) {
  const root = document.documentElement;
  if (settings.primary_color) {
    root.style.setProperty('--primary-color', settings.primary_color);
  }
  if (settings.primary_hover_color) {
    root.style.setProperty('--primary-hover', settings.primary_hover_color);
  }
  if (settings.business_name) {
    document.title = settings.business_name;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadCachedSettings);

  const [theme, setTheme] = useState(() =>
    localStorage.getItem('theme') !== 'light' ? 'dark' : 'light'
  );

  // Apply theme to DOM
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  // Remove preload class after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      document.body.classList.remove('preload');
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Fetch fresh settings from API on mount
  useEffect(() => {
    fetchSettingsApi()
      .then(({ status, body }) => {
        if (status === 200 && body) {
          const fresh = { ...DEFAULT_SETTINGS };
          for (const key of Object.keys(DEFAULT_SETTINGS)) {
            if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
              fresh[key] = body[key];
            }
          }
          cacheSettings(fresh);
          setSettings(fresh);
          applyBranding(fresh);
        }
      })
      .catch(() => {
        // Server unreachable — cached values already applied
        applyBranding(settings);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((newSettings) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    cacheSettings(merged);
    applyBranding(merged);
  }, [settings]);

  const formatCurrency = useCallback(
    (val) => `${settings.currency_symbol}${parseFloat(val).toFixed(2)}`,
    [settings.currency_symbol]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        theme,
        toggleTheme,
        updateSettings,
        formatCurrency,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
