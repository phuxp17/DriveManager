import React from 'react';
import {
  Archive,
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  Film,
  Folder,
  Image,
  Music,
  Presentation,
} from 'lucide-react';

interface DriveFileIconProps {
  mimeType?: string;
  isFolder?: boolean;
  size?: number;
}

export const DriveFileIcon: React.FC<DriveFileIconProps> = ({
  mimeType = '',
  isFolder = false,
  size = 20,
}) => {
  if (isFolder) {
    return <Folder size={size} color="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />;
  }

  // Google Docs
  if (mimeType.includes('google-apps.document')) {
    return <FileText size={size} color="#2563EB" />;
  }

  // Google Sheets
  if (mimeType.includes('google-apps.spreadsheet')) {
    return <FileSpreadsheet size={size} color="#16A34A" />;
  }

  // Google Slides
  if (mimeType.includes('google-apps.presentation')) {
    return <Presentation size={size} color="#EA580C" />;
  }

  // PDF
  if (mimeType === 'application/pdf') {
    return <FileText size={size} color="#DC2626" />;
  }

  // Office Word
  if (mimeType.includes('word') || mimeType.includes('officedocument.wordprocessingml')) {
    return <FileText size={size} color="#2563EB" />;
  }

  // Office Excel
  if (mimeType.includes('excel') || mimeType.includes('officedocument.spreadsheetml')) {
    return <FileSpreadsheet size={size} color="#16A34A" />;
  }

  // Office PowerPoint
  if (mimeType.includes('powerpoint') || mimeType.includes('officedocument.presentationml')) {
    return <Presentation size={size} color="#EA580C" />;
  }

  // Images
  if (mimeType.startsWith('image/')) {
    return <Image size={size} color="#9333EA" />;
  }

  // Videos
  if (mimeType.startsWith('video/')) {
    return <Film size={size} color="#E11D48" />;
  }

  // Audios
  if (mimeType.startsWith('audio/')) {
    return <Music size={size} color="#0D9488" />;
  }

  // Archives
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z') ||
    mimeType.includes('compressed')
  ) {
    return <Archive size={size} color="#78350F" />;
  }

  // Code / Text
  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('json') ||
    mimeType.includes('javascript') ||
    mimeType.includes('html') ||
    mimeType.includes('xml')
  ) {
    return <FileCode size={size} color="#0284C7" />;
  }

  // Default File
  return <File size={size} color="var(--color-text-muted)" />;
};
