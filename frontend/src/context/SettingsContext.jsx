import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchSettings as fetchSettingsApi } from '../lib/api';

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  business_name: 'PlayArea Manager',
  currency_symbol: '₹',
  checkin_fee: '100.0',
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => ({
    business_name: localStorage.getItem('business_name') || DEFAULT_SETTINGS.business_name,
    currency_symbol: localStorage.getItem('currency_symbol') || DEFAULT_SETTINGS.currency_symbol,
    checkin_fee: localStorage.getItem('checkin_fee') || DEFAULT_SETTINGS.checkin_fee,
  }));

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
      .then(({ body }) => {
        const fresh = {
          business_name: body.business_name || DEFAULT_SETTINGS.business_name,
          currency_symbol: body.currency_symbol || DEFAULT_SETTINGS.currency_symbol,
          checkin_fee: body.checkin_fee || DEFAULT_SETTINGS.checkin_fee,
        };
        localStorage.setItem('business_name', fresh.business_name);
        localStorage.setItem('currency_symbol', fresh.currency_symbol);
        localStorage.setItem('checkin_fee', fresh.checkin_fee);
        setSettings(fresh);
        document.title = fresh.business_name;
      })
      .catch(() => {
        // Server unreachable — cached values already applied
      });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('business_name', newSettings.business_name);
    localStorage.setItem('currency_symbol', newSettings.currency_symbol);
    localStorage.setItem('checkin_fee', newSettings.checkin_fee);
    document.title = newSettings.business_name;
  }, []);

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
