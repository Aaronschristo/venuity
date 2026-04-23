# Venuity - PlayArea Manager

A premium, cross-platform application designed for PlayArea businesses to manage digital customer check-ins, wallet top-ups, and point-of-sale functionality securely using QR code scanning capabilities. 

Built with a modernized tech stack:
*   **Frontend:** React (Vite) + Vanilla CSS (Glassmorphism UI)
*   **Backend:** Django REST Framework (Python) or Flask
*   **Desktop App:** Tauri 2 (Rust)

🌍 **Live Web API:** `https://aaronschristo.pythonanywhere.com/api/`

---

## 🛠️ System Architecture

Venuity has been upgraded to a modular architecture, replacing the legacy Vanilla JS implementation with a scalable React Single Page Application (SPA).

1. **`backend/`:** The Python Django REST Framework backend API and SQLite Database (`db.sqlite3`).
2. **`frontend/`:** The React + Vite application containing all UI components (`src/components`, `src/pages`), routing, and API integration.
3. **`src-tauri/`:** The Rust-based environment that wraps the frontend into a native Desktop executable.

---

## 🚀 Setting Up the Development Environment

### 1. Prerequisites
*   [Node.js](https://nodejs.org/) (v18+)
*   [Rust](https://www.rust-lang.org/tools/install) (Required for Tauri)
*   [Python 3.10+](https://www.python.org/downloads/) (Required for local backend)

### 2. Frontend & Tauri Setup
Open your terminal in the root `venuity` project directory:

```bash
# Install Node.js dependencies
npm install

# Start the Tauri Developer Environment (runs Vite + Rust watcher)
npm run dev
```
*Note: This command will automatically start the Vite dev server for the React app and launch the Tauri desktop window.*

---

## ⚙️ Configuring the API Connection

By default, the React frontend is configured to communicate with the production cloud server. If you want to test against a local backend, you need to update the Axios configuration.

1. Open `frontend/src/lib/api.js` in your code editor.
2. Update the `baseURL` property:

```javascript
// frontend/src/lib/api.js
const api = axios.create({
  // For Production:
  baseURL: 'https://aaronschristo.pythonanywhere.com/api/',
  
  // For Local Django Development (Uncomment below):
  // baseURL: 'http://127.0.0.1:8000/api/',
  
  timeout: 10000,
});
```

---

## 🖥️ Running the Local Backend (Django)

If you wish to run the backend locally instead of relying on the cloud server, follow these steps:

Open a **new** terminal in the root `venuity` directory:

```bash
# 1. Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On macOS / Linux:
source venv/bin/activate

# 2. Navigate to the backend directory
cd backend

# 3. Install required Python packages (if not already installed)
pip install -r ../requirements.txt

# 4. Run the Django Server
python manage.py runserver
```
> The local server will start running at **`http://127.0.0.1:8000`**. Remember to update `api.js` to point to this URL.

---

## 📦 Building for Production

To compile Venuity into a standalone executable (e.g., `.exe` for Windows) for distribution:

1. Ensure all frontend assets build successfully.
2. Run the Tauri build command from the project root:

```bash
npm run tauri build
```
The final installer/executable will be generated in `src-tauri/target/release/bundle/`.

---

## 📖 Usage Flow
1. **Initialize Settings:** Start by going to **Settings**. Set your Business Name, Currency Symbol, and standard Check-in Fee.
2. **Issue Customers:** Head to **Customers** to generate accounts.
3. **Recharge Wallets:** Head to **Recharge** to add money to customer accounts (supports QR auto-fill).
4. **Scan Passes:** Open **Check-in**, point the camera at a customer's QR code, and watch the system automatically debit their wallet.
5. **Insights:** Track your revenue and visitor counts through the **Analytics** dashboard featuring interactive charts.
