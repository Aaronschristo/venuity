# Venuity: Frontend & Backend Integration & Learning Guide

Welcome to the Venuity integration guide! This document explains the core concepts of React, Django, and REST APIs, while simultaneously documenting exactly how the Django backend is integrated with the React frontend.

By reading this guide, you will understand *what* each technology does, *why* it was used, and *how* they connect together.

---

## 1. Core Concepts: The Big Picture

Venuity is split into two completely separate parts that talk to each other over the network:
1. **The Backend (Django):** The "brain" and the "database". It stores customer data, calculates balances, and enforces rules (e.g., "you can't recharge a negative amount").
2. **The Frontend (React + Tauri):** The "face". It displays buttons, tables, and charts to the user. It has no direct access to the database.
3. **The Communication (REST API):** The "bridge". Since the frontend can't read the backend's database directly, it sends HTTP requests (like sending a letter) to the backend, asking for data or requesting an action.
4. **Authentication (JWT):** The "security guard". Every API request must include a valid token that proves the user is logged in.

### What is a REST API?
An API (Application Programming Interface) is a set of rules that allows two programs to talk to each other. A **REST API** uses standard HTTP web addresses (URLs) to represent data.

Imagine a restaurant:
- **Frontend:** You (the customer) looking at the menu.
- **API (REST):** The waiter. You tell the waiter what you want.
- **Backend:** The kitchen. The kitchen cooks the food and gives it to the waiter to bring back to you.
- **JWT Token:** Your reservation receipt. The waiter checks it before seating you.

