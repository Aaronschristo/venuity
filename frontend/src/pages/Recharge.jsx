import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { searchCustomers, rechargeCustomer } from '../lib/api';
import { useNativeScanner } from '../lib/useNativeScanner';
import './Recharge.css';

function Recharge() {
  const { settings, formatCurrency } = useSettings();
  const showToast = useToast();
  const cs = settings.currency_symbol || '₹';

  // ─── Form state ───────────────────────────────────────────────────────────
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [autocompleteItems, setAutocompleteItems] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const debounceRef = useRef(null);

  // ─── Native scanner hook ──────────────────────────────────────────────────
  const onScan = useCallback((text) => {
    setCustomerId(text);
    showToast('QR Scanned successfully!', 'success');
    // Auto-stop after a brief success display (hook shows 'success' for 2s then resumes)
    // We stop fully so the user can proceed to fill the form
    setTimeout(stop, 1800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  const {
    start, stop, toggle,
    cameras, selectedCamera, setSelectedCamera,
    isActive, scannerState,
    videoRef, canvasRef,
  } = useNativeScanner(onScan);

  // ─── Autocomplete ─────────────────────────────────────────────────────────
  const handleNameChange = useCallback((val) => {
    setCustomerName(val);
    setCustomerId('');
    clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setShowAutocomplete(false);
      setAutocompleteItems([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { body } = await searchCustomers(val);
        setAutocompleteItems(body);
        setShowAutocomplete(body.length > 0);
      } catch {
        setShowAutocomplete(false);
      }
    }, 300);
  }, []);

  const selectCustomer = useCallback((m) => {
    setCustomerName(m.name);
    setCustomerId(m.id);
    setShowAutocomplete(false);
  }, []);

  // ─── Recharge submit ──────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const { status, body } = await rechargeCustomer(customerId, amount);
      if (status === 200) {
        showToast(`Recharge successful! New balance: ${formatCurrency(body.new_balance)}`);
        setCustomerName('');
        setCustomerId('');
        setAmount('');
      } else {
        showToast(body.error, 'error');
      }
    },
    [customerId, amount, showToast, formatCurrency]
  );

  // Close autocomplete on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.autocomplete-wrapper')) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto', padding: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        <i className="bx bx-wallet" style={{ fontSize: '48px', color: 'var(--success)' }} />
      </div>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Top Up Balance</h2>

      <div className="recharge-grid">

        {/* ── Scanner Column ── */}
        <div className="scanner-col">
          <div
            className="scanner-wrapper"
            style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '15px' }}
          >
            {/* Native video feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '8px',
                display: scannerState === 'active' || scannerState === 'success' ? 'block' : 'none',
              }}
            />
            {/* Offscreen canvas for frame capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* ── Target Overlay ── */}
            {scannerState === 'active' && (
              <div className="scanner-target-overlay">
                <div className="scanner-target-box"></div>
              </div>
            )}

            {/* ── Placeholder overlay ── */}
            {scannerState === 'placeholder' && (
              <div className="scanner-overlay active">
                <div className="overlay-content">
                  <div className="icon-circle primary"><i className="bx bx-camera" /></div>
                  <h3>Camera Inactive</h3>
                  <p>Start scanner to auto-fill Customer ID</p>
                </div>
              </div>
            )}

            {/* ── Loading overlay ── */}
            {scannerState === 'loading' && (
              <div className="scanner-overlay" style={{ opacity: 1, pointerEvents: 'auto' }}>
                <div className="overlay-content">
                  <i className="bx bx-loader-alt bx-spin loading-icon" />
                  <h3>Initializing Camera...</h3>
                </div>
              </div>
            )}

            {/* ── Success overlay ── */}
            {scannerState === 'success' && (
              <div className="scanner-overlay success-overlay" style={{ opacity: 1, pointerEvents: 'auto' }}>
                <div className="overlay-content">
                  <div className="icon-circle success pulse"><i className="bx bx-check" /></div>
                  <h3>Scan Successful!</h3>
                </div>
              </div>
            )}
          </div>

          <div
            className="scanner-controls"
            style={{ flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '25px' }}
          >
            <select
              className="form-input"
              style={{
                maxWidth: '300px',
                marginBottom: '15px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--glass-bg)',
                color: 'var(--text-dark)',
                border: '1px solid var(--glass-border)',
              }}
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              disabled={isActive}
            >
              {cameras.length === 0 ? (
                <option value="">Detecting cameras...</option>
              ) : (
                cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>{cam.label}</option>
                ))
              )}
            </select>
            <button
              type="button"
              className={`btn ${isActive ? 'stop-btn' : 'btn-primary start-btn'}`}
              onClick={toggle}
            >
              <i className={`bx ${isActive ? 'bx-stop-circle' : 'bx-play-circle'}`} />
              {isActive ? 'Stop Scanner' : 'Start Scanner'}
            </button>
          </div>
        </div>

        {/* ── Form Column ── */}
        <div className="form-col" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group autocomplete-wrapper" style={{ position: 'relative' }}>
              <label>Customer Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Type name to search..."
                autoComplete="off"
                value={customerName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
              {showAutocomplete && (
                <div
                  style={{
                    position: 'absolute',
                    width: '100%',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'var(--white)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    zIndex: 1000,
                    boxShadow: 'var(--box-shadow)',
                  }}
                >
                  {autocompleteItems.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '10px 15px',
                        cursor: 'pointer',
                        borderBottom: '1px dashed var(--glass-border)',
                        color: 'var(--text-dark)',
                      }}
                      onClick={() => selectCustomer(m)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--secondary-color)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <strong>{m.name}</strong>
                      <small style={{ color: 'var(--text-light)', float: 'right' }}>
                        {m.id.substring(0, 8)}...
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Customer ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter or Scan Customer ID"
                required
                readOnly
                value={customerId}
              />
              <small style={{ color: 'var(--text-light)', marginTop: '5px', display: 'block' }}>
                You can also scan the customer&apos;s QR code to auto-fill this.
              </small>
            </div>

            <div className="form-group">
              <label>Amount ({cs})</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600 }}>
                  {cs}
                </span>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  step="0.01"
                  required
                  placeholder="0.00"
                  style={{ paddingLeft: '30px' }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '25px' }}>
              <button type="button" className="btn btn-amount" onClick={() => setAmount('100')}>{cs}100</button>
              <button type="button" className="btn btn-amount" onClick={() => setAmount('500')}>{cs}500</button>
              <button type="button" className="btn btn-amount" onClick={() => setAmount('1000')}>{cs}1000</button>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '18px', padding: '15px' }}>
              Confirm Recharge
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default memo(Recharge);
