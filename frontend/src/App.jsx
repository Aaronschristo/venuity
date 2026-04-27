/**
 * App — Root Application Component.
 *
 * Wraps the entire app in:
 *   1. AuthProvider — JWT authentication state
 *   2. SettingsProvider — Business settings + theme
 *   3. ToastProvider — Global notifications
 *   4. Router — Client-side routing
 *
 * Authentication guard:
 *   - If user is not authenticated → show Login page
 *   - If user is authenticated → show main app routes
 *   - During token validation → show loading spinner
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Recharge from './pages/Recharge';
import Scan from './pages/Scan';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

/**
 * AppContent — separated from App so it can use the useAuth hook.
 *
 * Renders either the Login page or the authenticated application
 * based on authentication state.
 */
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while validating stored tokens
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Not authenticated — show login page
  if (!isAuthenticated) {
    return <Login />;
  }

  // Authenticated — show full application
  return (
    <Router>
      <SettingsProvider>
        <ToastProvider>
          <Routes>
            {/* Home — full-screen, no sidebar */}
            <Route path="/" element={<HomeWrapper />} />

            {/* All other pages wrapped in Layout with sidebar + topbar */}
            <Route path="/dashboard" element={<Layout title="Dashboard"><Dashboard /></Layout>} />
            <Route path="/customers" element={<Layout title="Customers &amp; QR Codes"><Customers /></Layout>} />
            <Route path="/recharge" element={<Layout title="Recharge Balance"><Recharge /></Layout>} />
            <Route path="/scan" element={<Layout title="Scanner Check-in"><Scan /></Layout>} />
            <Route path="/analytics" element={<Layout title="Business Statistics"><Analytics /></Layout>} />
            <Route path="/settings" element={<Layout title="Settings"><Settings /></Layout>} />
          </Routes>
        </ToastProvider>
      </SettingsProvider>
    </Router>
  );
}

/**
 * LoadingScreen — shown during initial token validation.
 *
 * This prevents a flash of the login screen when the user
 * has valid stored tokens that are being verified.
 */
function LoadingScreen() {
  return (
    <div
      style={{
        backgroundColor: 'var(--secondary-color)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}
    >
      <i
        className="bx bx-loader-alt bx-spin"
        style={{ fontSize: '48px', color: 'var(--primary-color)' }}
      />
      <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
        Loading...
      </p>
    </div>
  );
}

/**
 * HomeWrapper — applies full-screen styles matching the home page design.
 */
function HomeWrapper() {
  return (
    <div
      style={{
        backgroundColor: 'var(--secondary-color)',
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '15px 20px',
        gap: '16px',
      }}
    >
      <Home />
    </div>
  );
}

export default App;
