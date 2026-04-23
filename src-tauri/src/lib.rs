use base64::{engine::general_purpose, Engine as _};
use image::DynamicImage;
use rqrr::PreparedImage;
use tauri::command;

/// Decodes a QR code from a base64-encoded PNG frame captured from the webcam.
///
/// The JS frontend captures a video frame onto an offscreen canvas, exports it
/// as a PNG data URL (base64), strips the `data:image/png;base64,` prefix, and
/// passes the raw base64 string here.
///
/// Returns the decoded QR content string on success, or a string error.
/// The sentinel error `"no_qr_found"` means no QR code was detected in the
/// frame — this is normal and should NOT be treated as an error by the caller.
#[command]
fn decode_qr_frame(frame_b64: String) -> Result<String, String> {
    // 1. Decode base64 → raw PNG bytes
    let bytes = general_purpose::STANDARD
        .decode(&frame_b64)
        .map_err(|e| format!("base64 decode error: {e}"))?;

    // 2. Load the image from PNG bytes into an in-memory DynamicImage
    let img: DynamicImage = image::load_from_memory(&bytes)
        .map_err(|e| format!("image load error: {e}"))?;

    // 3. Convert to Luma8 (grayscale) — rqrr only works on grayscale images
    let luma = img.to_luma8();

    // 4. Prepare the image for QR grid detection
    let mut prepared = PreparedImage::prepare(luma);

    // 5. Search for QR code grids in the image
    let grids = prepared.detect_grids();
    if grids.is_empty() {
        return Err("no_qr_found".to_string());
    }

    // 6. Decode the first detected grid and return its content
    let (_meta, content) = grids[0]
        .decode()
        .map_err(|e| format!("qr decode error: {e}"))?;

    Ok(content)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(any(target_os = "android", target_os = "ios"))]
            app.handle().plugin(tauri_plugin_barcode_scanner::init())?;

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![decode_qr_frame])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
