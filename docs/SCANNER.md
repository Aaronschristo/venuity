# QR Scanning & Decoding: Native Hybrid Engine

Venuity implements a high-performance **Native Hybrid QR Engine**. Unlike traditional web-based scanners that rely on heavy JavaScript libraries for decoding, Venuity offloads the compute-intensive decoding task to the native Rust layer.

---

## 1. How it Works (The Hybrid Pipeline)

The scanning process is split between the Browser (Frontend) and the Operating System (Native Rust):

1.  **Capture (React):** The frontend uses `navigator.mediaDevices.getUserMedia` to access the camera stream and render it into a `<video>` element.
2.  **Sampling:** Every 100ms, a hidden `<canvas>` captures a snapshot of the current video frame.
3.  **Bridge:** The snapshot (as a Base64 JPEG) is sent to the Rust backend using Tauri's `invoke('decode_qr')` command.
4.  **Decoding (Rust):** The Rust layer uses the high-performance `rqrr` crate to find and decode QR codes in the image.
5.  **Result:** The decoded ID is returned to the React frontend to trigger business logic (e.g., check-in or customer lookup).

---

## 2. Advantages of the Hybrid Approach

-   **Speed:** Rust's decoding logic is significantly faster than JavaScript equivalents.
-   **Low Overhead:** The browser thread remains responsive because it isn't performing heavy image processing.
-   **Reliability:** Native decoding handles low-light and high-blur frames more effectively.
-   **Battery Efficiency:** Offloading to native code is generally more power-efficient on portable devices.

---

## 3. Frontend Implementation (`ScannerWidget`)

The `ScannerWidget` is the primary interface for scanning. It manages several states:

-   **`placeholder`**: Camera is inactive. Displays a glassmorphic overlay with instructions.
-   **`loading`**: Initializing camera permissions and stream.
-   **`active`**: Live video feed is visible and frames are being sent to Rust.
-   **`success`**: A QR code was successfully found. The UI shows a pulse animation and success checkmark.
-   **`error`**: Displayed if a scan fails or if a customer doesn't exist (Scan page).

---

## 4. Native Command Reference

### `decode_qr(imageBase64: String) -> String`
- **Location:** `src-tauri/src/lib.rs`
- **Logic:**
  1. Decodes Base64 string into raw bytes.
  2. Loads the image using the `image` crate.
  3. Uses `rqrr` to locate QR symbols.
  4. Returns the first decoded text found.

---

## 5. Hardware Compatibility

The system is optimized for:
- **Integrated Webcams:** Laptops and Kiosk tablets.
- **External USB Cameras:** High-resolution scanners for retail environments.
- **2D CMOS Scanners:** While the software scanner works great, Venuity also supports hardware-level keyboard wedge scanners that input data directly into focused fields.
