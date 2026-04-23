# Architecture Overview: Venuity System

This document explains how the different parts of Venuity work together. It is designed for beginners to understand the "Big Picture" of the application.

---

## 1. The Three Core Layers
Venuity is built using a "Decoupled Architecture," meaning the parts are separate but communicate through standardized channels.

### A. The Native Layer (Rust & Tauri)
*   **Role:** The "Desktop Wrapper."
*   **Folder:** `src-tauri/`
*   **Function:** It provides the actual window you see on your computer. It handles high-performance tasks that browsers are slow at (like decoding QR codes from raw images) via **Rust commands**.
*   **Key File:** `src-tauri/src/lib.rs` (where native commands like `decode_qr` live).

### B. The Frontend Layer (React & Vite)
*   **Role:** The "User Interface."
*   **Folder:** `frontend/`
*   **Function:** This layer handles the visual interface, navigation, and user interactions. Built with **React**, it manages application state (Theme, Settings) and communicates with both the Native Layer (for hardware tasks) and the Backend Layer (for data).

### C. The Backend Layer (Python & Flask)
*   **Role:** The "Database & Brain."
*   **Function:** It stores all customer data, transaction history, and business settings. It ensures that if you check in a customer, their balance is updated permanently in the database. The current production backend is hosted on PythonAnywhere.

---

## 2. How Communication Works
Venuity uses two types of communication:

1.  **Native Bridge (Frontend to Rust):**
    *   The Frontend uses the `invoke()` function to talk to the Rust backend.
    *   *Example:* Sending a captured image frame to Rust to be decoded into a QR ID.
2.  **Web API (Frontend to Python):**
    *   The Frontend uses standard web requests (via `fetch`) to talk to the Python/Flask backend.
    *   *Example:* Asking the backend, "What is the balance for Customer ID 123?"

---

## 3. Data Flow Example: A Customer Check-in

1.  **Input:** The `ScannerWidget` in React captures a video frame every 100ms.
2.  **Processing (Native):** The frame is sent to the Rust `decode_qr` command. Rust returns the Customer UUID (e.g., `"CUST_001"`).
3.  **Processing (Frontend):** React receives the UUID and triggers a request to the Flask API at `/api/checkin`.
4.  **Storage (Backend):** The Flask backend updates the SQLite database, logs the transaction, and deducts the entry fee.
5.  **Response:** The backend sends back the customer's name and new balance.
6.  **Output:** The UI displays a glassmorphic success overlay with the customer's updated balance.
