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

const STORAGE_KEY_CAMERAS = 'venuity_cameras';
const STORAGE_KEY_SELECTED = 'venuity_selected_camera';

export function useNativeScanner(onScan) {
  // ─── State ──────────────────────────────────────────────────────────────────
  // Initialize cameras and selection from localStorage for zero-latency UI load
  const [cameras, setCameras] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_CAMERAS) || '[]');
    } catch {
      return [];
    }
  });
  
  const [selectedCamera, setSelectedCameraState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_SELECTED) || '';
  });

  const [isActive, setIsActive] = useState(false);
  const [scannerState, setScannerState] = useState('placeholder');
  // States: 'placeholder' | 'loading' | 'active' | 'success' | 'error'

  // Wrapper to persist selected camera changes from the dropdown
  const setSelectedCamera = useCallback((id) => {
    setSelectedCameraState(id);
    localStorage.setItem(STORAGE_KEY_SELECTED, id);
  }, []);

  // DOM refs — consumers must attach these to <video> and <canvas> elements
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Internal refs
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const isActiveRef = useRef(false);
  const processingRef = useRef(false);
  const lastScanTimeRef = useRef(0);

  // Keep isActiveRef in sync
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // ─── Enumerate & Update Cameras ─────────────────────────────────────────────
  const refreshCameraList = useCallback(async (requestPermission = false) => {
    try {
      if (requestPermission) {
        // Briefly request camera to trigger permission prompt & unmask labels
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach((t) => t.stop());
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      const cameraList = videoDevices.map((d, i) => ({
        id: d.deviceId,
        label: d.label || `Camera ${i + 1}`,
      }));

      setCameras(cameraList);
      localStorage.setItem(STORAGE_KEY_CAMERAS, JSON.stringify(cameraList));

      // Auto-select logic
      setSelectedCameraState((currentSelected) => {
        if (cameraList.length === 0) {
          localStorage.removeItem(STORAGE_KEY_SELECTED);
          return '';
        }
        // If current selection is invalid (e.g. unplugged), pick the first one
        if (!currentSelected || !cameraList.some(c => c.id === currentSelected)) {
          const newId = cameraList[0].id;
          localStorage.setItem(STORAGE_KEY_SELECTED, newId);
          return newId;
        }
        return currentSelected;
      });
      
    } catch (err) {
      console.warn('[NativeScanner] Could not refresh cameras:', err);
      throw err;
    }
  }, []);

  // ─── Device Change Listener ─────────────────────────────────────────────────
  useEffect(() => {
    const handleDeviceChange = () => {
      // Re-enumerate silently (without forcing permission prompt) on hardware change
      refreshCameraList(false);
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, [refreshCameraList]);

  // ─── Frame capture ──────────────────────────────────────────────────────────
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
  const scanLoop = useCallback(async () => {
    if (!isActiveRef.current) return; // scanner was stopped

    if (processingRef.current) {
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
      setScannerState('success');
      onScan(decoded);
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
        console.warn('[NativeScanner] Decode error:', err);
      }
      processingRef.current = false;
      rafRef.current = requestAnimationFrame(scanLoop);
    }
  }, [captureFrame, onScan]);

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
      streamRef.current.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScannerState('placeholder');
  }, []);

  // ─── Start scanner ──────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    setScannerState('loading');
    try {
      // 1. Ensure permissions are granted and device list is fully populated
      await refreshCameraList(true);
      
      // 2. Fetch the latest selected camera ID from localStorage directly
      //    (since React state might not have updated yet if we just auto-selected)
      const currentSelectedId = localStorage.getItem(STORAGE_KEY_SELECTED);

      if (!currentSelectedId) {
        throw new Error('No camera found or accessible');
      }

      // 3. Start Stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: currentSelectedId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      
      streamRef.current = stream;

      // Handle physical disconnection (unplug) while running
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          console.warn('[NativeScanner] Camera track ended unexpectedly (unplugged?).');
          stop();
        };
      }

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
      throw err; // Let consumer components handle the error (e.g. showToast)
    }
  }, [refreshCameraList, scanLoop, stop]);

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
    // DOM refs
    videoRef,
    canvasRef,
  };
}
