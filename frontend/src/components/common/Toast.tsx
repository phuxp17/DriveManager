import React, { createContext, useContext, useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  show(type: ToastType, message: string, duration = 4000) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItem = { id, type, message, duration };
    this.toasts = [...this.toasts, newToast];
    this.notify();
    return id;
  }

  remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  success(message: string, duration?: number) {
    return this.show('success', message, duration);
  }

  error(message: string, duration?: number) {
    return this.show('error', message, duration);
  }

  warning(message: string, duration?: number) {
    return this.show('warning', message, duration);
  }

  info(message: string, duration?: number) {
    return this.show('info', message, duration);
  }

  clear() {
    this.toasts = [];
    this.notify();
  }
}

export const toast = new ToastManager();

interface ToastItemProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

const ToastElement: React.FC<ToastItemProps> = ({ toast: item, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!item.duration || item.duration <= 0) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(item.id), 180);
    }, item.duration);

    return () => clearTimeout(timer);
  }, [item.id, item.duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(item.id), 180);
  };

  const getIcon = () => {
    switch (item.type) {
      case 'success':
        return <CheckCircle2 size={18} />;
      case 'error':
        return <AlertCircle size={18} />;
      case 'warning':
        return <AlertTriangle size={18} />;
      case 'info':
        return <Info size={18} />;
    }
  };

  const typeClass =
    item.type === 'success'
      ? styles.toastSuccess
      : item.type === 'error'
      ? styles.toastError
      : item.type === 'warning'
      ? styles.toastWarning
      : styles.toastInfo;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${styles.toastItem} ${typeClass} ${isExiting ? styles.exiting : ''}`}
    >
      <div className={styles.iconWrapper}>{getIcon()}</div>
      <div className={styles.contentWrapper}>
        <div className={styles.message}>{item.message}</div>
      </div>
      <button
        type="button"
        className={styles.closeButton}
        onClick={handleClose}
        aria-label="Đóng thông báo"
      >
        <X size={15} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer} aria-label="Thông báo hệ thống">
      {toasts.map((t) => (
        <ToastElement key={t.id} toast={t} onClose={(id) => toast.remove(id)} />
      ))}
    </div>
  );
};

interface ToastContextType {
  toast: ToastManager;
}

const ToastContext = createContext<ToastContextType>({ toast });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  return useContext(ToastContext);
};
