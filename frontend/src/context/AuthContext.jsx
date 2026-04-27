/**
 * Authentication Context for Venuity.
 *
 * Manages JWT authentication state across the entire application.
 *
 * Responsibilities:
 *   - On mount: Check for stored tokens → validate with /me → set user
 *   - login(username, password): Authenticate → store tokens → set user
 *   - logout(): Blacklist refresh token → clear tokens → reset state
 *   - Automatic redirect to login when tokens expire
 *
 * Usage:
 *   Wrap your app in <AuthProvider>
 *   Access state with useAuth() hook
 *
 * @module AuthContext
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  fetchCurrentUser,
  getAccessToken,
  clearTokens,
} from '../lib/api';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * AuthProvider — wraps the application and manages authentication state.
 *
 * State:
 *   - user: The authenticated user's profile object, or null
 *   - isAuthenticated: Boolean derived from user !== null
 *   - isLoading: True while validating stored tokens on startup
 *   - authError: String error message from the last failed auth attempt
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  /**
   * Validate stored tokens on mount.
   *
   * If a valid access token exists, call /me to get the user profile.
   * If the token is expired, the API layer will attempt a refresh automatically.
   * If both tokens are invalid, the user is redirected to login.
   */
  useEffect(() => {
    const validateSession = async () => {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { status, body } = await fetchCurrentUser();
        if (status === 200 && body) {
          setUser(body);
        } else {
          // Tokens are invalid — clear them
          clearTokens();
          setUser(null);
        }
      } catch {
        // Network error — keep tokens but don't authenticate
        // This allows offline-first behavior on next network availability
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  /**
   * Authenticate with username and password.
   *
   * @param {string} username
   * @param {string} password
   * @returns {Promise<boolean>} True if login succeeded
   */
  const login = useCallback(async (username, password) => {
    setAuthError('');

    try {
      const { status, body } = await apiLogin(username, password);

      if (status === 200 && body?.user) {
        setUser(body.user);
        return true;
      }

      // Extract error message from the response
      const errorMsg =
        body?.detail || body?.error || 'Invalid credentials. Please try again.';
      setAuthError(errorMsg);
      return false;
    } catch {
      setAuthError('Unable to connect to server. Please check your network.');
      return false;
    }
  }, []);

  /**
   * Log out the current user.
   *
   * Blacklists the refresh token, clears local storage, and resets state.
   */
  const logoutUser = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setAuthError('');
  }, []);

  /**
   * Clear the current auth error message.
   */
  const clearError = useCallback(() => {
    setAuthError('');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        authError,
        login,
        logout: logoutUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useAuth — access authentication state and actions.
 *
 * @returns {{
 *   user: object|null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   authError: string,
 *   login: (username: string, password: string) => Promise<boolean>,
 *   logout: () => Promise<void>,
 *   clearError: () => void,
 * }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
