import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { fetchStats, fetchTransactions } from '../lib/api';

function Dashboard() {
  const { settings, formatCurrency } = useSettings();
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [offset, setOffset] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  const loadStats = useCallback(async () => {
    setInitialLoading(true);
    try {
      const { body } = await fetchStats();
      setTotalCustomers(body.total_customers);
      setTotalRevenue(body.total_revenue);
      setTransactions(body.recent_transactions || []);
      setOffset(10);
      setHasMore(true);
    } catch (err) {
      console.error('Could not load stats', err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Infinite scroll for transactions
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { body: txs } = await fetchTransactions(offset, 10);
      if (txs.length === 0) {
        setHasMore(false);
      } else {
        setTransactions((prev) => [...prev, ...txs]);
        setOffset((prev) => prev + txs.length);
        if (txs.length < 10) setHasMore(false);
      }
    } catch (err) {
      console.error('Could not load more transactions', err);
    } finally {
      setLoadingMore(false);
    }
  }, [offset, loadingMore, hasMore]);

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

  const cs = settings.currency_symbol || '₹';

  return (
    <>
      {/* Stats Grid */}
      <div
        className="dashboard-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          marginBottom: '30px',
        }}
      >
        <div
          className="glass-card stat-card"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <h3 style={{ color: 'var(--text-light)', fontSize: '14px', textTransform: 'uppercase' }}>
              Total Customers
            </h3>
            <div className="text-gradient" style={{ fontSize: '36px', fontWeight: 700, marginTop: '5px' }}>
              {totalCustomers}
            </div>
          </div>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '15px', borderRadius: '12px', color: 'var(--primary-color)' }}>
            <i className="bx bx-user" style={{ fontSize: '32px' }} />
          </div>
        </div>

        <div
          className="glass-card stat-card"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <h3 style={{ color: 'var(--text-light)', fontSize: '14px', textTransform: 'uppercase' }}>
              Checkin Revenue
            </h3>
            <div className="text-gradient" style={{ fontSize: '36px', fontWeight: 700, marginTop: '5px' }}>
              {cs}{totalRevenue.toFixed(2)}
            </div>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '15px', borderRadius: '12px', color: 'var(--success)' }}>
            <i className="bx bx-wallet-alt" style={{ fontSize: '32px' }} />
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="glass-card">
        <div className="flex-header dashboard-header" style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Recent Transactions</h2>
          <div className="header-buttons">
            <button onClick={loadStats} className="btn btn-amount dashboard-refresh-btn">
              <i className="bx bx-refresh" />
              <span className="hide-on-mobile">Refresh</span>
            </button>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {initialLoading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                    Loading...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                    No recent transactions
                  </td>
                </tr>
              ) : (
                transactions.map((tx, i) => {
                  const isCheckin = tx.type === 'checkin';
                  const amountDisplay = isCheckin
                    ? `-${cs}${tx.amount.toFixed(2)}`
                    : `+${cs}${tx.amount.toFixed(2)}`;
                  const amountColor = isCheckin ? 'var(--text-dark)' : 'var(--success)';
                  const icon = isCheckin ? 'bx-up-arrow-alt' : 'bx-down-arrow-alt';
                  const iconColor = isCheckin ? 'var(--danger)' : 'var(--success)';

                  return (
                    <tr key={`${tx.created_at}-${i}`} className="table-row">
                      <td data-label="Customer Name">
                        <div className="user-info">
                          <strong>{tx.customer_name}</strong>
                        </div>
                      </td>
                      <td data-label="Type">
                        <span className={`badge ${tx.type}`}>{tx.type}</span>
                      </td>
                      <td data-label="Amount" style={{ fontWeight: 600, color: amountColor }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <i className={`bx ${icon}`} style={{ color: iconColor, fontSize: '18px' }} />
                          {amountDisplay}
                        </div>
                      </td>
                      <td data-label="Date" className="text-light">{tx.created_at}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <div
            ref={sentinelRef}
            style={{
              textAlign: 'center',
              padding: '15px',
              color: 'var(--text-light)',
              display: transactions.length > 0 ? 'block' : 'none',
              opacity: loadingMore ? 1 : 0,
            }}
          >
            {hasMore ? (
              <>
                <i className="bx bx-loader-alt bx-spin" style={{ fontSize: '20px', verticalAlign: 'middle' }} />
                {' '}Loading older transactions...
              </>
            ) : (
              <span style={{ fontSize: '13px', opacity: 0.7 }}>No more transactions</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(Dashboard);
