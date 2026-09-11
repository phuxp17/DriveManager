import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Folder,
  Globe,
  HardDrive,
  Info,
  User,
} from 'lucide-react';
import { DriveItem, driveApi } from '../../api/driveApi';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DriveFileIcon } from './DriveFileIcon';

interface DrivePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName?: string;
  currentPath?: string;
  item: DriveItem | null;
  defaultTab?: 'preview' | 'details';
}

export const DrivePreviewModal: React.FC<DrivePreviewModalProps> = ({
  open,
  onOpenChange,
  accountId,
  accountName = 'Google Drive',
  currentPath = 'Drive của tôi',
  item,
  defaultTab = 'preview',
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'details'>('preview');
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  const isGoogleDoc = item?.mimeType.includes('google-apps.document');
  const isGoogleSheet = item?.mimeType.includes('google-apps.spreadsheet');
  const isGoogleSlide = item?.mimeType.includes('google-apps.presentation');
  const isGoogleApp = isGoogleDoc || isGoogleSheet || isGoogleSlide;

  const isImage = item?.mimeType.startsWith('image/');
  const isVideo = item?.mimeType.startsWith('video/');
  const isAudio = item?.mimeType.startsWith('audio/');
  const isPdf = item?.mimeType === 'application/pdf';
  const isText =
    item?.mimeType.startsWith('text/') ||
    item?.mimeType.includes('json') ||
    item?.mimeType.includes('javascript') ||
    item?.mimeType.includes('xml');

  const contentUrl = item ? driveApi.getContentUrl(accountId, item.id) : '';

  useEffect(() => {
    if (open && item && isText && activeTab === 'preview') {
      setLoadingText(true);
      fetch(contentUrl)
        .then((res) => res.text())
        .then((txt) => setTextContent(txt.slice(0, 50000))) // Limit to 50KB for display
        .catch(() => setTextContent('Không thể tải nội dung văn bản xem trước.'))
        .finally(() => setLoadingText(false));
    } else {
      setTextContent(null);
    }
  }, [open, item, isText, contentUrl, activeTab]);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleDownload = (exportFormat?: string) => {
    if (!item) return;
    const url = driveApi.getContentUrl(accountId, item.id, exportFormat);
    window.open(url, '_blank');
  };

  const handleCopyId = () => {
    if (item?.id) {
      navigator.clipboard.writeText(item.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (item?.webViewLink) {
      navigator.clipboard.writeText(item.webViewLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const ownersDisplay =
    item?.owners && item.owners.length > 0
      ? item.owners.join(', ')
      : 'Tài khoản kết nối (Chính bạn)';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={item?.name || 'Chi tiết tệp tin'}
      description={`Lưu trữ tại: ${accountName} • ${currentPath}`}
      maxWidth="740px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'preview' ? 'var(--color-primary-subtle)' : 'transparent',
              color: activeTab === 'preview' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: activeTab === 'preview' ? 600 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Eye size={15} />
            Xem nội dung
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('details')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'details' ? 'var(--color-primary-subtle)' : 'transparent',
              color: activeTab === 'details' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: activeTab === 'details' ? 600 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Info size={15} />
            Chi tiết & Nơi lưu trữ
          </button>
        </div>

        {/* Tab 1: Preview View */}
        {activeTab === 'preview' && (
          <div
            style={{
              minHeight: '260px',
              maxHeight: '460px',
              overflow: 'auto',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isGoogleApp ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', maxWidth: '440px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <DriveFileIcon mimeType={item?.mimeType} size={48} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>
                  {isGoogleDoc
                    ? 'Tài liệu Google Docs'
                    : isGoogleSheet
                    ? 'Bảng tính Google Sheets'
                    : 'Bản trình bày Google Slides'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                  Tài liệu này được chỉnh sửa trực tiếp trên Google Workspace. Bạn có thể mở ngay trên trình duyệt hoặc tải về dưới định dạng phổ biến.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {item?.webViewLink && (
                    <Button
                      variant="primary"
                      size="md"
                      icon={<ExternalLink size={16} />}
                      onClick={() => window.open(item.webViewLink, '_blank', 'noopener,noreferrer')}
                    >
                      Mở trong Google Workspace
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    size="md"
                    icon={<Download size={16} />}
                    onClick={() => handleDownload('pdf')}
                  >
                    Tải bản PDF
                  </Button>
                </div>
              </div>
            ) : isImage ? (
              <img
                src={contentUrl}
                alt={item?.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '440px',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            ) : isVideo ? (
              <video
                controls
                src={contentUrl}
                style={{ maxWidth: '100%', maxHeight: '440px', borderRadius: 'var(--radius-sm)' }}
              >
                Trình duyệt của bạn không hỗ trợ phát video này.
              </video>
            ) : isAudio ? (
              <div style={{ padding: '40px 20px', width: '100%', maxWidth: '400px' }}>
                <audio controls src={contentUrl} style={{ width: '100%' }}>
                  Trình duyệt của bạn không hỗ trợ phát âm thanh này.
                </audio>
              </div>
            ) : isPdf ? (
              <iframe
                src={contentUrl}
                title={item?.name}
                style={{ width: '100%', height: '440px', border: 'none' }}
              />
            ) : isText ? (
              <div style={{ width: '100%', height: '100%', padding: '16px', overflow: 'auto' }}>
                {loadingText ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Đang tải nội dung văn bản...</div>
                ) : (
                  <pre
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: 'var(--color-text)',
                    }}
                  >
                    {textContent}
                  </pre>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <DriveFileIcon mimeType={item?.mimeType} isFolder={item?.isFolder} size={48} />
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Định dạng này không hỗ trợ xem trước trực tiếp trên trang. Bạn có thể tải tệp về máy tính để mở.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  icon={<Download size={16} />}
                  onClick={() => handleDownload()}
                >
                  Tải tệp tin về
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Detailed Metadata & Location */}
        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '460px', overflowY: 'auto' }}>
            {/* Storage & Ownership Card */}
            <div
              style={{
                backgroundColor: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nơi lưu trữ & Tài khoản sở hữu
              </div>

              {/* Owner */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ padding: '6px', borderRadius: '50%', backgroundColor: 'rgba(66, 133, 244, 0.1)', color: '#4285F4' }}>
                  <User size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Tài khoản sở hữu (Owner)</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>
                    {ownersDisplay}
                  </div>
                </div>
              </div>

              {/* Storage Account */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ padding: '6px', borderRadius: '50%', backgroundColor: 'rgba(52, 168, 83, 0.1)', color: '#16A34A' }}>
                  <HardDrive size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Tài khoản lưu trữ</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>
                    {accountName}
                  </div>
                </div>
              </div>

              {/* Folder Location */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ padding: '6px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                  <Folder size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Vị trí thư mục</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginTop: '2px' }}>
                    {currentPath}
                  </div>
                </div>
              </div>
            </div>

            {/* Properties Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                padding: '16px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> Ngày tạo
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginTop: '4px' }}>
                  {item?.createdTime ? new Date(item.createdTime).toLocaleString('vi-VN') : '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> Sửa đổi lần cuối
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginTop: '4px' }}>
                  {item?.modifiedTime ? new Date(item.modifiedTime).toLocaleString('vi-VN') : '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Kích thước tệp</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginTop: '4px' }}>
                  {item?.isFolder ? 'Thư mục' : formatFileSize(item?.size || 0)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Globe size={13} /> Trạng thái chia sẻ
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginTop: '4px' }}>
                  {item?.shared ? 'Được chia sẻ (Shared)' : 'Riêng tư (Chỉ mình bạn)'}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Định dạng MIME Type</div>
                <div style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--color-text)', marginTop: '4px' }}>
                  {item?.mimeType || '—'}
                </div>
              </div>
            </div>

            {/* Google Drive File ID & Links */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '14px',
                backgroundColor: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Google Drive File ID:</div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={copiedId ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                  onClick={handleCopyId}
                >
                  {copiedId ? 'Đã sao chép' : 'Sao chép ID'}
                </Button>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-surface)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item?.id}
              </div>

              {item?.webViewLink && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={copiedLink ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                    onClick={handleCopyLink}
                  >
                    {copiedLink ? 'Đã sao chép link' : 'Sao chép link Drive'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<ExternalLink size={14} />}
                    onClick={() => window.open(item.webViewLink, '_blank', 'noopener,noreferrer')}
                  >
                    Mở trên Google Drive
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {accountName}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!isGoogleApp && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={15} />}
                onClick={() => handleDownload()}
              >
                Tải xuống
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
