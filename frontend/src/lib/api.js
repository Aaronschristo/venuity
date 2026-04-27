/**
 * API Service Layer for Venuity Frontend.
 *
 * This module provides:
 *   - A centralized fetch wrapper with JWT token management
 *   - Automatic token refresh on 401 responses
 *   - Consistent error extraction
 *   - All endpoint functions for the Django REST API
 *
 * Architecture:
 *   Frontend → api.js (this file) → Django REST API (/api/v1/)
 *
 * Token storage:
 *   Tokens are stored in localStorage for persistence across sessions.
 *   On mobile (future), use secure storage instead.
 *
 * @module api
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Base URL for the backend API. Set via environment variable. */
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/** API version prefix. */
const API_V1 = `${API_BASE}/api/v1`;

// ---------------------------------------------------------------------------
// Token Management
// ---------------------------------------------------------------------------

const TOKEN_KEYS = {
  access: 'venuity_access_token',
  refresh: 'venuity_refresh_token',
};

/**
 * Returns the stored access token, or null if not set.
 * @returns {string|null}
 */
export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEYS.access);
}

/**
 * Returns the stored refresh token, or null if not set.
 * @returns {string|null}
 */
export function getRefreshToken() {
  return localStorage.getItem(TOKEN_KEYS.refresh);
}

/**
 * Stores both tokens in localStorage.
 * @param {string} access - JWT access token
 * @param {string} refresh - JWT refresh token
 */
export function setTokens(access, refresh) {
  localStorage.setItem(TOKEN_KEYS.access, access);
  localStorage.setItem(TOKEN_KEYS.refresh, refresh);
}

/**
 * Clears all stored tokens. Used on logout or auth failure.
 */
export function clearTokens() {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
}

/**
 * Returns the base URL for the API (used for constructing media URLs).
 * @returns {string}
 */
export function getApiBase() {
  return API_BASE;
}

// ---------------------------------------------------------------------------
// Core Fetch Wrapper
// ---------------------------------------------------------------------------

/** Flag to prevent multiple simultaneous refresh attempts. */
let isRefreshing = false;

/** Queue of requests waiting for a token refresh to complete. */
let refreshQueue = [];

/**
 * Process the refresh queue — resolve or reject all waiting requests.
 * @param {string|null} newToken - The new access token, or null on failure.
 */
function processRefreshQueue(newToken) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (newToken) {
      resolve(newToken);
    } else {
      reject(new Error('Token refresh failed'));
    }
  });
  refreshQueue = [];
}

/**
 * Attempts to refresh the access token using the stored refresh token.
 * Returns the new access token, or null if refresh fails.
 *
 * @returns {Promise<string|null>}
 */
async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_V1}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    // Store new tokens (refresh may also be rotated)
    setTokens(data.access, data.refresh || refresh);
    return data.access;
  } catch {
    clearTokens();
    return null;
  }
}

/**
 * Generic fetch wrapper with JWT authentication and automatic token refresh.
 *
 * Flow:
 *   1. Attach the access token as Bearer header (if available)
 *   2. Make the request
 *   3. If 401 → attempt token refresh → retry once
 *   4. Parse JSON response
 *   5. Return { status, body }
 *
 * @param {string} url - API path (e.g., '/auth/token/')
 * @param {object} [options={}] - Fetch options (method, body, headers, etc.)
 * @param {boolean} [skipAuth=false] - If true, skip the Authorization header
 * @returns {Promise<{status: number, body: object|null}>}
 */
