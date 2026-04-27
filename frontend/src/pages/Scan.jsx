import { useState, useCallback, memo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { checkinCustomer, extractError } from '../lib/api';
import { useNativeScanner } from '../lib/useNativeScanner';
import './Scan.css';

function Scan() {
  const { settings } = useSettings();
  const showToast = useToast();
  const cs = settings.currency_symbol || '₹';
  const fee = settings.checkin_fee || '100.00';

  // ─── Overlay display data ─────────────────────────────────────────────────
  const [overlayData, setOverlayData] = useState({ name: '', msg: '', errTitle: '', errMsg: '' });

  // ─── Native scanner hook ──────────────────────────────────────────────────
  // onScan fires when rqrr successfully decodes a QR code.
  // The hook has already set scannerState → 'success' at this point.
  const onScan = useCallback(async (qrText) => {
    try {
      const { status, body } = await checkinCustomer(qrText, true);
      if (status === 200 && body) {
        // Django response: { success: true, customer: { name, balance }, fee_charged }
        const customerName = body.customer?.name || body.customer_name || 'Customer';
        const balance = parseFloat(body.customer?.balance ?? body.remaining_balance ?? 0);
        const feeCharged = body.fee_charged || fee;

        setOverlayData({
          name: customerName,
          msg: `Balance: ${cs}${balance.toFixed(2)}`,
          errTitle: '',
          errMsg: '',
          feeCharged: feeCharged,
        });
        showToast(`Checked in ${customerName}`, 'success');
        // scannerState stays 'success'; hook resumes loop after 2 s automatically
      } else {
        const errMsg = extractError(body, 'Check-in failed');
        setOverlayData({ name: '', msg: '', errTitle: 'Check-in Failed', errMsg });
        setScannerState('error');
        showToast(errMsg, 'error');
      }
    } catch {
      setOverlayData({ name: '', msg: '', errTitle: 'Network Error', errMsg: 'Could not reach server.' });
      setScannerState('error');
      showToast('Network error during check-in', 'error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cs, fee, showToast]);

  const {
    start, stop, toggle,
    cameras, selectedCamera, setSelectedCamera,
    isActive, scannerState, setScannerState,
    videoRef, canvasRef,
  } = useNativeScanner(onScan);

  const handlePlaceholderClick = useCallback(() => {
    if (!isActive) {
      start().catch(() => showToast('Failed to start camera. Check permissions.', 'error'));
    }
  }, [isActive, start, showToast]);

  // After error, resume the scanner on click
  const handleErrorClick = useCallback(() => {
    setScannerState('active');
  }, [setScannerState]);

  return (
    <div className="glass-card scanner-card">
      <div className="scanner-header">
        <h2>
          <i className="bx bx-qr-scan text-gradient" /> Kiosk Scanner
        </h2>
        <p className="subtitle">Quick, frictionless entry for your customers.</p>
      </div>

      <div className="scanner-layout-grid">
        <div className="scanner-wrapper scan-page-wrapper">

          {/* ── Native video feed ── */}
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
              display: (scannerState === 'active' || scannerState === 'success' || scannerState === 'error')
                ? 'block' : 'none',
            }}
          />
          {/* Offscreen canvas — hook draws frames here for capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* ── Target Overlay ── */}
          {scannerState === 'active' && (
            <div className="scanner-target-overlay">
              <div className="scanner-target-box"></div>
            </div>
          )}

          {/* ── Placeholder overlay ── */}
          {scannerState === 'placeholder' && (
            <div
              className="scanner-overlay active scan-placeholder"
              onClick={handlePlaceholderClick}
              style={{ cursor: 'pointer' }}
            >
              <div className="overlay-content" style={{ pointerEvents: 'none' }}>
                <div className="icon-circle primary" style={{ pointerEvents: 'none' }}>
                  <i className="bx bx-camera" />
                </div>
                <h3 style={{ pointerEvents: 'none' }}>Camera Inactive</h3>
                <p style={{ pointerEvents: 'none' }}>Click to begin scanning QR codes.</p>
              </div>
            </div>
          )}

          {/* ── Loading overlay ── */}
          {scannerState === 'loading' && (
            <div className="scanner-overlay" style={{ opacity: 1, pointerEvents: 'auto' }}>
              <div className="overlay-content">
                <i className="bx bx-loader-alt bx-spin loading-icon" />
                <h3>Starting Camera...</h3>
              </div>
            </div>
          )}

          {/* ── Success overlay ── */}
          {scannerState === 'success' && (
            <div className="scanner-overlay success-overlay" style={{ opacity: 1, pointerEvents: 'auto' }}>
              <div className="overlay-content">
                <div className="icon-circle success pulse"><i className="bx bx-check" /></div>
                <h3>{overlayData.name}</h3>
                <p className="highlight-text">{overlayData.msg}</p>
                <div className="fee-deducted">-{cs}{parseFloat(overlayData.feeCharged || fee).toFixed(2)} Entry Fee</div>
              </div>
            </div>
          )}

          {/* ── Error overlay ── */}
          {scannerState === 'error' && (
            <div
              className="scanner-overlay error-overlay"
              style={{ opacity: 1, pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={handleErrorClick}
            >
              <div className="overlay-content">
                <div className="icon-circle error shake"><i className="bx bx-x" /></div>
                <h3>{overlayData.errTitle}</h3>
                <p>{overlayData.errMsg}</p>
                <small style={{ opacity: 0.7, marginTop: '8px' }}>Tap to resume scanning</small>
              </div>
            </div>
          )}
        </div>

        <div className="scanner-side-panel">
          <div className="scanner-controls">
            <select
              className="form-input"
              style={{
                maxWidth: '300px',
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
                <option value="">Click Start to detect cameras...</option>
              ) : (
                cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>{cam.label}</option>
                ))
              )}
            </select>
            <button
              className={`btn ${isActive ? 'stop-btn' : 'btn-primary start-btn'}`}
              onClick={isActive ? stop : () => start().catch(() => showToast('Failed to start camera. Check permissions.', 'error'))}
            >
              <i className={`bx ${isActive ? 'bx-stop-circle' : 'bx-play-circle'}`} />
              {isActive ? 'Stop Scanner' : 'Start Scanner'}
            </button>
          </div>
          <div className="fee-info">
            <div className="fee-badge">{cs}{parseFloat(fee).toFixed(2)}</div>
            <span>Standard Entry Fee</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Scan);
