import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

    // Auto-dismiss after 4s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type}`}
            style={t.exiting ? { animation: 'fadeOut 0.3s forwards' } : undefined}
          >
            <i
              className={`bx ${t.type === 'success' ? 'bx-check-circle' : 'bx-x-circle'}`}
              style={{
                fontSize: '24px',
                color: t.type === 'success' ? 'var(--success)' : 'var(--danger)',
              }}
            />
            <div style={{ fontWeight: 500 }}>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
