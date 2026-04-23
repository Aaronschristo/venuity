/**
 * useNativeScanner.js
 *
 * A custom React hook that replaces html5-qrcode with a native Rust-powered
 * QR decoder via Tauri's `invoke` IPC. The browser still owns the camera
 * (WebRTC / getUserMedia), but every frame is decoded in Rust using `rqrr` —
 * a fast, pure-Rust QR code detector and decoder.
 *
 * Architecture:
 *   Camera (getUserMedia)
 *     → <video> element
 *       → offscreen <canvas> (frame capture via requestAnimationFrame)
 *         → base64 PNG string
 *           → tauri::invoke('decode_qr_frame')
 *             → Rust/rqrr decode
 *               → onScan(content) callback
 *
 * Usage:
 *   const { start, stop, cameras, selectedCamera, setSelectedCamera,
 *           isActive, scannerState, setScannerState, videoRef, canvasRef }
 *     = useNativeScanner((qrText) => { ... });
 *
 *   // In JSX:
 *   <video ref={videoRef} autoPlay playsInline muted />
 *   <canvas ref={canvasRef} style={{ display: 'none' }} />
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useNativeScanner(onScan) {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [scannerState, setScannerState] = useState('placeholder');
  // States: 'placeholder' | 'loading' | 'active' | 'success' | 'error'

  // DOM refs — consumers must attach these to <video> and <canvas> elements
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Internal refs (don't need to trigger re-renders)
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const isActiveRef = useRef(false); // mirrors isActive for use inside RAF closure
  const processingRef = useRef(false);
  const lastScanTimeRef = useRef(0);

  // Keep isActiveRef in sync with isActive state
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // ─── Enumerate available cameras on mount ───────────────────────────────────
  useEffect(() => {
    // We need to request camera permission first before enumerateDevices gives
    // us real labels (browser security requirement).
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((tempStream) => {
        tempStream.getTracks().forEach((t) => t.stop()); // release immediately
        return navigator.mediaDevices.enumerateDevices();
      })
      .then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        const cameraList = videoDevices.map((d, i) => ({
          id: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
        setCameras(cameraList);
        if (cameraList.length > 0) setSelectedCamera(cameraList[0].id);
      })
      .catch((err) => {
        console.warn('[NativeScanner] Could not enumerate cameras:', err);
      });
  }, []);

  // ─── Frame capture ──────────────────────────────────────────────────────────
  /**
   * Draws the current video frame onto the offscreen canvas and returns it as
   * a base64-encoded PNG string (without the data URI prefix), ready to send
   * to Rust for decoding.
   */
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      return null;
    }
    const ctx = canvas.getContext('2d');
    
    // Crop to the center square to remove background noise
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    
    // Scale down to max 500x500 for rqrr to process fast and accurately
    const targetSize = Math.min(size, 500);
    
    canvas.width = targetSize;
    canvas.height = targetSize;
    
    // Enhance contrast and grayscale for better QR detection
    ctx.filter = 'contrast(120%) grayscale(100%)';
    ctx.drawImage(video, sx, sy, size, size, 0, 0, targetSize, targetSize);
    
    // Strip 'data:image/png;base64,' prefix — Rust only wants the raw base64
    return canvas.toDataURL('image/png').split(',')[1];
  }, []);

  // ─── Main scan loop ─────────────────────────────────────────────────────────
  /**
   * Runs on every animation frame while the scanner is active.
   * Captures a frame, sends it to Rust, and fires onScan on success.
   * The sentinel error 'no_qr_found' is silently ignored (normal when no QR
   * code is in the camera view).
   */
  const scanLoop = useCallback(async () => {
    if (!isActiveRef.current) return; // scanner was stopped

    if (processingRef.current) {
      // Still waiting on the previous Rust call — skip frame to avoid piling up
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const now = Date.now();
    if (now - lastScanTimeRef.current < 100) {
      // Limit scanning to roughly once every 100ms
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const frameB64 = captureFrame();
    if (!frameB64) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    lastScanTimeRef.current = Date.now();
    processingRef.current = true;

    try {
      const decoded = await invoke('decode_qr_frame', { frameB64 });
      // Rust returned a QR string — fire callback
      setScannerState('success');
      onScan(decoded);
      // Brief pause before resuming scan loop to prevent re-scanning the same code
      setTimeout(() => {
        if (isActiveRef.current) {
          setScannerState('active');
          processingRef.current = false;
          rafRef.current = requestAnimationFrame(scanLoop);
        }
      }, 2000);
    } catch (err) {
      const msg = String(err);
      if (!msg.includes('no_qr_found')) {
        // Real decode error — log for debugging but don't crash
        console.warn('[NativeScanner] Decode error:', err);
      }
      // In all error cases (including no_qr_found), just continue the loop
      processingRef.current = false;
      rafRef.current = requestAnimationFrame(scanLoop);
    }
  }, [captureFrame, onScan]);

  // ─── Start scanner ──────────────────────────────────────────────────────────
  /**
   * Requests camera access, attaches the stream to the video element, and
   * begins the scan loop.
   */
  const start = useCallback(async () => {
    if (!selectedCamera) {
      console.warn('[NativeScanner] No camera selected.');
      return;
    }
    setScannerState('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedCamera },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error('video element not mounted');
      video.srcObject = stream;
      await video.play();

      setIsActive(true);
      isActiveRef.current = true;
      setScannerState('active');

      // Kick off the scan loop
      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      console.error('[NativeScanner] Failed to start camera:', err);
      setScannerState('placeholder');
      throw err;
    }
  }, [selectedCamera, scanLoop]);

  // ─── Stop scanner ───────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    processingRef.current = false;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScannerState('placeholder');
  }, []);

  // Toggle helper
  const toggle = useCallback(() => {
    if (isActiveRef.current) stop();
    else start();
  }, [start, stop]);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return {
    // Controls
    start,
    stop,
    toggle,
    // Camera selection
    cameras,
    selectedCamera,
    setSelectedCamera,
    // State
    isActive,
    scannerState,
    setScannerState,
    // DOM refs — attach to <video> and <canvas> in JSX
    videoRef,
    canvasRef,
  };
}