async function apiFetch(url, options = {}, skipAuth = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach auth token if available and not skipped
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let res = await fetch(`${API_V1}${url}`, { ...options, headers });

  // If 401 and we have a refresh token, try to refresh and retry
  if (res.status === 401 && !skipAuth && getRefreshToken()) {
    let newToken;

    if (isRefreshing) {
      // Another refresh is in progress — wait for it
      newToken = await new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      });
    } else {
      isRefreshing = true;
      newToken = await refreshAccessToken();
      isRefreshing = false;
      processRefreshQueue(newToken);
    }

    if (newToken) {
      // Retry the original request with the new token
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_V1}${url}`, { ...options, headers });
    }
  }

  // Parse body (handle 204 No Content)
  const body = res.status !== 204 ? await res.json().catch(() => null) : null;

  return { status: res.status, body };
}

// ---------------------------------------------------------------------------
// Authentication Endpoints
// ---------------------------------------------------------------------------

/**
 * Login with username and password.
 *
 * On success, stores tokens and returns user profile.
 *
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{status: number, body: {access, refresh, user}}>}
 */
export async function login(username, password) {
  const result = await apiFetch(
    '/auth/token/',
    {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    },
    true, // Skip auth header for login
  );

  if (result.status === 200 && result.body) {
    setTokens(result.body.access, result.body.refresh);
  }

  return result;
}

/**
 * Logout the current user.
 *
 * Blacklists the refresh token on the server, then clears local storage.
 *
 * @returns {Promise<void>}
 */
export async function logout() {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      await apiFetch('/auth/token/blacklist/', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      });
    } catch {
      // Server may be unreachable — clear tokens locally anyway
    }
  }
  clearTokens();
}

/**
 * Get the current authenticated user's profile.
 *
 * Used on app startup to validate stored tokens.
 *
 * @returns {Promise<{status: number, body: object}>}
 */
export function fetchCurrentUser() {
  return apiFetch('/auth/me/');
}

// ---------------------------------------------------------------------------
// Dashboard / Stats
// ---------------------------------------------------------------------------

/**
 * Fetch dashboard statistics and recent transactions.
 *
 * Response: { total_customers, total_revenue, recent_transactions: [...] }
 *
 * @returns {Promise<{status: number, body: object}>}
 */
export function fetchStats() {
  return apiFetch('/transactions/stats/');
}

/**
 * Fetch paginated transaction log.
 *
 * @param {number} [page=1] - Page number (1-indexed)
 * @param {number} [pageSize=10] - Results per page
 * @param {string} [type=''] - Filter by 'recharge' or 'checkin'
 * @returns {Promise<{status: number, body: {count, total_pages, results, next, previous}}>}
 */
export function fetchTransactions(page = 1, pageSize = 10, type = '') {
  let url = `/transactions/?page=${page}&page_size=${pageSize}`;
  if (type) url += `&type=${type}`;
  return apiFetch(url);
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

/**
 * Fetch paginated customer list with optional search.
 *
 * @param {number} [page=1] - Page number
 * @param {number} [pageSize=10] - Results per page
 * @param {string} [search=''] - Search query (filters by name)
 * @returns {Promise<{status: number, body: {count, total_pages, results, next, previous}}>}
 */
export function fetchCustomers(page = 1, pageSize = 10, search = '') {
  let url = `/customers/?page=${page}&page_size=${pageSize}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  return apiFetch(url);
}

/**
 * Search customers by name (convenience wrapper for fetchCustomers with search).
 *
 * @param {string} query - Search query
 * @param {number} [page=1] - Page number
 * @param {number} [pageSize=10] - Results per page
 * @returns {Promise<{status: number, body: object}>}
 */
export function searchCustomers(query, page = 1, pageSize = 10) {
  return fetchCustomers(page, pageSize, query);
}

/**
 * Create a new customer.
 *
 * @param {string} name - Customer's name
 * @param {number|string} initialBalance - Starting balance
 * @param {string|null} [qrId=null] - Optional pre-printed QR UUID
 * @returns {Promise<{status: number, body: object}>}
 */
