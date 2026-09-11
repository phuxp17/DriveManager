import React from 'react';
import { DriveItem } from '../../api/driveApi';
import { DriveFileIcon } from './DriveFileIcon';
import { DriveItemMenu } from './DriveItemMenu';
import styles from './DriveExplorer.module.css';

interface DriveFileGridProps {
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

export const DriveFileGrid: React.FC<DriveFileGridProps> = ({
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

  return (
    <div className={styles.gridContainer}>
      {files.map((item) => (
        <div
          key={item.id}
          className={styles.gridCard}
          onClick={() => onOpenItem(item)}
          title={item.isFolder ? 'Bấm để mở thư mục' : 'Bấm để xem tệp'}
        >
          {/* Card Top Preview Area */}
          <div className={styles.cardPreviewArea}>
            {item.thumbnailLink ? (
              <img
                src={item.thumbnailLink}
                alt={item.name}
                className={styles.cardThumbnail}
                loading="lazy"
              />
            ) : (
              <DriveFileIcon mimeType={item.mimeType} isFolder={item.isFolder} size={42} />
            )}

            {/* Menu trigger top-right */}
            <div style={{ position: 'absolute', top: '6px', right: '6px' }}>
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

          {/* Card Body */}
          <div className={styles.cardBody}>
            <div className={styles.cardTitle} title={item.name}>
              {item.name}
            </div>

            <div className={styles.cardMeta}>
              <span>{item.isFolder ? 'Thư mục' : formatFileSize(item.size)}</span>
              <span>{formatDate(item.modifiedTime)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
