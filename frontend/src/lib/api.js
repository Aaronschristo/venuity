/**
 * API service layer for the Venuity frontend.
 * All fetch calls use the remote Flask server.
 */

const API_BASE = 'https://aaronschristo.pythonanywhere.com';

/**
 * Returns the base URL for the API.
 */
export const getApiBase = () => API_BASE;

/**
 * Generic fetch wrapper with JSON parsing and error handling.
 * Returns { status, body } for the caller to decide on success/error.
 */
async function apiFetch(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const body = await res.json();
  return { status: res.status, body };
}

// ─── Stats / Dashboard ───────────────────────────────────────────
export const fetchStats = () => apiFetch('/api/stats');

export const fetchTransactions = (offset = 0, limit = 10) =>
  apiFetch(`/api/transactions?offset=${offset}&limit=${limit}`);

// ─── Customers ───────────────────────────────────────────────────
export const fetchCustomers = (offset = 0, limit = 10) =>
  apiFetch(`/api/customers?offset=${offset}&limit=${limit}`);

export const searchCustomers = (query, offset = 0, limit = 10) =>
  apiFetch(`/api/customers/search?q=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}`);

export const createCustomer = (name, initialBalance, qrId = null) => {
  const payload = { name, initial_balance: initialBalance };
  if (qrId) payload.qr_id = qrId;
  return apiFetch('/api/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const deleteCustomerApi = (id) =>
  apiFetch(`/api/customers/${id}`, { method: 'DELETE' });

// ─── Recharge ────────────────────────────────────────────────────
export const rechargeCustomer = (customerId, amount) =>
  apiFetch('/api/recharge', {
    method: 'POST',
    body: JSON.stringify({ customer_id: customerId, amount }),
  });

// ─── Check-in ────────────────────────────────────────────────────
export const checkinCustomer = (customerId) =>
  apiFetch('/api/checkin', {
    method: 'POST',
    body: JSON.stringify({ customer_id: customerId }),
  });

// ─── Settings ────────────────────────────────────────────────────
export const fetchSettings = () => apiFetch('/api/settings_get');

export const saveSettings = (data) =>
  apiFetch('/api/settings', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ─── Analytics ───────────────────────────────────────────────────
export const fetchAnalytics = (interval, metric, date) =>
  apiFetch(`/api/analytics?interval=${interval}&metric=${metric}&date=${date}`);

// ─── QR Code URL ─────────────────────────────────────────────────
export const getQrCodeUrl = (id) => `${API_BASE}/qrcode/${id}.png`;

// ─── Download / Installer ────────────────────────────────────────
export const fetchLatestInstaller = () => apiFetch('/api/latest_installer');