export function createCustomer(name, initialBalance, qrId = null) {
  const payload = { name, initial_balance: initialBalance };
  if (qrId) payload.qr_id = qrId;
  return apiFetch('/customers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a customer by their public_id.
 *
 * @param {string} publicId - Customer's public UUID
 * @returns {Promise<{status: number, body: object|null}>}
 */
export function deleteCustomerApi(publicId) {
  return apiFetch(`/customers/${publicId}/`, { method: 'DELETE' });
}

/**
 * Retrieve a single customer by their public_id.
 *
 * @param {string} publicId - Customer's public UUID
 * @returns {Promise<{status: number, body: object}>}
 */
export function fetchCustomerDetail(publicId) {
  return apiFetch(`/customers/${publicId}/`);
}

// ---------------------------------------------------------------------------
// Recharge
// ---------------------------------------------------------------------------

/**
 * Recharge a customer's balance.
 *
 * @param {string} customerId - Customer's public_id (UUID)
 * @param {number|string} amount - Amount to add
 * @returns {Promise<{status: number, body: {success, customer}}>}
 */
export function rechargeCustomer(customerId, amount) {
  return apiFetch('/customers/recharge/', {
    method: 'POST',
    body: JSON.stringify({ customer_id: customerId, amount }),
  });
}

// ---------------------------------------------------------------------------
// Check-in
// ---------------------------------------------------------------------------

/**
 * Process a customer check-in.
 *
 * Accepts either qr_id (from scanner) or customer_id (from manual entry).
 *
 * @param {string} identifier - UUID from QR scan or manual entry
 * @param {boolean} [isQrId=true] - True if the identifier is a qr_id
 * @returns {Promise<{status: number, body: {success, customer, fee_charged}}>}
 */
export function checkinCustomer(identifier, isQrId = true) {
  const payload = isQrId ? { qr_id: identifier } : { customer_id: identifier };
  return apiFetch('/customers/checkin/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/**
 * Fetch all application settings (requires staff auth).
 *
 * @returns {Promise<{status: number, body: object}>}
 */
export function fetchSettings() {
  return apiFetch('/settings/');
}

/**
 * Update application settings (requires admin auth).
 *
 * @param {object} data - Key-value pairs to update
 * @returns {Promise<{status: number, body: object}>}
 */
export function saveSettings(data) {
  return apiFetch('/settings/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Fetch branding settings (public, no auth required).
 *
 * Used by the login page to display white-labelled branding.
 *
 * @returns {Promise<{status: number, body: object}>}
 */
export function fetchBranding() {
  return apiFetch('/settings/branding/', {}, true);
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

/**
 * Fetch analytics chart data.
 *
 * @param {string} interval - 'hourly', 'weekly', or 'monthly'
 * @param {string} metric - 'revenue' or 'checkins'
 * @param {string} date - Date string in YYYY-MM-DD format
 * @returns {Promise<{status: number, body: object}>}
 */
export function fetchAnalytics(interval, metric, date) {
  return apiFetch(`/analytics/?interval=${interval}&metric=${metric}&date=${date}`);
}

// ---------------------------------------------------------------------------
// Media / QR Code URLs
// ---------------------------------------------------------------------------

/**
 * Get the full URL for a customer's QR code image.
 *
 * @param {string} qrId - The customer's qr_id UUID
 * @returns {string} Full URL to the QR code PNG
 */
export function getQrCodeUrl(qrId) {
  return `${API_BASE}/media/qrcodes/${qrId}.png`;
}

// ---------------------------------------------------------------------------
// Error Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a human-readable error message from an API response body.
 *
 * Handles the consistent error envelope from the Django backend:
 *   { "error": "message", "code": "code", "detail": {...} }
 *
 * @param {object} body - Response body from apiFetch
 * @param {string} [fallback='An unexpected error occurred.'] - Fallback message
 * @returns {string} Human-readable error message
 */
export function extractError(body, fallback = 'An unexpected error occurred.') {
  if (!body) return fallback;
  if (typeof body.error === 'string') return body.error;
  if (typeof body.detail === 'string') return body.detail;
  if (typeof body.detail === 'object') {
    // Validation errors — join field-level messages
    const messages = Object.entries(body.detail)
      .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
      .join('; ');
    return messages || fallback;
  }
  return fallback;
}
