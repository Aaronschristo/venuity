# Frontend Documentation: React & Vite

The Venuity frontend is a high-performance, single-page application (SPA) built using **React** and **Vite**. It is designed with a premium **Glassmorphic** aesthetic, prioritizing visual excellence and smooth user interactions.

---

## 1. Technology Stack

- **Framework:** React 19+ (Functional Components & Hooks)
- **Build Tool:** Vite
- **Styling:** Vanilla CSS (Custom Properties / Variables)
- **Icons:** Boxicons & Lucide React
- **Typography:** Poppins (Google Fonts)
- **Routing:** React Router DOM (v7)
- **HTTP Client:** Native `fetch` with JWT token management
- **External Libraries:**
  - `chart.js`: Data visualization for analytics.
  - `flatpickr`: Modern, lightweight date picking.

---

## 2. Component Architecture

The project follows a modular structure for maximum scalability and maintainability.

### A. Context Providers (`src/context/`)
- **`AuthContext`**: Manages JWT authentication state. Handles login, logout, session validation, and token refresh delegation.
- **`SettingsContext`**: Manages global application state (Business Name, Currency Symbol, Check-in Fee) and white-label branding (colors, logo). Persists via API and localStorage.
- **`ToastContext`**: Provides a global notification system for success, error, and info messages with a consistent glassmorphic style.

### B. Core Pages (`src/pages/`)
- **`Login.jsx`**: Premium glassmorphic login screen with white-label support (fetches branding from public endpoint), password visibility toggle, and error states.
- **`Home.jsx`**: The central navigation hub with a 3x2 card grid layout and user greeting.
- **`Dashboard.jsx`**: Real-time stats and an infinite-scrolling recent transactions table.
- **`Customers.jsx`**: Customer management with search, infinite scroll, and modal-based QR code operations (Issue, View, Assign).
- **`Recharge.jsx`**: Balance top-up interface featuring an integrated QR scanner and quick-amount buttons.
- **`Scan.jsx`**: Dedicated kiosk-mode check-in scanner with success/error state overlays.
- **`Analytics.jsx`**: Interactive business statistics with toggleable chart types (Bar/Line) and metrics (Revenue/Check-ins).
- **`Settings.jsx`**: Business configuration and white-label branding settings (color pickers, app title).

### C. Layout & Components (`src/components/`)
- **`Layout.jsx`**: The main application shell containing the responsive Sidebar, Topbar, user info display, and logout button.
- **`ScannerWidget`** (within pages): A high-performance, native hybrid QR scanning component.

---

## 3. Authentication Flow

The frontend uses JWT (JSON Web Token) authentication:

1. **Login:** User enters credentials → `api.login()` → tokens stored in `localStorage`
2. **Authenticated Requests:** Every API call includes `Authorization: Bearer <access_token>` header
3. **Token Refresh:** On 401 response → automatically refresh via `/auth/token/refresh/` → retry original request
4. **Session Validation:** On app mount, `AuthContext` calls `/auth/me/` to validate stored tokens
5. **Logout:** Refresh token blacklisted on server → localStorage cleared → redirect to login

---

## 4. White-Labelling

Venuity supports comprehensive white-labelling:

- **Branding Endpoint:** `GET /api/v1/settings/branding/` (public, no auth required)
- **Dynamic Colors:** Primary and hover colors applied as CSS custom properties at runtime
- **Business Name:** Displayed on login screen, sidebar, home page, and browser tab
- **Logo:** Configurable via settings
- **All CSS uses `var(--primary-color)`** — changing the setting changes the entire app's color scheme instantly

---

## 5. Design System (Glassmorphism)

Venuity utilizes a modern design language characterized by:
- **`backdrop-filter: blur(12px)`**: Creating the "frosted glass" effect on cards and overlays.
- **Translucent Backgrounds**: Using `rgba` colors for depth.
- **Fluid Animations**: Smooth transitions for sidebars, modals, and theme switching.
- **Custom CSS Properties**: Centralized tokens in `index.css` for colors, spacing, and glass effects.
- **Dark Mode**: Full dark mode support via `[data-theme="dark"]` CSS attribute.

---

## 6. Performance Optimizations

- **Infinite Scrolling**: Uses `IntersectionObserver` to load large datasets incrementally, preventing DOM bloat.
- **Lazy Loading**: Heavy libraries like `chart.js` and `flatpickr` are loaded only when needed.
- **Memoization**: Strategic use of `React.memo` and `useCallback` to minimize unnecessary re-renders.
- **Native Hybrid Scanning**: Offloads QR decoding to a Rust-based backend command for near-instant results without taxing the browser thread.
- **Token Refresh Queue**: Concurrent 401 responses share a single refresh request, preventing token refresh storms.

---

## 7. API Integration (`src/lib/api.js`)

The frontend communicates with the Django REST API using native `fetch` wrapped in a centralized API layer.

- **Environment-Aware**: `VITE_API_BASE_URL` environment variable controls the backend target.
- **JWT Token Management**: Automatic Bearer header injection, 401 → refresh → retry flow.
- **Error Extraction**: `extractError()` helper normalizes Django error envelopes to user-friendly messages.
- **Page-Based Pagination**: All list endpoints use `?page=N&page_size=N` with envelope response `{ results, count, next, previous }`.
- **Sanitization**: All user-generated content is sanitized to prevent XSS before rendering.
