# Architecture Overview: Venuity System

This document explains how the different parts of Venuity work together. It is designed for beginners to understand the "Big Picture" of the application.

---

## 1. The Three Core Layers
Venuity is built using a **Decoupled Architecture**, meaning the parts are separate but communicate through standardized channels.

### A. The Native Layer (Rust & Tauri)
*   **Role:** The "Desktop Wrapper."
*   **Folder:** `src-tauri/`
*   **Function:** It provides the actual window you see on your computer. It handles high-performance tasks that browsers are slow at (like decoding QR codes from raw images) via **Rust commands**.
*   **Key File:** `src-tauri/src/lib.rs` (where native commands like `decode_qr` live).

### B. The Frontend Layer (React & Vite)
*   **Role:** The "User Interface."
*   **Folder:** `frontend/`
*   **Function:** This layer handles the visual interface, navigation, and user interactions. Built with **React**, it manages application state (Auth, Theme, Settings) and communicates with both the Native Layer (for hardware tasks) and the Backend Layer (for data).

### C. The Backend Layer (Python & Django REST Framework)
*   **Role:** The "Database & Brain."
*   **Function:** It stores all customer data, transaction history, and business settings. It ensures that if you check in a customer, their balance is updated permanently in the database. The backend uses **Django REST Framework** with **JWT authentication** for secure API access.

---

## 2. How Communication Works
Venuity uses three types of communication:

1.  **Native Bridge (Frontend to Rust):**
    *   The Frontend uses the `invoke()` function to talk to the Rust backend.
    *   *Example:* Sending a captured image frame to Rust to be decoded into a QR ID.
2.  **Web API (Frontend to Django):**
    *   The Frontend uses standard web requests (via `fetch`) to talk to the Django REST API.
    *   All data requests require JWT authentication (Bearer token in headers).
    *   *Example:* Asking the backend, "What is the balance for Customer ID 123?"
3.  **Authentication (JWT Token Flow):**
    *   User logs in with username/password → Backend returns access + refresh tokens.
    *   Access token is attached to every subsequent API request.
    *   When access token expires, the frontend automatically refreshes it using the refresh token.
    *   On logout, the refresh token is blacklisted on the server.

---

## 3. Data Flow Example: A Customer Check-in

1.  **Authentication:** The user has already logged in and has a valid JWT access token stored in localStorage.
2.  **Input:** The `ScannerWidget` in React captures a video frame every 100ms.
3.  **Processing (Native):** The frame is sent to the Rust `decode_qr` command. Rust returns the Customer's `qr_id` UUID.
4.  **Processing (Frontend):** React receives the UUID and triggers an authenticated request to the Django API at `/api/v1/customers/checkin/`.
5.  **Storage (Backend):** The Django backend validates the JWT token, finds the customer by `qr_id`, uses `select_for_update()` for row-level locking, deducts the entry fee, logs the transaction, and saves atomically.
6.  **Response:** The backend sends back the customer's name, new balance, and fee charged.
7.  **Output:** The UI displays a glassmorphic success overlay with the customer's updated balance.

---

## 4. Security Architecture

*   **JWT Tokens:** Access tokens expire after 8 hours; refresh tokens after 7 days.
*   **Environment Variables:** All secrets (SECRET_KEY, database credentials) are loaded from `.env` files via `python-decouple`, never hardcoded.
*   **Public ID Separation:** Internal database IDs are never exposed. The API uses UUID `public_id` fields.
*   **QR ID Isolation:** QR stickers encode a separate `qr_id` UUID, allowing card replacement without changing the customer's API identity.
*   **CORS:** Configured via environment variable whitelist in production.
*   **Role-Based Access:** Staff users can read data; only Admin users can delete customers or modify settings.
