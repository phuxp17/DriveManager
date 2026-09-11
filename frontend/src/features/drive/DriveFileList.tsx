import React from 'react';
import { DriveItem } from '../../api/driveApi';
import { DriveFileIcon } from './DriveFileIcon';
import { DriveItemMenu } from './DriveItemMenu';
import styles from './DriveExplorer.module.css';

interface DriveFileListProps {
  files: DriveItem[];
  onOpenItem: (item: DriveItem) => void;
  onPreview: (item: DriveItem) => void;
  onViewDetails?: (item: DriveItem) => void;
  onDownload: (item: DriveItem) => void;
  onRename: (item: DriveItem) => void;
  onMove: (item: DriveItem) => void;
  onCopy: (item: DriveItem) => void;
  onShare: (item: DriveItem) => void;
  onDelete: (item: DriveItem) => void;
}

export const DriveFileList: React.FC<DriveFileListProps> = ({
  files,
  onOpenItem,
  onPreview,
  onViewDetails,
  onDownload,
  onRename,
  onMove,
  onCopy,
  onShare,
  onDelete,
}) => {
  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatFileType = (mimeType: string, isFolder: boolean) => {
    if (isFolder) return 'Thư mục';
    if (mimeType.includes('google-apps.document')) return 'Google Docs';
    if (mimeType.includes('google-apps.spreadsheet')) return 'Google Sheets';
    if (mimeType.includes('google-apps.presentation')) return 'Google Slides';
    if (mimeType === 'application/pdf') return 'Tài liệu PDF';
    if (mimeType.startsWith('image/')) return 'Hình ảnh';
    if (mimeType.startsWith('video/')) return 'Video';
    if (mimeType.startsWith('audio/')) return 'Âm thanh';
    return 'Tệp tin';
  };

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableHeader}>
        <div></div>
        <div>Tên tệp tin / Thư mục</div>
        <div>Định dạng</div>
        <div>Sửa đổi</div>
        <div>Kích thước</div>
        <div style={{ textAlign: 'right' }}></div>
      </div>

      <div>
        {files.map((item) => (
          <div
            key={item.id}
            className={styles.tableRow}
            onClick={() => onOpenItem(item)}
            title={item.isFolder ? 'Nhấp đúp hoặc bấm để mở thư mục' : 'Bấm để xem tệp'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DriveFileIcon mimeType={item.mimeType} isFolder={item.isFolder} size={20} />
            </div>

            <div className={styles.nameCell}>
              <span className={styles.nameText} title={item.name}>
                {item.name}
              </span>
              {item.shared && <span className={styles.badge}>Được chia sẻ</span>}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {formatFileType(item.mimeType, item.isFolder)}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {formatDate(item.modifiedTime)}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {item.isFolder ? '—' : formatFileSize(item.size)}
            </div>

            <div style={{ textAlign: 'right' }}>
              <DriveItemMenu
                item={item}
                onPreview={onPreview}
                onViewDetails={onViewDetails}
                onDownload={onDownload}
                onRename={onRename}
                onMove={onMove}
                onCopy={onCopy}
                onShare={onShare}
                onDelete={onDelete}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
