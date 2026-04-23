# Venuity Backend — Developer Guide

> **Audience:** Frontend developers migrating from the old Flask backend to the new Django REST API.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Structure](#2-project-structure)
3. [API Reference](#3-api-reference)
4. [Authentication Flow](#4-authentication-flow)
5. [Frontend Integration Guide](#5-frontend-integration-guide)
6. [Migrating from the Flask Backend](#6-migrating-from-the-flask-backend)
7. [Database Design Decisions](#7-database-design-decisions)
8. [Extending the Backend](#8-extending-the-backend)
9. [Running Locally](#9-running-locally)

---

## 1. Architecture Overview

The backend is a **Django REST Framework** API structured around the **service layer pattern** (thin views, fat services). Every business operation — recharge, check-in, settings update — has exactly one home in a `services.py` file.

```
HTTP Request
    -> View         (parse input, call service, return response)
    -> Service      (business logic, DB writes, atomic operations)
    -> Model        (schema + constraints)
    -> SQLite DB
```

---

## 2. Project Structure

```
backend/
  manage.py
  pytest.ini
  config/                     <- Django project config (not a business app)
    settings.py               <- All settings, organized into sections
    urls.py                   <- Root URL (admin + /api/v1/)
    api_router.py             <- Central /api/v1/ route registry
    wsgi.py
  common/                     <- Shared infrastructure (no domain logic)
    exceptions.py             <- Consistent JSON error envelopes
    pagination.py             <- StandardResultsPagination
    permissions.py            <- IsAdminUser, IsStaffUser, IsOwnerOrAdmin
  apps/                       <- All domain Django apps
    users/                    <- Custom User model + JWT auth
    customers/                <- Customers CRUD, recharge, check-in, QR codes
    transactions/             <- Transaction log, dashboard stats
    settings_app/             <- Runtime business settings
    analytics/                <- Chart data (hourly/weekly/monthly)
  scripts/
    export_legacy_data.py     <- Export old DB before migration
    import_legacy_data.py     <- Import into new schema
```

Each app follows the same structure:
```
apps/<app_name>/
  apps.py          <- AppConfig
  models.py        <- Database models
  serializers.py   <- DRF serializers (input validation + output shaping)
  services.py      <- Business logic (the core of the app)
  views.py         <- HTTP layer (thin wrappers around services)
  urls.py          <- URL patterns for this app
  admin.py         <- Django Admin registration
  tests/
    test_<app_name>.py
```

---

## 3. API Reference

**Base URL:** `http://localhost:8000/api/v1/`

All endpoints require `Authorization: Bearer <token>` **except** the token endpoints.

### Authentication

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/auth/token/` | None | Login - get access + refresh tokens |
| POST | `/auth/token/refresh/` | None | Refresh an expired access token |
| POST | `/auth/token/blacklist/` | Bearer | Logout (invalidate refresh token) |
| GET | `/auth/me/` | Bearer | Get current user's profile |

### Customers

| Method | URL | Role | Description |
|--------|-----|------|-------------|
| GET | `/customers/` | Staff | List customers (paginated, `?search=`, `?page=`) |
| POST | `/customers/` | Staff | Create a new customer |
| GET | `/customers/<uuid>/` | Staff | Get a single customer |
| DELETE | `/customers/<uuid>/` | **Admin** | Delete customer + transactions |
| POST | `/customers/recharge/` | Staff | Add credit to a customer |
| POST | `/customers/checkin/` | Staff | Process check-in (deduct fee) |
| GET | `/customers/<uuid>/qr/` | Staff | Serve QR code PNG |

### Transactions

| Method | URL | Role | Description |
|--------|-----|------|-------------|
| GET | `/transactions/` | Staff | Paginated log (`?type=recharge|checkin`) |
| GET | `/transactions/stats/` | Staff | Dashboard totals + 10 recent transactions |

### Settings

| Method | URL | Role | Description |
|--------|-----|------|-------------|
| GET | `/settings/` | Staff | Get all application settings |
| POST | `/settings/` | **Admin** | Update settings |

### Analytics

| Method | URL | Role | Description |
|--------|-----|------|-------------|
| GET | `/analytics/` | Staff | Chart data (`?interval=hourly|weekly|monthly&metric=revenue|checkins&date=YYYY-MM-DD`) |

---

## 4. Authentication Flow

### Login

```
POST /api/v1/auth/token/
{ "username": "admin", "password": "yourpassword" }
```

Response:
```json
{
    "access": "<access_token>",
    "refresh": "<refresh_token>",
    "user": {
        "public_id": "uuid-here",
        "username": "admin",
        "is_staff": true,
        "is_superuser": true
    }
}
```

- **Access token**: Valid for 8 hours.
- **Refresh token**: Valid for 7 days.

### Authenticated Requests

```
GET /api/v1/customers/
Authorization: Bearer <access_token>
```

### Refresh Access Token

```
POST /api/v1/auth/token/refresh/
{ "refresh": "<refresh_token>" }
```

Response: `{ "access": "<new_access_token>" }`

### Logout

```
POST /api/v1/auth/token/blacklist/
Authorization: Bearer <access_token>
{ "refresh": "<refresh_token>" }
```

---

## 5. Frontend Integration Guide

### 5.1 Update api.js

```js
// frontend/src/lib/api.js

const API_BASE = 'http://localhost:8000';

let accessToken = null;
export const setAccessToken = (token) => { accessToken = token; };
export const clearAccessToken = () => { accessToken = null; };

async function apiFetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    const body = res.status !== 204 ? await res.json() : null;
    return { status: res.status, body };
}

export const login = (username, password) =>
    apiFetch('/api/v1/auth/token/', {
        method: 'POST', body: JSON.stringify({ username, password }),
    });

// Stats (Dashboard)
export const fetchStats = () => apiFetch('/api/v1/transactions/stats/');

// Transactions
export const fetchTransactions = (page = 1, pageSize = 10) =>
    apiFetch(`/api/v1/transactions/?page=${page}&page_size=${pageSize}`);

// Customers
export const fetchCustomers = (page = 1, pageSize = 10) =>
    apiFetch(`/api/v1/customers/?page=${page}&page_size=${pageSize}`);

export const searchCustomers = (query, page = 1, pageSize = 10) =>
    apiFetch(`/api/v1/customers/?search=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`);

export const createCustomer = (name, initialBalance, qrId = null) =>
    apiFetch('/api/v1/customers/', {
        method: 'POST',
        body: JSON.stringify({ name, initial_balance: initialBalance, qr_id: qrId }),
    });

export const deleteCustomerApi = (publicId) =>
    apiFetch(`/api/v1/customers/${publicId}/`, { method: 'DELETE' });

export const rechargeCustomer = (customerId, amount) =>
    apiFetch('/api/v1/customers/recharge/', {
        method: 'POST', body: JSON.stringify({ customer_id: customerId, amount }),
    });

export const checkinCustomer = (qrId) =>
    apiFetch('/api/v1/customers/checkin/', {
        method: 'POST', body: JSON.stringify({ qr_id: qrId }),
    });

export const fetchSettings = () => apiFetch('/api/v1/settings/');
export const saveSettings = (data) =>
    apiFetch('/api/v1/settings/', { method: 'POST', body: JSON.stringify(data) });

export const fetchAnalytics = (interval, metric, date) =>
    apiFetch(`/api/v1/analytics/?interval=${interval}&metric=${metric}&date=${date}`);

// QR Code image URL
export const getQrCodeUrl = (qrId) => `${API_BASE}/media/qrcodes/${qrId}.png`;
```

### 5.2 Response Shape Changes

#### Pagination

Old Flask returned flat arrays. New Django wraps in an envelope:

```json
{
    "count": 26,
    "total_pages": 3,
    "next": "http://localhost:8000/api/v1/customers/?page=2",
    "previous": null,
    "results": [...]
}
```

**Update components:**
```js
// Old
const { body } = await fetchCustomers();
setCustomers(body);

// New
const { body } = await fetchCustomers(page);
setCustomers(body.results);
setHasMore(body.next !== null);
```

#### Customer Object Changes

| Old field | New field | Notes |
|-----------|-----------|-------|
| `id` (UUID) | `public_id` (UUID) | Same UUID value |
| `balance` (float) | `balance` (string decimal) | Parse with `parseFloat()` |
| — | `qr_id` | UUID encoded in the QR sticker |

#### Transaction Object Changes

| Old field | New field |
|-----------|-----------|
| `customer_name` | `customer_name` (unchanged) |
| `type` | `type` (unchanged: `"recharge"` or `"checkin"`) |
| `amount` | `amount` (now string decimal) |

#### Stats Response

Old: `{ total_customers, total_revenue }`
New: `{ total_customers, total_revenue, recent_transactions: [...] }`

The recent transactions are bundled in the stats call — no separate request needed.

#### Error Envelope

All errors:
```json
{ "error": "Human-readable message", "code": "machine_readable_code" }
```

Validation errors:
```json
{
    "error": "Validation failed.",
    "code": "validation_error",
    "detail": { "amount": ["Ensure this value is greater than or equal to 0.01."] }
}
```

#### QR Code URL

Old: `https://server.pythonanywhere.com/qrcode/<id>.png`
New: `http://localhost:8000/media/qrcodes/<qr_id>.png`

The UUID is the same — it was the customer's old `id` field, now called `qr_id`.

---

## 6. Migrating from the Flask Backend

### Endpoint Map

| Old Flask URL | New Django URL |
|---------------|----------------|
| `/api/customers` | `/api/v1/customers/` |
| `/api/customers/<id>` | `/api/v1/customers/<public_id>/` |
| `/api/customers/search?q=` | `/api/v1/customers/?search=` |
| `/api/recharge` | `/api/v1/customers/recharge/` |
| `/api/checkin` | `/api/v1/customers/checkin/` |
| `/api/stats` | `/api/v1/transactions/stats/` |
| `/api/transactions` | `/api/v1/transactions/` |
| `/api/settings_get` | `/api/v1/settings/` |
| `/api/settings` (POST) | `/api/v1/settings/` (POST) |
| `/api/analytics` | `/api/v1/analytics/` |
| `/qrcode/<id>.png` | `/media/qrcodes/<qr_id>.png` |

### Migration Checklist

1. Update `API_BASE` in `api.js` to `http://localhost:8000`
2. Add auth: call `login()`, store token, attach `Authorization` header
3. Update endpoint paths (see table above)
4. Update customer data access: `c.id` -> `c.public_id`
5. Update QR URL: use `qr_id` field and `/media/qrcodes/` prefix
6. Update paginated list handling: extract `.results`, check `.next`
7. Update stats: use `body.recent_transactions` (bundled in stats response)
8. Test all pages: Dashboard, Customers, Recharge, Scan, Analytics, Settings

---

## 7. Database Design Decisions

### Three Identifiers on Customer

| Field | Type | Purpose |
|-------|------|---------|
| `id` | Integer | Internal PK (never exposed in API) |
| `public_id` | UUID | Exposed in API responses |
| `qr_id` | UUID | Encoded in the physical QR sticker |

This separation allows replacing a lost QR card without changing the customer's API identity.
**The `qr_id` values match the old Flask `id` values** — QR stickers do not need reprinting.

### DecimalField for Money

`FloatField` has rounding errors (`0.1 + 0.2 != 0.3`). `DecimalField` stores exact decimal values — critical for financial data. Balance is returned as a string (`"150.00"`); parse with `parseFloat()`.

### Row-Level Locking

`select_for_update()` is used in recharge and check-in operations to prevent race conditions when two requests hit the same customer simultaneously.

---

## 8. Extending the Backend

### Adding a Setting

In `apps/settings_app/services.py`:
```python
SETTING_MAX_DAILY_RECHARGE = 'max_daily_recharge'
DEFAULTS['max_daily_recharge'] = '5000.00'

def get_max_daily_recharge() -> Decimal:
    return Decimal(_get(SETTING_MAX_DAILY_RECHARGE))
```
Add to `ApplicationSettingsSerializer` and `update_settings`.

### Adding a User Role

1. Uncomment the `Role` enum + `role` field in `apps/users/models.py`
2. Run `makemigrations users && migrate`
3. Add permission class in `common/permissions.py`:
```python
class IsManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('manager', 'admin')
```
4. Apply with `permission_classes = [IsManager]` in views

### Adding a New App

```bash
mkdir backend/apps/myapp
python backend/manage.py startapp myapp backend/apps/myapp
```
1. Add `'apps.myapp'` to `LOCAL_APPS` in `settings.py`
2. Create `services.py`, `serializers.py`, `urls.py`
3. Register in `config/api_router.py`
4. Write tests in `apps/myapp/tests/`

---

## 9. Running Locally

### Start the Server

```bash
# From project root (venuity/)
.\venv\Scripts\python.exe backend\manage.py runserver
```

API: `http://127.0.0.1:8000/api/v1/`
Admin: `http://127.0.0.1:8000/admin/`

Default dev credentials: `admin / admin`

### Run Tests

```bash
cd backend
..\venv\Scripts\pytest apps/ -v
```

### Django Shell

```bash
.\venv\Scripts\python.exe backend\manage.py shell

>>> from apps.customers.models import Customer
>>> Customer.objects.count()
26
```
