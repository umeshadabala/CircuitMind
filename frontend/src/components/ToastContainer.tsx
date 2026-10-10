import React from 'react';
import type { ToastItem, ToastType } from '../types';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const getToastConfig = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        icon: <CheckCircle2 size={18} color="var(--status-success, #22c55e)" />,
        border: 'rgba(34, 197, 94, 0.4)',
        background: 'linear-gradient(135deg, rgba(20, 24, 20, 0.95), rgba(14, 18, 14, 0.95))',
        titleColor: '#4ade80'
      };
    case 'error':
      return {
        icon: <AlertCircle size={18} color="var(--status-error, #ef4444)" />,
        border: 'rgba(239, 68, 68, 0.45)',
        background: 'linear-gradient(135deg, rgba(28, 16, 16, 0.95), rgba(20, 12, 12, 0.95))',
        titleColor: '#f87171'
      };
    case 'warning':
      return {
        icon: <AlertTriangle size={18} color="var(--accent-orange, #f59e0b)" />,
        border: 'rgba(245, 158, 11, 0.4)',
        background: 'linear-gradient(135deg, rgba(28, 22, 14, 0.95), rgba(20, 16, 10, 0.95))',
        titleColor: '#fbbf24'
      };
    case 'info':
    default:
      return {
        icon: <Info size={18} color="#38bdf8" />,
        border: 'rgba(56, 189, 248, 0.35)',
        background: 'linear-gradient(135deg, rgba(14, 22, 32, 0.95), rgba(10, 16, 24, 0.95))',
        titleColor: '#7dd3fc'
      };
  }
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        width: 'calc(100vw - 40px)',
        pointerEvents: 'none'
      }}
    >
      {toasts.map((t) => {
        const config = getToastConfig(t.type);

        return (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              background: config.background,
              border: `1px solid ${config.border}`,
              borderRadius: '8px',
              padding: '12px 14px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              animation: 'toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ flexShrink: 0, marginTop: '2px' }}>{config.icon}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {t.title && (
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: config.titleColor,
                    marginBottom: '2px'
                  }}
                >
                  {t.title}
                </div>
              )}
              <div
                style={{
                  fontSize: '12px',
                  color: '#e2e8f0',
                  lineHeight: 1.45,
                  wordBreak: 'break-word'
                }}
              >
                {t.message}
              </div>
            </div>

            <button
              onClick={() => onDismiss(t.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                flexShrink: 0
              }}
              aria-label="Dismiss toast"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
