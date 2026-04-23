import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { getApiBase, fetchLatestInstaller } from '../lib/api';
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
  const showToast = useToast();

  // Detect if Windows browser (not Tauri) for download button
  const isWindows = navigator.userAgent.indexOf('Win') !== -1;
  const isTauri = !!window.__TAURI_INTERNALS__;
  const showDownload = isWindows && !isTauri;

  const handleDownload = useCallback(async () => {
    try {
      const { status, body } = await fetchLatestInstaller();
      if (status === 200 && body.url) {
        const link = document.createElement('a');
        link.href = `${getApiBase()}${body.url}`;
        link.download = body.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Downloading Venuity ${body.version}...`);
      }
    } catch {
      showToast('Installer not available yet', 'error');
    }
  }, [showToast]);

  return (
    <>
      {/* Floating Dark Mode Toggle */}
      <div className="theme-toggle-fab" onClick={toggleTheme}>
        <i
          className={`bx ${theme === 'dark' ? 'bx-sun' : 'bx-moon'}`}
          style={{ fontSize: '24px', color: 'var(--text-dark)' }}
        />
      </div>

      {/* Floating Download Windows App */}
      {showDownload && (
        <div
          className="download-fab"
          onClick={handleDownload}
          title="Download Venuity for Windows"
          style={{ display: 'flex' }}
        >
          <i className="bx bxl-windows" style={{ fontSize: '24px', color: 'var(--text-dark)' }} />
        </div>
      )}

      <h1 className="hero-title">
        <img src="/logo.png" alt="Logo" className="hero-logo-img" />
        <span>{settings.business_name}</span>
      </h1>

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
