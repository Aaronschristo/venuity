import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import {
  fetchCustomers,
  searchCustomers,
  createCustomer,
  deleteCustomerApi,
  getQrCodeUrl,
} from '../lib/api';
import { useNativeScanner } from '../lib/useNativeScanner';
import './Customers.css';

function Customers() {
  const { formatCurrency, settings } = useSettings();
  const showToast = useToast();

  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [offset, setOffset] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modals
  const [issueModal, setIssueModal] = useState(false);
  const [viewQrModal, setViewQrModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [qrData, setQrData] = useState({ name: '', id: '' });

  // Issue form
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('0');

  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const searchTimerRef = useRef(null);

  const loadCustomers = useCallback(
    async (query = '') => {
      setInitialLoading(true);
      try {
        const { body } = query
          ? await searchCustomers(query)
          : await fetchCustomers();
        setCustomers(body);
        setOffset(10);
        setHasMore(true);
      } catch {
        // handled
      } finally {
        setInitialLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Debounced search
  const handleSearch = useCallback(
    (val) => {
      setSearchQuery(val);
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        loadCustomers(val.trim());
      }, 300);
    },
    [loadCustomers]
  );

  // Infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { body } = searchQuery
        ? await searchCustomers(searchQuery, offset, 10)
        : await fetchCustomers(offset, 10);
      if (body.length === 0) {
        setHasMore(false);
      } else {
        setCustomers((prev) => [...prev, ...body]);
        setOffset((prev) => prev + body.length);
        if (body.length < 10) setHasMore(false);
      }
    } catch {
      // handled
    } finally {
      setLoadingMore(false);
    }
  }, [offset, loadingMore, hasMore, searchQuery]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    const sentinel = sentinelRef.current;
    if (!sentinel || initialLoading) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '150px' }
    );
    observerRef.current.observe(sentinel);
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loadMore, initialLoading]);

  // Issue QR
  const handleIssueQR = useCallback(
    async (e) => {
      e.preventDefault();
      const { status, body } = await createCustomer(newName, newBalance);
      if (status === 201) {
        showToast('Customer created successfully!');
        setNewName('');
        setNewBalance('0');
        setIssueModal(false);
        loadCustomers(searchQuery);
        setQrData({ name: newName, id: body.id });
        setViewQrModal(true);
      } else {
        showToast(body.error, 'error');
      }
    },
    [newName, newBalance, showToast, loadCustomers, searchQuery]
  );

  // View QR
  const showQR = useCallback((id, name) => {
    setQrData({ name, id });
    setViewQrModal(true);
  }, []);

  // Download QR
  const downloadQR = useCallback(() => {
    if (qrData.id) {
      const a = document.createElement('a');
      a.href = getQrCodeUrl(qrData.id);
      a.download = `QR_${qrData.name}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [qrData]);

  // Delete customer
  const handleDelete = useCallback(
    async (id, name) => {
      if (
        window.confirm(
          `Are you sure you want to permanently delete customer "${name}"?\nThis action cannot be undone and will permanently wipe their transaction history.`
        )
      ) {
        const { status, body } = await deleteCustomerApi(id);
        if (status === 200) {
          showToast(`Customer "${name}" deleted successfully.`, 'success');
          loadCustomers(searchQuery);
        } else {
          showToast(body.error, 'error');
        }
      }
    },
    [showToast, loadCustomers, searchQuery]
  );

  const cs = settings.currency_symbol || '₹';

  return (
    <>
      <div className="flex-header">
        <h2 style={{ margin: 0 }}>Manage Customers</h2>
        <div className="header-buttons">
          <button
            className="btn"
            style={{
              background: 'var(--white)',
              color: 'var(--primary-color)',
              border: '1px solid var(--primary-color)',
            }}
            onClick={() => setAssignModal(true)}
          >
            <i className="bx bx-qr-scan" /> Assign Existing QR
          </button>
          <button className="btn btn-primary" onClick={() => setIssueModal(true)}>
            <i className="bx bx-plus-circle" /> Issue New QR
          </button>
        </div>
      </div>

      <div className="glass-card">
        {/* Search */}
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <i
            className="bx bx-search"
            style={{
              position: 'absolute',
              left: '15px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '20px',
              color: 'var(--text-light)',
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search customers by name..."
            style={{ paddingLeft: '45px', borderRadius: '20px' }}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Balance</th>
                <th>Registered On</th>
              </tr>
            </thead>
            <tbody>
              {initialLoading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center' }}>Loading...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="table-row">
                    <td data-label="Name">
                      <div className="user-info">
                        <strong>{c.name}</strong>
                        <span className="user-id-truncate" title={c.id}>{c.id}</span>
                      </div>
                    </td>
                    <td data-label="Balance" style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                      {formatCurrency(c.balance)}
                    </td>
                    <td data-label="Registered" className="text-light">{c.created_at}</td>
                    <td data-label="Action">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-amount"
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                          onClick={() => showQR(c.id, c.name)}
                        >
                          <i className="bx bx-qr" /> View
                        </button>
                        <button
                          className="btn btn-danger-soft"
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                          onClick={() => handleDelete(c.id, c.name)}
                        >
                          <i className="bx bx-trash" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div
            ref={sentinelRef}
            style={{
              textAlign: 'center',
              padding: '15px',
              color: 'var(--text-light)',
              display: customers.length > 0 ? 'block' : 'none',
              opacity: loadingMore || !hasMore ? 1 : 0,
            }}
          >
            {hasMore ? (
              <>
                <i className="bx bx-loader-alt bx-spin" style={{ fontSize: '20px', verticalAlign: 'middle' }} />
                {' '}Loading older customers...
              </>
            ) : (
              <span style={{ fontSize: '13px', opacity: 0.7 }}>No more customers</span>
            )}
          </div>
        </div>
      </div>

      {/* Issue QR Modal */}
      <div className={`modal-backdrop ${issueModal ? 'open' : ''}`}>
        <div className="glass-card" style={{ width: '90%', maxWidth: '500px', margin: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>Issue QR Code</h2>
            <i className="bx bx-x" style={{ fontSize: '24px', cursor: 'pointer' }} onClick={() => setIssueModal(false)} />
          </div>
          <form onSubmit={handleIssueQR}>
            <div className="form-group">
              <label>Customer Name</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="Enter name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Initial Balance ({cs})</label>
              <input
                type="number"
                className="form-input"
                min="0"
                step="0.01"
                required
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Create &amp; Generate QR
            </button>
          </form>
        </div>
      </div>

      {/* View QR Modal */}
      <div className={`modal-backdrop ${viewQrModal ? 'open' : ''}`}>
        <div className="glass-card" style={{ width: '90%', maxWidth: '400px', margin: 'auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <i className="bx bx-x" style={{ fontSize: '24px', cursor: 'pointer' }} onClick={() => setViewQrModal(false)} />
          </div>
          <h2 style={{ marginBottom: '10px' }}>{qrData.name}</h2>
          <p style={{ color: 'var(--text-light)', marginBottom: '20px' }}>
            Customer ID:{' '}
            <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{qrData.id}</span>
          </p>
          <div style={{ background: 'white', padding: '10px', borderRadius: '12px', display: 'inline-block', boxShadow: 'var(--box-shadow)' }}>
            <img src={getQrCodeUrl(qrData.id)} alt="QR Code" style={{ width: '250px', height: '250px' }} />
          </div>
          <div style={{ marginTop: '25px' }}>
            <button className="btn btn-primary" onClick={downloadQR}>
              <i className="bx bx-download" /> Download QR
            </button>
          </div>
        </div>
      </div>

      {/* Assign Existing QR Modal */}
      {assignModal && (
        <AssignQRModal
          onClose={() => setAssignModal(false)}
          onSuccess={() => {
            setAssignModal(false);
            loadCustomers(searchQuery);
          }}
          currencySymbol={cs}
        />
      )}
    </>
  );
}

/** Assign Existing QR Modal — with scanner */
function AssignQRModal({ onClose, onSuccess, currencySymbol }) {
  const showToast = useToast();
  const [scannedId, setScannedId] = useState('');
  const [assignName, setAssignName] = useState('');
  const [assignBalance, setAssignBalance] = useState('0');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { status, body } = await createCustomer(assignName, assignBalance, scannedId);
    if (status === 201 || status === 200) {
      showToast('Existing QR assigned successfully!');
      onSuccess();
    } else {
      showToast(body.error, 'error');
    }
  };

  return (
    <div className="modal-backdrop open">
      <div className="glass-card" style={{ width: '95%', maxWidth: '900px', margin: 'auto', padding: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Assign Existing QR</h2>
          <i className="bx bx-x" style={{ fontSize: '24px', cursor: 'pointer' }} onClick={onClose} />
        </div>
        <div className="assign-grid">
          <div className="scanner-col">
            <ScannerWidget
              onScanSuccess={(text) => {
                setScannedId(text);
                showToast('QR Captured!', 'success');
              }}
              placeholderTitle="Camera Inactive"
              placeholderDesc="Start scanner to link QR code"
            />
          </div>
          <div className="form-col" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Scanned QR ID</label>
                <input type="text" className="form-input" required readOnly placeholder="Scan a QR code first..." value={scannedId} />
              </div>
              <div className="form-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Enter name"
                  value={assignName}
                  onChange={(e) => setAssignName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Initial Balance ({currencySymbol})</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  step="0.01"
                  required
                  value={assignBalance}
                  onChange={(e) => setAssignBalance(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '18px', padding: '15px' }}>
                Assign Customer to QR
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Reusable QR Scanner widget — uses native rust scanner */
function ScannerWidget({ onScanSuccess, placeholderTitle, placeholderDesc }) {
  const onScan = useCallback((text) => {
    onScanSuccess(text);
    // Automatically stop after successful scan
    setTimeout(stop, 1500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onScanSuccess]);

  const {
    start, stop, toggle,
    cameras, selectedCamera, setSelectedCamera,
    isActive, scannerState,
    videoRef, canvasRef,
  } = useNativeScanner(onScan);

  return (
    <>
      <div className="scanner-wrapper" style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '15px' }}>
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
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* ── Target Overlay ── */}
        {scannerState === 'active' && (
          <div className="scanner-target-overlay">
            <div className="scanner-target-box"></div>
          </div>
        )}
        
        {scannerState === 'placeholder' && (
          <div className="scanner-overlay active">
            <div className="overlay-content">
              <div className="icon-circle primary"><i className="bx bx-camera" /></div>
              <h3>{placeholderTitle}</h3>
              <p>{placeholderDesc}</p>
            </div>
          </div>
        )}
        {scannerState === 'loading' && (
          <div className="scanner-overlay" style={{ opacity: 1, pointerEvents: 'auto' }}>
            <div className="overlay-content">
              <i className="bx bx-loader-alt bx-spin loading-icon" />
              <h3>Initializing Camera...</h3>
            </div>
          </div>
        )}
        {scannerState === 'success' && (
          <div className="scanner-overlay success-overlay" style={{ opacity: 1, pointerEvents: 'auto' }}>
            <div className="overlay-content">
              <div className="icon-circle success pulse"><i className="bx bx-check" /></div>
              <h3>QR Captured!</h3>
            </div>
          </div>
        )}
      </div>
      <div className="scanner-controls" style={{ flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
        <select
          className="form-input"
          style={{ maxWidth: '300px', textAlign: 'center', marginBottom: '15px', cursor: 'pointer', background: 'var(--glass-bg)', color: 'var(--text-dark)', border: '1px solid var(--glass-border)' }}
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
    </>
  );
}

export { ScannerWidget };
export default memo(Customers);
