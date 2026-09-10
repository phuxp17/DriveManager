import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash,
  UploadCloud,
  X,
} from 'lucide-react';
import { useUploadQueue } from '../../context/UploadQueueContext';
import styles from './UploadQueuePanel.module.css';

export const UploadQueuePanel: React.FC = () => {
  const { items, cancelUpload, clearCompleted, isOpen, setIsOpen } = useUploadQueue();
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen || items.length === 0) return null;

  const activeCount = items.filter((i) => i.status === 'sending' || i.status === 'queued').length;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>
          <UploadCloud size={18} color="var(--color-primary)" />
          <span>Tải tệp lên ({items.length})</span>
          {activeCount > 0 && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                backgroundColor: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {activeCount} đang xử lý
            </span>
          )}
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.iconBtn}
            onClick={clearCompleted}
            title="Dọn dẹp mục đã xong"
            aria-label="Dọn dẹp mục đã xong"
          >
            <Trash size={14} />
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
            aria-label={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
          >
            {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => setIsOpen(false)}
            title="Đóng bảng tiến độ"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className={styles.body}>
          {items.map((item) => {
            const isFinished = item.status === 'success' || item.status === 'failed' || item.status === 'cancelled';

            return (
              <div key={item.id} className={styles.itemRow}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemName} title={item.name}>
                    {item.name}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.status === 'sending' && (
                      <span className={styles.statusText}>{item.progress}%</span>
                    )}
                    {item.status === 'processing' && (
                      <span className={styles.statusText} style={{ color: 'var(--color-primary)' }}>
                        <Loader2 size={12} className="spin" /> Xử lý...
                      </span>
                    )}
                    {item.status === 'success' && (
                      <CheckCircle size={16} color="var(--color-success)" />
                    )}
                    {item.status === 'failed' && (
                      <AlertCircle size={16} color="var(--color-danger)" />
                    )}
                    {!isFinished && (
                      <button
                        onClick={() => cancelUpload(item.id)}
                        title="Hủy tải lên"
                        aria-label="Hủy tải lên"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-text-muted)',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progressFill} ${
                      item.status === 'success'
                        ? styles.progressSuccess
                        : item.status === 'failed'
                        ? styles.progressFailed
                        : ''
                    }`}
                    style={{
                      width:
                        item.status === 'queued'
                          ? '5%'
                          : item.status === 'processing'
                          ? '100%'
                          : `${item.progress}%`,
                    }}
                  />
                </div>

                {item.error && (
                  <span style={{ fontSize: '12px', color: 'var(--color-danger)' }}>
                    {item.error}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
