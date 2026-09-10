import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export interface AlertProps {
  type?: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  message: React.ReactNode;
  onClose?: () => void;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  action,
  className = '',
  style,
}) => {
  const stylesMap = {
    error: {
      bg: 'var(--color-danger-subtle)',
      border: 'var(--color-danger)',
      text: 'var(--color-danger)',
      icon: <AlertCircle size={20} color="var(--color-danger)" />,
    },
    warning: {
      bg: 'var(--color-warning-subtle)',
      border: 'var(--color-warning)',
      text: 'var(--color-warning)',
      icon: <AlertTriangle size={20} color="var(--color-warning)" />,
    },
    success: {
      bg: 'var(--color-success-subtle)',
      border: 'var(--color-success)',
      text: 'var(--color-success)',
      icon: <CheckCircle2 size={20} color="var(--color-success)" />,
    },
    info: {
      bg: 'var(--color-primary-subtle)',
      border: 'var(--color-primary)',
      text: 'var(--color-primary)',
      icon: <Info size={20} color="var(--color-primary)" />,
    },
  };

  const current = stylesMap[type];

  return (
    <div
      role="alert"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-4, 16px)',
        ...style,
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>{current.icon}</div>
      <div style={{ flex: 1, fontSize: '14px', color: 'var(--color-text)' }}>
        {title && <div style={{ fontWeight: 600, marginBottom: '4px' }}>{title}</div>}
        <div>{message}</div>
        {action && <div style={{ marginTop: '8px' }}>{action}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Đóng thông báo"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '2px',
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
