/**
 * Login Page Component.
 *
 * Features:
 *   - White-labelled: Fetches branding (logo, name, colors) from the public
 *     branding endpoint before rendering, so each deployment looks unique.
 *   - Glassmorphic design consistent with the rest of the app.
 *   - Responsive layout for desktop, tablet, and mobile.
 *   - Error handling with inline messages.
 *   - Loading states on submit button.
 *
 * @module Login
 */

import { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchBranding } from '../lib/api';
import './Login.css';

function Login() {
  const { login, authError, clearError, isLoading: authLoading } = useAuth();

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Branding state (fetched from server)
  const [branding, setBranding] = useState({
    business_name: localStorage.getItem('business_name') || 'Venuity',
    logo_url: '/logo.png',
    primary_color: '#6366f1',
    primary_hover_color: '#4f46e5',
    app_title: 'Venuity',
  });

  // Fetch branding on mount (public endpoint, no auth needed)
  useEffect(() => {
    fetchBranding()
      .then(({ status, body }) => {
        if (status === 200 && body) {
          setBranding((prev) => ({ ...prev, ...body }));

          // Apply branding colors to CSS custom properties
          if (body.primary_color) {
            document.documentElement.style.setProperty('--primary-color', body.primary_color);
          }
          if (body.primary_hover_color) {
            document.documentElement.style.setProperty('--primary-hover', body.primary_hover_color);
          }
          if (body.business_name) {
            document.title = body.business_name;
          }
        }
      })
      .catch(() => {
        // Server unreachable — use cached/default branding
      });
  }, []);

  // Clear error when user types
  useEffect(() => {
    if (authError) clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, password]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (submitting) return;

      setSubmitting(true);
      await login(username.trim(), password);
      setSubmitting(false);
    },
    [username, password, submitting, login],
  );

  return (
    <div className="login-page">
      {/* Decorative background elements */}
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <div className="login-card">
        {/* Logo & Title */}
        <div className="login-header">
          <div className="login-logo-wrapper">
            <img
              src={branding.logo_url}
              alt={`${branding.business_name} Logo`}
              className="login-logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <h1 className="login-title">{branding.business_name}</h1>
          <p className="login-subtitle">Sign in to your account</p>
        </div>

        {/* Error Message */}
        {authError && (
          <div className="login-error">
            <i className="bx bx-error-circle" />
            <span>{authError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="login-username">Username</label>
            <div className="login-input-wrapper">
              <i className="bx bx-user login-input-icon" />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-input-wrapper">
              <i className="bx bx-lock-alt login-input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <i
                className={`bx ${showPassword ? 'bx-hide' : 'bx-show'} login-toggle-password`}
                onClick={() => setShowPassword((p) => !p)}
                role="button"
                tabIndex={0}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={submitting || !username.trim() || !password}
          >
            {submitting ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <i className="bx bx-log-in" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <p className="login-footer-text">
          Contact your administrator to create an account.
        </p>
      </div>
    </div>
  );
}

export default memo(Login);
