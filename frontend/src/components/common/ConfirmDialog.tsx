import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { Button } from './Button';
import styles from './ConfirmDialog.module.css';

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  requireMatchText?: string;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: (value: boolean) => void;
}

type ConfirmListener = (state: ConfirmState | null) => void;

class ConfirmManager {
  private listener: ConfirmListener | null = null;

  subscribe(listener: ConfirmListener) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (this.listener) {
        this.listener({
          ...options,
          open: true,
          resolve,
        });
      } else {
        // Fallback in case provider is not mounted (e.g. tests)
        resolve(window.confirm(typeof options.message === 'string' ? options.message : options.title));
      }
    });
  }
}

export const confirmService = new ConfirmManager();

export const confirm = (options: ConfirmOptions) => confirmService.confirm(options);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConfirmState | null>(null);
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    return confirmService.subscribe(setState);
  }, []);

  useEffect(() => {
    if (state?.open) {
      setTypedText('');
    }
  }, [state?.open]);

  const handleCancel = () => {
    if (state) {
      state.resolve(false);
      setState(null);
    }
  };

  const handleConfirm = () => {
    if (state) {
      state.resolve(true);
      setState(null);
    }
  };

  const isConfirmDisabled = Boolean(
    state?.requireMatchText && typedText.trim() !== state.requireMatchText.trim()
  );

  const getIcon = () => {
    const variant = state?.variant || 'danger';
    switch (variant) {
      case 'danger':
        return (
          <div className={`${styles.iconArea} ${styles.iconAreaDanger}`}>
            <AlertTriangle size={24} />
          </div>
        );
      case 'warning':
        return (
          <div className={`${styles.iconArea} ${styles.iconAreaWarning}`}>
            <AlertCircle size={24} />
          </div>
        );
      case 'primary':
        return (
          <div className={`${styles.iconArea} ${styles.iconAreaPrimary}`}>
            <HelpCircle size={24} />
          </div>
        );
    }
  };

  return (
    <>
      {children}
      {state && (
        <Dialog.Root
          open={state.open}
          onOpenChange={(open) => {
            if (!open) handleCancel();
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className={styles.overlay} />
            <Dialog.Content className={styles.content}>
              {getIcon()}
              <Dialog.Title className={styles.title}>{state.title}</Dialog.Title>
              <Dialog.Description asChild>
                <div className={styles.message}>{state.message}</div>
              </Dialog.Description>

              {state.requireMatchText && (
                <div className={styles.verifyBox}>
                  <div className={styles.verifyPrompt}>
                    Nhập <strong>{state.requireMatchText}</strong> để xác nhận thao tác:
                  </div>
                  <input
                    type="text"
                    className={styles.verifyInput}
                    value={typedText}
                    onChange={(e) => setTypedText(e.target.value)}
                    placeholder={state.requireMatchText}
                    autoFocus
                  />
                </div>
              )}

              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleCancel}
                >
                  {state.cancelText || 'Hủy bỏ'}
                </Button>
                <Button
                  type="button"
                  variant={state.variant === 'primary' ? 'primary' : 'danger'}
                  size="md"
                  disabled={isConfirmDisabled}
                  onClick={handleConfirm}
                >
                  {state.confirmText || (state.variant === 'primary' ? 'Xác nhận' : 'Xóa')}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
};

export const useConfirm = () => {
  return confirm;
};
