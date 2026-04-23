import { useState, useEffect, useCallback, memo } from 'react';
import { NavLink } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

const NAV_ITEMS = [
  { path: '/', icon: 'bx-home', label: 'Home' },
  { path: '/dashboard', icon: 'bx-grid-alt', label: 'Dashboard' },
  { path: '/customers', icon: 'bx-user', label: 'Customers' },
  { path: '/recharge', icon: 'bx-wallet', label: 'Recharge' },
  { path: '/scan', icon: 'bx-qr-scan', label: 'Check-in' },
  { path: '/analytics', icon: 'bx-bar-chart-alt-2', label: 'Analytics' },
  { path: '/settings', icon: 'bx-cog', label: 'Settings' },
];

function Layout({ title, children }) {
  const { settings, theme, toggleTheme } = useSettings();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarState, setSidebarState] = useState(() => {
    if (window.innerWidth <= 768) return 'closed'; // mobile default
    return localStorage.getItem('desktop_sidebar_state') === 'closed' ? 'collapsed' : 'open';
  });

  // Track mobile breakpoint
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSidebarToggle = useCallback(() => {
    if (isMobile) {
      setSidebarState((prev) => (prev === 'mobile-open' ? 'closed' : 'mobile-open'));
    } else {
      setSidebarState((prev) => {
        const next = prev === 'collapsed' ? 'open' : 'collapsed';
        localStorage.setItem('desktop_sidebar_state', next === 'collapsed' ? 'closed' : 'open');
        return next;
      });
    }
  }, [isMobile]);

  const closeMobileSidebar = useCallback(() => {
    if (isMobile) setSidebarState('closed');
  }, [isMobile]);

  // Build sidebar className
  let sidebarClass = 'sidebar';
  if (!isMobile && sidebarState === 'collapsed') sidebarClass += ' collapsed';
  if (isMobile && sidebarState === 'mobile-open') sidebarClass += ' mobile-open';

  return (
    <div className="app-container">
      {/* Sidebar */}
      <nav className={sidebarClass}>
        <div className="logo-details" style={{ width: '100%' }}>
          <img src="/logo.png" alt="Logo" className="logo-img" />
          <span className="logo_name">{settings.business_name}</span>
          {isMobile && sidebarState === 'mobile-open' && (
            <i
              className="bx bx-x"
              style={{
                display: 'block',
                fontSize: '28px',
                cursor: 'pointer',
                marginLeft: 'auto',
                marginRight: '15px',
                color: 'var(--primary-color)',
              }}
              onClick={closeMobileSidebar}
            />
          )}
        </div>
        <ul className="nav-links">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={closeMobileSidebar}
              >
                <i className={`bx ${item.icon}`} />
                <span className="links_name">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isMobile && sidebarState === 'mobile-open' ? 'active' : ''}`}
        onClick={closeMobileSidebar}
      />

      {/* Main Content */}
      <section className="main-content">
        <nav className="topbar">
          <div className="sidebar-button">
            <i className="bx bx-menu" onClick={handleSidebarToggle} />
            <span className="dashboard-title">{title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <i
              className={`bx ${theme === 'dark' ? 'bx-sun' : 'bx-moon'}`}
              style={{ cursor: 'pointer', fontSize: '24px', color: 'var(--text-dark)' }}
              onClick={toggleTheme}
            />
          </div>
        </nav>
        <div className="content">{children}</div>
      </section>
    </div>
  );
}

export default memo(Layout);
