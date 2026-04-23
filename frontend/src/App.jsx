import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Recharge from './pages/Recharge';
import Scan from './pages/Scan';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function App() {
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
 * Wrapper for the Home page that applies the full-screen body styles
 * matching the old index.html.
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
