import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Home.css';

const CARDS = [
  { path: '/dashboard', cls: 'card-dashboard', icon: 'bx-grid-alt', label: 'Dashboard' },
  { path: '/customers', cls: 'card-customers', icon: 'bx-user', label: 'Customers' },
  { path: '/recharge', cls: 'card-recharge', icon: 'bx-wallet', label: 'Recharge' },
  { path: '/scan', cls: 'card-scan', icon: 'bx-qr-scan', label: 'Check-in' },
  { path: '/analytics', cls: 'card-analytics', icon: 'bx-bar-chart-alt-2', label: 'Analytics' },
  { path: '/settings', cls: 'card-settings', icon: 'bx-cog', label: 'Settings' },
];

function Home() {
  const { settings, theme, toggleTheme } = useSettings();
  const { user, logout } = useAuth();
  const showToast = useToast();

  const handleLogout = useCallback(async () => {
    await logout();
    showToast('Logged out successfully', 'success');
  }, [logout, showToast]);

  return (
    <>
      {/* Floating Dark Mode Toggle */}
      <div className="theme-toggle-fab" onClick={toggleTheme}>
        <i
          className={`bx ${theme === 'dark' ? 'bx-sun' : 'bx-moon'}`}
          style={{ fontSize: '24px', color: 'var(--text-dark)' }}
        />
      </div>

      {/* Floating Logout */}
      <div
        className="download-fab"
        onClick={handleLogout}
        title="Logout"
        style={{ display: 'flex' }}
      >
        <i className="bx bx-log-out" style={{ fontSize: '24px', color: 'var(--text-dark)' }} />
      </div>

      <h1 className="hero-title">
        <img src="/logo.png" alt="Logo" className="hero-logo-img" />
        <span>{settings.business_name}</span>
      </h1>

      {/* User greeting */}
      {user && (
        <p style={{
          color: 'var(--text-light)',
          fontSize: '14px',
          marginTop: '-8px',
          textAlign: 'center',
        }}>
          Welcome, <strong style={{ color: 'var(--text-dark)' }}>{user.username}</strong>
        </p>
      )}

      <div className="home-grid">
        {CARDS.map((card) => (
          <Link key={card.path} to={card.path} className={`home-card ${card.cls}`}>
            <div className="icon-container">
              <i className={`bx ${card.icon}`} />
            </div>
            <span>{card.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

export default memo(Home);
