/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, ReactNode } from 'react';
import { ToastContainer } from '../components/ToastContainer';
import type { ToastItem, ToastType } from '../types';

export type { ToastItem, ToastType };

export interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string, duration?: number) => string;
    error: (message: string, title?: string, duration?: number) => string;
    warning: (message: string, title?: string, duration?: number) => string;
    info: (message: string, title?: string, duration?: number) => string;
  };
}

// Fallback context for testing or when rendered outside ToastProvider
const defaultContextValue: ToastContextType = {
  showToast: () => '',
  removeToast: () => {},
  toast: {
    success: (msg: string) => { console.log('[Toast Success]:', msg); return ''; },
    error: (msg: string) => { console.error('[Toast Error]:', msg); return ''; },
    warning: (msg: string) => { console.warn('[Toast Warning]:', msg); return ''; },
    info: (msg: string) => { console.info('[Toast Info]:', msg); return ''; }
  }
};

export const ToastContext = createContext<ToastContextType>(defaultContextValue);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    const existing = timeoutsRef.current.get(id);
    if (existing) {
      clearTimeout(existing);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duration = item.duration ?? (item.type === 'error' ? 5000 : 3500);

    const newToast: ToastItem = { ...item, id, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        removeToast(id);
      }, duration);
      timeoutsRef.current.set(id, timeoutId);
    }

    return id;
  }, [removeToast]);

  const toastHelpers = useMemo(() => ({
    success: (message: string, title?: string, duration?: number) =>
      showToast({ type: 'success', message, title, duration }),
    error: (message: string, title?: string, duration?: number) =>
      showToast({ type: 'error', message, title: title || 'Error', duration: duration ?? 6000 }),
    warning: (message: string, title?: string, duration?: number) =>
      showToast({ type: 'warning', message, title: title || 'Warning', duration }),
    info: (message: string, title?: string, duration?: number) =>
      showToast({ type: 'info', message, title, duration })
  }), [showToast]);

  const contextValue = useMemo(() => ({
    showToast,
    removeToast,
    toast: toastHelpers
  }), [showToast, removeToast, toastHelpers]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  return context || defaultContextValue;
};

export default ToastProvider;
