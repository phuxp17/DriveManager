import React from 'react';
import {
  Archive,
  File,
  FileCode,
  FileText,
  Film,
  Globe,
  Image,
  Music,
} from 'lucide-react';
import { ItemType } from '../../api/types';

interface ItemTypeIconProps {
  type: ItemType;
  size?: number;
  className?: string;
}

export const ItemTypeIcon: React.FC<ItemTypeIconProps> = ({ type, size = 20, className = '' }) => {
  switch (type) {
    case 'LINK':
      return <Globe size={size} color="#2563EB" className={className} aria-label="Liên kết" />;
    case 'IMAGE':
      return <Image size={size} color="#059669" className={className} aria-label="Hình ảnh" />;
    case 'VIDEO':
      return <Film size={size} color="#DC2626" className={className} aria-label="Video" />;
    case 'AUDIO':
      return <Music size={size} color="#D97706" className={className} aria-label="Âm thanh" />;
    case 'DOCUMENT':
      return <FileText size={size} color="#0284C7" className={className} aria-label="Tài liệu" />;
    case 'ARCHIVE':
      return <Archive size={size} color="#7C3AED" className={className} aria-label="Tệp nén" />;
    case 'NOTE':
      return <FileCode size={size} color="#475569" className={className} aria-label="Ghi chú" />;
    case 'FILE':
    default:
      return <File size={size} color="#64748B" className={className} aria-label="Tệp tin" />;
  }
};