In Venuity:
- **POST `/api/v1/auth/token/`** → Show my ID card (username + password), get a reservation receipt (JWT token).
- **GET `/api/v1/customers/`** → Waiter, please bring me a list of all customers (I'm showing my receipt).
- **POST `/api/v1/customers/recharge/`** → Waiter, please tell the kitchen to add ₹500 to customer X's account.

Data is sent back and forth in **JSON** (JavaScript Object Notation) format:
```json
{
  "name": "John Doe",
  "balance": "500.00"
}
```

---

## 2. The Backend: Django & Django REST Framework

**Django** is a Python framework used to build secure, robust backends quickly. We use **Django REST Framework (DRF)** to create the REST API bridge.

### Key Concepts in Django
*   **Models (`models.py`):** These define your database tables. Instead of writing raw SQL code, you write Python classes. Django translates these into database tables automatically.
    *   *In Venuity:* The `Customer` model has `name`, `balance`, `qr_id`, and `public_id` fields.
*   **Services (`services.py`):** This is where the "business logic" lives. If you need to deduct money for a check-in, the math and rules happen here.
*   **Serializers (`serializers.py`):** These act as translators. They convert complex Django Models (Python objects) into JSON strings that the React frontend can understand, and vice versa.
*   **Views (`views.py`):** The receptionists. They receive the incoming HTTP request from the frontend, pass data to the serializer, ask the service to do the work, and return an HTTP response (like `200 OK` or `400 Bad Request`).

### Key Concepts in Security
*   **JWT (JSON Web Tokens):** When a user logs in, Django generates two tokens:
    - **Access Token** (valid 8 hours): Attached to every API request.
    - **Refresh Token** (valid 7 days): Used to get a new access token when it expires.
*   **Environment Variables:** Secrets like the Django `SECRET_KEY` are stored in a `.env` file, not in code. This file is gitignored.

---

## 3. The Frontend: React

**React** is a JavaScript library for building user interfaces. Instead of writing one massive HTML file, you build small, reusable pieces of UI called **Components**.

### Key Concepts in React
*   **Components:** JavaScript functions that return HTML-like code called **JSX**. 
    *   *In Venuity:* `Login.jsx`, `Settings.jsx`, `Dashboard.jsx`.
*   **State (`useState`):** The memory of a component. If a component's state changes, React automatically re-draws (re-renders) the component on the screen to show the new data.
    *   *Example:* Remembering what the user typed into the login form.
*   **Effects (`useEffect`):** Side effects that happen outside the normal rendering process. Most commonly used to fetch data from the API when the page first loads.
*   **Context (`useContext`):** Global memory. Instead of passing data down through 10 different components, Context allows you to store data globally so any component can access it.
    *   *In Venuity:* `AuthContext` holds the logged-in user, `SettingsContext` holds the business name and currency symbol.

---

## 4. How Integration Works: The Actual Implementation

Here is exactly how the Django backend is connected to the React frontend.

### Step 1: The API Client (`frontend/src/lib/api.js`)

This is the central file where all backend communication is defined.

**How it works:**
1. The base URL is read from the `VITE_API_BASE_URL` environment variable.
2. Every request automatically includes the JWT access token in the `Authorization: Bearer <token>` header.
3. If the backend returns a `401 Unauthorized` (token expired), the client automatically:
   - Refreshes the access token using the stored refresh token
   - Retries the original failed request with the new token
   - If refresh also fails, clears tokens and the user is logged out.
4. Multiple concurrent 401s share a single refresh request (no refresh storms).

### Step 2: Authentication (`frontend/src/context/AuthContext.jsx`)

**On app startup:**
1. `AuthContext` checks if tokens exist in `localStorage`.
2. If yes, calls `GET /api/v1/auth/me/` to validate the token.
3. If valid, sets the user profile in state → app renders the main interface.
4. If invalid, clears tokens → app renders the Login page.

**On login:**
1. User enters credentials → `POST /api/v1/auth/token/`
2. Backend returns `{ access, refresh, user }` → tokens stored in `localStorage`
3. User state is set → Login page is replaced with the main app.

**On logout:**
1. `POST /api/v1/auth/token/blacklist/` with the refresh token → backend invalidates it
2. Tokens cleared from `localStorage` → user state reset → Login page shown.

### Step 3: Handling Paginated Responses

Django returns lists in a "paginated envelope":
```json
{
  "count": 100,
  "next": "http://127.0.0.1:8000/api/v1/customers/?page=2",
  "previous": null,
  "results": [ {customer1}, {customer2} ]
}
```

In the frontend, list-based pages (Customers, Dashboard) extract the actual data:
```javascript
const { body } = await fetchCustomers(page, 10);
setCustomers(body.results);
setHasMore(body.next !== null);
```

### Step 4: Customer Identifiers (`public_id` and `qr_id`)

Each customer has three IDs:
| Field | Purpose | Where used |
|-------|---------|------------|
| `id` (integer) | Internal database PK | Never exposed |
| `public_id` (UUID) | API identity | All API calls, table rows, delete/recharge |
| `qr_id` (UUID) | QR sticker | QR code images, scanner check-in |

When the scanner reads a QR code, it gets a `qr_id`. The backend accepts either for check-in:
```javascript
// QR scan → sends qr_id
checkinCustomer(scannedQrId, true);

// Manual entry → sends public_id (customer_id)
checkinCustomer(selectedPublicId, false);
```

### Step 5: White-Labelling

Venuity supports full customization per deployment:

1. **Before login:** The Login page calls `GET /api/v1/settings/branding/` (public, no auth needed) to get the business name, logo, and brand colors.
2. **After login:** The `SettingsContext` fetches all settings and applies them:
   ```javascript
   document.documentElement.style.setProperty('--primary-color', settings.primary_color);
   ```
3. **All CSS** uses `var(--primary-color)` — so a single setting change re-themes the entire app.

---

## 5. Testing It Yourself

1. **Start the Backend:**
   ```bash
   copy backend\.env.example backend\.env
   # Edit .env if needed
   .\venv\Scripts\python.exe backend\manage.py runserver
   ```

2. **Start the Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open the App:** Navigate to `http://localhost:5173` (or `http://localhost:1420` in Tauri).

4. **Login:** Use the admin credentials (default: `admin` / `admin`).

5. **Observe:** Open your browser's Developer Tools (F12) → **Network** tab. You'll see:
   - `POST /api/v1/auth/token/` — login request
   - `GET /api/v1/auth/me/` — session validation
   - `GET /api/v1/settings/` — settings fetch
   - Every subsequent page load making authenticated API calls

---

## 6. Architecture Summary

```
┌──────────────────────────────────────────────────────┐
│                    Tauri (Desktop)                    │
│  ┌──────────────┐    ┌────────────────────────────┐  │
│  │ Rust Backend  │←──│     React Frontend          │  │
│  │ (QR Decode)   │   │                            │  │
│  └──────────────┘    │  AuthContext ← api.js ──────│──┼──→ Django REST API
│                      │  SettingsContext             │  │    /api/v1/auth/token/
│                      │  ToastContext               │  │    /api/v1/customers/
│                      │                            │  │    /api/v1/transactions/
│                      │  Login → Home → Pages       │  │    /api/v1/settings/
│                      └────────────────────────────┘  │    /api/v1/analytics/
└──────────────────────────────────────────────────────┘
                                                        ↓
                                                   PostgreSQL / SQLite
```
