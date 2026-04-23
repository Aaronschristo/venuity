# Frontend Documentation: React & Vite

The Venuity frontend is a high-performance, single-page application (SPA) built using **React** and **Vite**. It is designed with a premium **Glassmorphic** aesthetic, prioritizing visual excellence and smooth user interactions.

---

## 1. Technology Stack

- **Framework:** React 18+ (Functional Components & Hooks)
- **Build Tool:** Vite
- **Styling:** Vanilla CSS (Custom Properties / Variables)
- **Icons:** Boxicons & Lucide React
- **Typography:** Poppins (Google Fonts)
- **Routing:** React Router DOM (v6)
- **External Libraries:**
  - `chart.js`: Data visualization for analytics.
  - `flatpickr`: Modern, lightweight date picking.

---

## 2. Component Architecture

The project follows a modular structure for maximum scalability and maintainability.

### A. Context Providers (`src/context/`)
- **`SettingsContext`**: Manages global application state (Business Name, Currency Symbol, Check-in Fee) and persists them via the API. Handles Light/Dark mode transitions.
- **`ToastContext`**: Provides a global notification system for success, error, and info messages with a consistent glassmorphic style.

### B. Core Pages (`src/pages/`)
- **`Home.jsx`**: The central navigation hub with a 3x2 card grid layout.
- **`Dashboard.jsx`**: Real-time stats and an infinite-scrolling recent transactions table.
- **`Customers.jsx`**: Customer management with search, infinite scroll, and modal-based QR code operations (Issue, View, Assign).
- **`Recharge.jsx`**: Balance top-up interface featuring an integrated QR scanner and quick-amount buttons.
- **`Scan.jsx`**: Dedicated kiosk-mode check-in scanner with success/error state overlays.
- **`Analytics.jsx`**: Interactive business statistics with toggleable chart types (Bar/Line) and metrics (Revenue/Check-ins).
- **`Settings.jsx`**: Global configuration form for business details.

### C. Layout & Components (`src/components/`)
- **`Layout.jsx`**: The main application shell containing the responsive Sidebar and Topbar.
- **`ScannerWidget`** (within pages): A high-performance, native hybrid QR scanning component.

---

## 3. Design System (Glassmorphism)

Venuity utilizes a modern design language characterized by:
- **`backdrop-filter: blur(12px)`**: Creating the "frosted glass" effect on cards and overlays.
- **Translucent Backgrounds**: Using `rgba` colors for depth.
- **Fluid Animations**: Smooth transitions for sidebars, modals, and theme switching.
- **Custom CSS Properties**: Centralized tokens in `index.css` for colors, spacing, and glass effects.

---

## 4. Performance Optimizations

- **Infinite Scrolling**: Uses `IntersectionObserver` to load large datasets incrementally, preventing DOM bloat.
- **Lazy Loading**: Heavy libraries like `chart.js` and `flatpickr` are loaded only when needed.
- **Memoization**: Strategic use of `React.memo` and `useCallback` to minimize unnecessary re-renders.
- **Native Hybrid Scanning**: Offloads QR decoding to a Rust-based backend command for near-instant results without taxing the browser thread.

---

## 5. API Integration (`src/lib/api.js`)

The frontend communicates with a Python/Flask backend using native `fetch`.
- **Environment Aware**: Automatically targets the production server or local development endpoint.
- **Sanitization**: All user-generated content is sanitized to prevent XSS before rendering.
- **Centralized Service**: All network logic is encapsulated in a single service layer for consistency.
