# Operations: Setup & Production Builds

This guide explains how to set up the development environment and how to package Venuity for real-world use.

---

## 1. Local Environment Setup

### Prerequisites
- **Node.js** (v18+)
- **Rust & Cargo** (For Tauri native layer)
- **Python** (v3.10+)

### Frontend & Tauri Development
1. Navigate to the `frontend/` folder.
2. Install dependencies: `npm install`.
3. Start the Vite dev server: `npm run dev`.
4. To launch the full Tauri app:
   ```bash
   npm run tauri dev
   ```
   *Note: This will launch the React UI inside a native desktop window.*

---

## 2. Production Build (Creating the .EXE)
To create a standalone Windows installer:

1. Ensure the backend URL in `frontend/src/lib/api.js` is set to your production server (e.g., PythonAnywhere).
2. From the root directory, run the Tauri build command:
   ```bash
   npm run tauri build
   ```
3. The final installer will be found in:
   `src-tauri/target/release/bundle/msi/` or `.../exe/`

---

## 3. Deployment Checkpoints

### A. Environment Variables
- Ensure `VITE_API_BASE` (if used) is correctly configured for production.
- The `api.js` library should point to the production Flask URL.

### B. Hardware Scanners
- Venuity's native hybrid scanner is optimized for standard webcams.
- For retail environments, a dedicated 2D CMOS scanner is recommended for faster throughput.

### C. Kiosk Configuration
- To run Venuity as a full-screen kiosk, update `tauri.conf.json`:
  - Set `"fullscreen": true`
  - Set `"resizable": false`
  - Set `"alwaysOnTop": true`

---

## 4. Maintenance
- **Backups:** Ensure the SQLite `db.sqlite3` file on the Flask server is backed up regularly.
- **Updates:** When updating the frontend, a new Tauri build must be generated and distributed to all kiosk terminals.
