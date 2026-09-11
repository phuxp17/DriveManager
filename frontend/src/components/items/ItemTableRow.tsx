import React from 'react';
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FolderPlus,
  MoreVertical,
  Share2,
  Star,
  Trash2,
  Undo2,
} from 'lucide-react';
import { itemsApi } from '../../api/itemsApi';
import { ItemEntry } from '../../api/types';
import { formatDate } from '../../utils/dateUtils';
import { DropdownMenu, DropdownMenuItem } from '../common/DropdownMenu';
import { ItemTypeIcon } from './ItemTypeIcon';
import styles from './ItemTableRow.module.css';

export interface ItemActionHandlers {
  onOpen: (item: ItemEntry) => void;
  onViewDetails: (item: ItemEntry) => void;
  onToggleFavorite: (item: ItemEntry) => void;
  onDownload?: (item: ItemEntry) => void;
  onToggleReview?: (item: ItemEntry) => void;
  onToggleArchive?: (item: ItemEntry) => void;
  onTrash?: (item: ItemEntry) => void;
  onRestore?: (item: ItemEntry) => void;
  onPurge?: (item: ItemEntry) => void;
  onManageMemberships?: (item: ItemEntry) => void;
  onShare?: (item: ItemEntry) => void;
}

export interface ItemTableRowProps {
  item: ItemEntry;
  currentUserId?: string;
  actions: ItemActionHandlers;
}

export const ItemTableRow: React.FC<ItemTableRowProps> = ({ item, actions, currentUserId }) => {
  const isOwner = !currentUserId || currentUserId === item.ownerId;
  const isFavorited = !!item.favoritedAt;
  const isArchived = !!item.archivedAt;
  const isTrashed = !!item.deletedAt;
  const isReviewed = !!item.reviewedAt;

  const menuItems: (DropdownMenuItem | 'separator')[] = [
    {
      label: item.type === 'LINK' ? 'Mở liên kết' : 'Mở trên Google Drive',
      icon: <ExternalLink size={16} />,
      onClick: () => actions.onOpen(item),
    },
    ...(item.type !== 'LINK'
      ? [
          {
            label: 'Tải xuống máy',
            icon: <Download size={16} />,
            onClick: () =>
              actions.onDownload
                ? actions.onDownload(item)
                : window.open(itemsApi.getContentUrl(item.id), '_blank'),
          } as DropdownMenuItem,
        ]
      : []),
    {
      label: 'Xem chi tiết',
      icon: <Eye size={16} />,
      onClick: () => actions.onViewDetails(item),
    },
    {
      label: isFavorited ? 'Bỏ yêu thích' : 'Yêu thích',
      icon: <Star size={16} />,
      onClick: () => actions.onToggleFavorite(item),
    },
  ];

  if (isOwner && !isTrashed) {
    menuItems.push('separator');

    if (actions.onToggleReview) {
      menuItems.push({
        label: isReviewed ? 'Đưa vào Inbox' : 'Đã duyệt',
        icon: <CheckCircle2 size={16} />,
        onClick: () => actions.onToggleReview!(item),
      });
    }

    if (actions.onManageMemberships) {
      menuItems.push({
        label: 'Bộ sưu tập & Thẻ',
        icon: <FolderPlus size={16} />,
        onClick: () => actions.onManageMemberships!(item),
      });
    }

    if (actions.onShare) {
      menuItems.push({
        label: 'Chia sẻ (VIEW)',
        icon: <Share2 size={16} />,
        onClick: () => actions.onShare!(item),
      });
    }

    if (actions.onToggleArchive) {
      menuItems.push({
        label: isArchived ? 'Bỏ lưu trữ' : 'Lưu trữ',
        icon: isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />,
        onClick: () => actions.onToggleArchive!(item),
      });
    }

    if (actions.onTrash) {
      menuItems.push({
        label: 'Chuyển vào Thùng rác',
        icon: <Trash2 size={16} />,
        danger: true,
        onClick: () => actions.onTrash!(item),
      });
    }

    if (actions.onPurge && item.type !== 'LINK') {
      menuItems.push({
        label: 'Xóa vĩnh viễn khỏi Drive',
        icon: <Trash2 size={16} />,
        danger: true,
        onClick: () => actions.onPurge!(item),
      });
    }
  }

  if (isOwner && isTrashed) {
    menuItems.push('separator');
    if (actions.onRestore) {
      menuItems.push({
        label: 'Khôi phục',
        icon: <Undo2 size={16} />,
        onClick: () => actions.onRestore!(item),
      });
    }
    if (actions.onPurge) {
      menuItems.push({
        label: 'Xóa vĩnh viễn',
        icon: <Trash2 size={16} />,
        danger: true,
        onClick: () => actions.onPurge!(item),
      });
    }
  }

  return (
    <div className={styles.row}>
      <div>
        <button
          className={`${styles.starBtn} ${isFavorited ? styles.isFavorited : ''}`}
          onClick={() => actions.onToggleFavorite(item)}
          aria-label={isFavorited ? 'Bỏ đánh dấu yêu thích' : 'Đánh dấu yêu thích'}
        >
          <Star size={18} fill={isFavorited ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className={styles.colName}>
        <ItemTypeIcon type={item.type} size={20} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <button
            type="button"
            className={styles.nameText}
            title={item.name}
            onClick={() => actions.onViewDetails(item)}
          >
            {item.name}
          </button>
          <div className={styles.subText} title={item.url || item.description || ''}>
            {item.domain || item.description || item.type}
          </div>
        </div>
      </div>

      <div>
        <span className={styles.badge}>{item.type}</span>
      </div>

      <div className={styles.hideTablet}>
        {item.reviewedAt ? (
          <span className={styles.badge} style={{ color: 'var(--color-success)', backgroundColor: 'var(--color-success-subtle)' }}>
            Đã duyệt
          </span>
        ) : (
          <span className={styles.badge} style={{ color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-subtle)' }}>
            Inbox
          </span>
        )}
      </div>

      <div className={`${styles.hideMobile} ${styles.subText}`}>
        {formatDate(item.createdAt)}
      </div>

      <div className={styles.actionsCol}>
        <button
          onClick={() => actions.onOpen(item)}
          aria-label="Mở"
          style={{
            padding: '6px',
            color: 'var(--color-text-muted)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
          title={item.type === 'LINK' ? 'Mở liên kết' : 'Mở nội dung'}
        >
          <ExternalLink size={16} />
        </button>

        <DropdownMenu
          trigger={
            <button
              aria-label="Tùy chọn khác"
              style={{
                padding: '6px',
                color: 'var(--color-text-muted)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              <MoreVertical size={16} />
            </button>
          }
          items={menuItems}
        />
      </div>
    </div>
  );
};
