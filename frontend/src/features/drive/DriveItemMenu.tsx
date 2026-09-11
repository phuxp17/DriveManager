import React from 'react';
import {
  Copy,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FolderInput,
  Info,
  MoreVertical,
  Share2,
  Trash2,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuItem } from '../../components/common/DropdownMenu';
import { DriveItem } from '../../api/driveApi';
import styles from './DriveExplorer.module.css';

interface DriveItemMenuProps {
  item: DriveItem;
  onPreview: (item: DriveItem) => void;
  onViewDetails?: (item: DriveItem) => void;
  onDownload: (item: DriveItem) => void;
  onRename: (item: DriveItem) => void;
  onMove: (item: DriveItem) => void;
  onCopy: (item: DriveItem) => void;
  onShare: (item: DriveItem) => void;
  onDelete: (item: DriveItem) => void;
}

export const DriveItemMenu: React.FC<DriveItemMenuProps> = ({
  item,
  onPreview,
  onViewDetails,
  onDownload,
  onRename,
  onMove,
  onCopy,
  onShare,
  onDelete,
}) => {
  const caps = item.capabilities || {};

  const canRename = caps.canRename !== false;
  const canMove = caps.canEdit !== false;
  const canCopy = caps.canCopy !== false && !item.isFolder;
  const canShare = caps.canShare !== false;
  const canDelete = caps.canTrash !== false || caps.canDelete !== false;

  const menuItems: (DropdownMenuItem | 'separator')[] = [
    {
      label: 'Xem trước',
      icon: <Eye size={15} />,
      onClick: () => onPreview(item),
    },
    {
      label: 'Chi tiết tệp & Nơi lưu',
      icon: <Info size={15} />,
      onClick: () => (onViewDetails ? onViewDetails(item) : onPreview(item)),
    },
    ...(!item.isFolder
      ? [
          {
            label: 'Tải xuống',
            icon: <Download size={15} />,
            onClick: () => onDownload(item),
          },
        ]
      : []),
    ...(item.webViewLink
      ? [
          {
            label: 'Mở trên Google Drive',
            icon: <ExternalLink size={15} />,
            onClick: () => window.open(item.webViewLink, '_blank', 'noopener,noreferrer'),
          },
        ]
      : []),
    'separator',
    {
      label: 'Đổi tên',
      icon: <Edit2 size={15} />,
      disabled: !canRename,
      onClick: () => onRename(item),
    },
    {
      label: 'Di chuyển đến...',
      icon: <FolderInput size={15} />,
      disabled: !canMove,
      onClick: () => onMove(item),
    },
    ...(!item.isFolder
      ? [
          {
            label: 'Tạo bản sao',
            icon: <Copy size={15} />,
            disabled: !canCopy,
            onClick: () => onCopy(item),
          },
        ]
      : []),
    {
      label: 'Chia sẻ quyền...',
      icon: <Share2 size={15} />,
      disabled: !canShare,
      onClick: () => onShare(item),
    },
    'separator',
    {
      label: 'Xóa mục',
      icon: <Trash2 size={15} />,
      danger: true,
      disabled: !canDelete,
      onClick: () => onDelete(item),
    },
  ];

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu
        trigger={
          <button
            type="button"
            className={styles.menuBtn}
            title="Thao tác"
            aria-label={`Thao tác cho ${item.name}`}
          >
            <MoreVertical size={16} />
          </button>
        }
        items={menuItems}
      />
    </div>
  );
};
